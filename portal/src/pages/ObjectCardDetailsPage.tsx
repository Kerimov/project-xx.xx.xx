import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Card,
  Descriptions,
  Button,
  Space,
  Typography,
  Tabs,
  Tag,
  message,
  Spin,
  Form,
  Input,
  InputNumber,
  DatePicker,
  Select,
  Switch,
  Upload,
  Timeline,
  Divider,
  Alert,
  List,
  Popconfirm
} from 'antd';
import {
  ArrowLeftOutlined,
  EditOutlined,
  FileOutlined,
  HistoryOutlined,
  SaveOutlined,
  UploadOutlined,
  DeleteOutlined
} from '@ant-design/icons';
import { api } from '../services/api';
import { ObjectCardSelect } from '../components/forms/ObjectCardSelect';
import dayjs from 'dayjs';
import 'dayjs/locale/ru';
import type { TabsProps } from 'antd';

const { Title } = Typography;
const { TextArea } = Input;
const { Option } = Select;

/** Подписи на русском для значений перечислений по полям (fieldKey -> value -> label) */
const ENUM_LABELS_RU: Record<string, Record<string, string>> = {
  itemKind: {
    product: 'Продукт',
    service: 'Услуга',
    material: 'Материал',
    semi_finished: 'Полуфабрикат',
    other: 'Прочее'
  }
};

function getEnumLabel(fieldKey: string, value: string): string {
  return ENUM_LABELS_RU[fieldKey]?.[value] ?? value;
}

interface ObjectCard {
  id: string;
  typeId: string;
  typeCode: string;
  typeName: string;
  code: string;
  name: string;
  organizationId?: string | null;
  status: string;
  attrs: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

interface SchemaField {
  id: string;
  fieldKey: string;
  label: string;
  dataType: string;
  fieldGroup: string;
  isRequired: boolean;
  isUnique: boolean;
  validationRules?: Record<string, unknown>;
  defaultValue?: unknown;
  referenceTypeId?: string | null;
  enumValues?: string[];
  displayOrder: number;
}

interface HistoryItem {
  id: string;
  changeType: string;
  fieldKey?: string;
  oldValue?: unknown;
  newValue?: unknown;
  comment?: string;
  createdAt: string;
  changedBy?: string;
}

export function ObjectCardDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [card, setCard] = useState<ObjectCard | null>(null);
  const [schemas, setSchemas] = useState<SchemaField[]>([]);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [form] = Form.useForm();
  const [editing, setEditing] = useState(false);
  const [activeTab, setActiveTab] = useState('main');
  const [referenceTypeMap, setReferenceTypeMap] = useState<ReferenceTypeMap>({});
  const [files, setFiles] = useState<Array<{ id: string; name: string; size: number; mimeType: string; uploadedAt: string; hash: string }>>([]);
  const [uploading, setUploading] = useState(false);
  const [deletingFileId, setDeletingFileId] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    loadCard();
  }, [id]);

  const loadCard = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const [cardRes, filesRes] = await Promise.all([
        api.objects.cards.getById(id),
        api.objectFiles.list(id).catch(() => ({ data: [] }))
      ]);

      const cardData = cardRes.data as any;
      setCard({
        id: cardData.id,
        typeId: cardData.typeId,
        typeCode: cardData.typeCode,
        typeName: cardData.typeName,
        code: cardData.code,
        name: cardData.name,
        organizationId: cardData.organizationId,
        status: cardData.status,
        attrs: cardData.attrs || {},
        createdAt: cardData.createdAt,
        updatedAt: cardData.updatedAt
      });
      setHistory(Array.isArray(cardData.history) ? cardData.history : []);
      setFiles(filesRes.data || []);

      // Загружаем схему полей типа объекта (учитываем организацию пользователя)
      if (cardData.typeId) {
        try {
          const schemasRes = await api.objects.types.getSchemas(cardData.typeId, user?.organizationId || undefined);
          const schemasData = schemasRes.data || [];
          setSchemas(schemasData);
          
          // Загружаем типы объектов для reference полей
          const typesRes = await api.objects.types.list({ activeOnly: true });
          const typesMap = new Map((typesRes.data || []).map((t: any) => [t.id, t.code]));
          
          // Создаем маппинг fieldKey -> typeCode для reference полей
          const refMap: ReferenceTypeMap = {};
          schemasData.forEach((field) => {
            if (field.dataType === 'reference' && field.referenceTypeId) {
              const typeCode = typesMap.get(field.referenceTypeId);
              if (typeCode) {
                refMap[field.fieldKey] = typeCode;
              }
            }
          });
          setReferenceTypeMap(refMap);

          // Группируем поля по группам
          const groupedSchemas = schemasData.reduce((acc: Record<string, SchemaField[]>, field) => {
            const group = field.fieldGroup || 'Прочее';
            if (!acc[group]) acc[group] = [];
            acc[group].push(field);
            return acc;
          }, {});

          // Заполняем форму значениями из attrs
          const formValues: Record<string, unknown> = {
            code: cardData.code,
            name: cardData.name,
            status: cardData.status,
            organizationId: cardData.organizationId
          };

          // Добавляем значения из attrs
          Object.entries(cardData.attrs || {}).forEach(([key, value]) => {
            // Преобразуем даты из строк в dayjs объекты
            const field = schemasData.find((f) => f.fieldKey === key);
            if (field?.dataType === 'date' && value && typeof value === 'string') {
              formValues[key] = dayjs(value);
            } else {
              formValues[key] = value;
            }
          });

          form.setFieldsValue(formValues);
        } catch (e) {
          console.error('Ошибка загрузки схемы полей:', e);
        }
      }
    } catch (error: any) {
      message.error('Ошибка загрузки карточки: ' + (error.message || 'Неизвестная ошибка'));
      navigate('/analytics');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!card) return;
    try {
      setSaving(true);
      const values = await form.validateFields();

      const attrs: Record<string, unknown> = {};
      // Собираем все поля кроме основных (code, name, status, organizationId)
      Object.entries(values).forEach(([key, value]) => {
        if (!['code', 'name', 'status', 'organizationId'].includes(key)) {
          // Преобразуем dayjs объекты в строки для дат
          const field = schemas.find((f) => f.fieldKey === key);
          if (field?.dataType === 'date' && dayjs.isDayjs(value)) {
            attrs[key] = (value as any).format('YYYY-MM-DD');
          } else {
            attrs[key] = value;
          }
        }
      });

      await api.objects.cards.update(card.id, {
        code: values.code,
        name: values.name,
        status: values.status,
        organizationId: values.organizationId || null,
        attrs
      });

      message.success('Карточка объекта учета обновлена');
      setEditing(false);
      await loadCard();
    } catch (error: any) {
      message.error('Ошибка сохранения: ' + (error.message || 'Неизвестная ошибка'));
    } finally {
      setSaving(false);
    }
  };

  const handleFileUpload = async (file: File) => {
    if (!card) return;
    try {
      setUploading(true);
      await api.objectFiles.upload(card.id, file);
      message.success('Файл успешно загружен');
      await loadCard();
    } catch (error: any) {
      message.error('Ошибка при загрузке файла: ' + (error.message || 'Неизвестная ошибка'));
    } finally {
      setUploading(false);
    }
  };

  const handleFileDelete = async (fileId: string) => {
    try {
      setDeletingFileId(fileId);
      await api.objectFiles.delete(fileId);
      message.success('Файл удалён');
      setFiles((prev) => prev.filter((f) => f.id !== fileId));
    } catch (error: any) {
      message.error('Ошибка при удалении файла: ' + (error.message || 'Неизвестная ошибка'));
    } finally {
      setDeletingFileId(null);
    }
  };

  const renderField = (field: SchemaField) => {
    // Значение для отображения берём из card.attrs, чтобы не вызывать form.getFieldValue до монтирования Form
    const value = (card?.attrs ?? {})[field.fieldKey];
    const isEditing = editing;

    switch (field.dataType) {
      case 'string':
        return (
          <Form.Item
            key={field.fieldKey}
            label={field.label}
            name={field.fieldKey}
            rules={field.isRequired ? [{ required: true, message: `Поле "${field.label}" обязательно` }] : undefined}
          >
            {isEditing ? <Input placeholder={field.label} /> : <span>{value || '-'}</span>}
          </Form.Item>
        );

      case 'number':
        return (
          <Form.Item
            key={field.fieldKey}
            label={field.label}
            name={field.fieldKey}
            rules={field.isRequired ? [{ required: true, message: `Поле "${field.label}" обязательно` }] : undefined}
          >
            {isEditing ? <InputNumber style={{ width: '100%' }} placeholder={field.label} /> : <span>{value ?? '-'}</span>}
          </Form.Item>
        );

      case 'money':
        return (
          <Form.Item
            key={field.fieldKey}
            label={field.label}
            name={field.fieldKey}
            rules={field.isRequired ? [{ required: true, message: `Поле "${field.label}" обязательно` }] : undefined}
          >
            {isEditing ? (
              <InputNumber style={{ width: '100%' }} precision={2} placeholder={field.label} />
            ) : (
              <span>{value ? `${value} ₽` : '-'}</span>
            )}
          </Form.Item>
        );

      case 'date':
        return (
          <Form.Item
            key={field.fieldKey}
            label={field.label}
            name={field.fieldKey}
            rules={field.isRequired ? [{ required: true, message: `Поле "${field.label}" обязательно` }] : undefined}
          >
            {isEditing ? (
              <DatePicker style={{ width: '100%' }} format="DD.MM.YYYY" />
            ) : (
              <span>{value ? dayjs(value as string).format('DD.MM.YYYY') : '-'}</span>
            )}
          </Form.Item>
        );

      case 'boolean':
        return (
          <Form.Item
            key={field.fieldKey}
            label={field.label}
            name={field.fieldKey}
            valuePropName="checked"
          >
            {isEditing ? <Switch /> : <span>{value ? 'Да' : 'Нет'}</span>}
          </Form.Item>
        );

      case 'enum':
        return (
          <Form.Item
            key={field.fieldKey}
            label={field.label}
            name={field.fieldKey}
            rules={field.isRequired ? [{ required: true, message: `Поле "${field.label}" обязательно` }] : undefined}
          >
            {isEditing ? (
              <Select placeholder={field.label}>
                {field.enumValues?.map((val) => (
                  <Option key={val} value={val}>
                    {getEnumLabel(field.fieldKey, val)}
                  </Option>
                ))}
              </Select>
            ) : (
              <span>{value ? getEnumLabel(field.fieldKey, value as string) : '-'}</span>
            )}
          </Form.Item>
        );

      case 'reference':
        // Определяем тип объекта для ссылки из маппинга
        const referenceTypeCode = referenceTypeMap[field.fieldKey];
        
        return (
          <Form.Item
            key={field.fieldKey}
            label={field.label}
            name={field.fieldKey}
            rules={field.isRequired ? [{ required: true, message: `Поле "${field.label}" обязательно` }] : undefined}
          >
            {isEditing && referenceTypeCode ? (
              <ObjectCardSelect
                objectTypeCode={referenceTypeCode}
                value={value as string}
                onChange={(val) => form.setFieldValue(field.fieldKey, val)}
                placeholder={field.label ? `Выберите ${field.label}` : undefined}
              />
            ) : isEditing ? (
              <Input placeholder={field.label ? `Выберите ${field.label}` : 'Выберите из списка'} />
            ) : (
              <span>{value || '-'}</span>
            )}
          </Form.Item>
        );

      case 'json':
        return (
          <Form.Item key={field.fieldKey} label={field.label} name={field.fieldKey}>
            {isEditing ? (
              <TextArea rows={4} placeholder={field.label} />
            ) : (
              <pre style={{ margin: 0, whiteSpace: 'pre-wrap', maxHeight: '200px', overflow: 'auto' }}>
                {value ? JSON.stringify(value, null, 2) : '-'}
              </pre>
            )}
          </Form.Item>
        );

      default:
        return (
          <Form.Item key={field.fieldKey} label={field.label} name={field.fieldKey}>
            {isEditing ? <Input placeholder={field.label} /> : <span>{String(value || '-')}</span>}
          </Form.Item>
        );
    }
  };

  const groupedSchemas = schemas.reduce((acc: Record<string, SchemaField[]>, field) => {
    const group = field.fieldGroup || 'Прочее';
    if (!acc[group]) acc[group] = [];
    acc[group].push(field);
    return acc;
  }, {});

  const tabsItems: TabsProps['items'] = [
    {
      key: 'main',
      label: 'Основное',
      children: (
        <Form form={form} layout="vertical">
          <Descriptions column={1} bordered>
            <Descriptions.Item label="Тип объекта">{card?.typeName || '-'}</Descriptions.Item>
            <Descriptions.Item label="Код">{card?.code || '-'}</Descriptions.Item>
            <Descriptions.Item label="Наименование">{card?.name || '-'}</Descriptions.Item>
            <Descriptions.Item label="Статус">
              <Tag color={card?.status === 'Active' ? 'green' : card?.status === 'Archived' ? 'gray' : 'orange'}>
                {card?.status === 'Active' ? 'Активен' : card?.status === 'Archived' ? 'Архив' : 'Неактивен'}
              </Tag>
            </Descriptions.Item>
          </Descriptions>

          {Object.entries(groupedSchemas).map(([group, fields]) => {
            const groupFields = fields.filter((f) => f.fieldGroup === group);
            if (groupFields.length === 0) return null;

            return (
              <Card key={group} size="small" title={group} style={{ marginTop: 16 }}>
                <Space direction="vertical" style={{ width: '100%' }} size="middle">
                  {groupFields.map((field) => renderField(field))}
                </Space>
              </Card>
            );
          })}
        </Form>
      )
    },
    {
      key: 'files',
      label: `Файлы (${files.length})`,
      children: (
        <Card size="small">
          <Space direction="vertical" style={{ width: '100%' }} size="middle">
            {editing && (
              <Upload
                beforeUpload={(file) => {
                  const maxSize = 50 * 1024 * 1024; // 50 МБ
                  if (file.size > maxSize) {
                    message.error('Размер файла не должен превышать 50 МБ');
                    return false;
                  }
                  handleFileUpload(file);
                  return false;
                }}
                showUploadList={false}
                maxCount={1}
                accept="*/*"
              >
                <Button icon={<UploadOutlined />} loading={uploading} type="primary">
                  Загрузить файл
                </Button>
              </Upload>
            )}
            {files.length === 0 ? (
              <Typography.Text type="secondary">Файлы не загружены</Typography.Text>
            ) : (
              <List
                dataSource={files}
                renderItem={(file) => (
                  <List.Item
                    actions={[
                      <Button
                        key="download"
                        type="link"
                        icon={<FileOutlined />}
                        onClick={async () => {
                          try {
                            await api.objectFiles.download(file.id, file.name);
                          } catch (error: any) {
                            message.error('Ошибка при скачивании файла: ' + (error.message || 'Неизвестная ошибка'));
                          }
                        }}
                      >
                        Скачать
                      </Button>,
                      editing && (
                        <Popconfirm
                          key="delete"
                          title="Удаление файла"
                          description={`Удалить файл "${file.name}"?`}
                          onConfirm={() => handleFileDelete(file.id)}
                          okText="Удалить"
                          okType="danger"
                          cancelText="Отмена"
                        >
                          <Button
                            type="link"
                            danger
                            icon={<DeleteOutlined />}
                            loading={deletingFileId === file.id}
                          >
                            Удалить
                          </Button>
                        </Popconfirm>
                      )
                    ].filter(Boolean)}
                  >
                    <List.Item.Meta
                      title={<Typography.Text>{file.name}</Typography.Text>}
                      description={
                        <Space direction="vertical" size={0}>
                          <Typography.Text type="secondary">
                            Размер: {formatFileSize(file.size)}
                          </Typography.Text>
                          <Typography.Text type="secondary" style={{ fontSize: '12px' }}>
                            Загружен {dayjs(file.uploadedAt).format('DD.MM.YYYY HH:mm')}
                          </Typography.Text>
                        </Space>
                      }
                    />
                  </List.Item>
                )}
              />
            )}
          </Space>
        </Card>
      )
    },
    {
      key: 'history',
      label: `История (${history.length})`,
      children: (
        <Card size="small">
          {history.length === 0 ? (
            <Typography.Text type="secondary">История изменений отсутствует</Typography.Text>
          ) : (
            <Timeline
              items={history.map((h) => ({
                children: (
                  <Space direction="vertical" size={4} style={{ width: '100%' }}>
                    <Space>
                      <Typography.Text strong>{h.changeType}</Typography.Text>
                      <Typography.Text type="secondary" style={{ fontSize: '12px' }}>
                        {dayjs(h.createdAt).format('DD.MM.YYYY HH:mm:ss')}
                      </Typography.Text>
                    </Space>
                    {h.fieldKey && (
                      <div style={{ paddingLeft: 16, borderLeft: '2px solid #d9d9d9' }}>
                        <Typography.Text type="secondary" style={{ fontSize: '12px' }}>
                          Поле: <strong>{h.fieldKey}</strong>
                        </Typography.Text>
                        {h.oldValue !== undefined && (
                          <div>
                            <Typography.Text type="secondary" style={{ fontSize: '12px' }}>
                              Было: {String(h.oldValue || '(пусто)')}
                            </Typography.Text>
                          </div>
                        )}
                        {h.newValue !== undefined && (
                          <div>
                            <Typography.Text type="secondary" style={{ fontSize: '12px' }}>
                              Стало: {String(h.newValue || '(пусто)')}
                            </Typography.Text>
                          </div>
                        )}
                      </div>
                    )}
                    {h.comment && (
                      <Typography.Text type="secondary" style={{ fontSize: '12px' }}>
                        Комментарий: {h.comment}
                      </Typography.Text>
                    )}
                  </Space>
                )
              }))}
            />
          )}
        </Card>
      )
    }
  ];

  if (loading) {
    return (
      <div style={{ padding: '24px', textAlign: 'center' }}>
        <Spin size="large" />
      </div>
    );
  }

  if (!card) {
    return (
      <div style={{ padding: '24px' }}>
        <Alert message="Карточка объекта учета не найдена" type="error" />
      </div>
    );
  }

  return (
    <div style={{ padding: '24px' }}>
      <Space direction="vertical" style={{ width: '100%' }} size="large">
        <Space>
          <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/analytics')}>
            Назад
          </Button>
          <Title level={3} style={{ margin: 0 }}>
            {card.name} ({card.typeName})
          </Title>
        </Space>

        <Space>
          {!editing ? (
            <Button icon={<EditOutlined />} onClick={() => setEditing(true)}>
              Редактировать
            </Button>
          ) : (
            <>
              <Button icon={<SaveOutlined />} type="primary" loading={saving} onClick={handleSave}>
                Сохранить
              </Button>
              <Button onClick={() => { setEditing(false); loadCard(); }}>
                Отмена
              </Button>
            </>
          )}
        </Space>

        <Tabs activeKey={activeTab} onChange={setActiveTab} items={tabsItems} />
      </Space>
    </div>
  );
}
