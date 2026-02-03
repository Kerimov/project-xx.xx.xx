import { useState, useEffect } from 'react';
import {
  Table,
  Button,
  Space,
  Modal,
  Form,
  Input,
  Select,
  Switch,
  InputNumber,
  message,
  Popconfirm,
  Tag
} from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { api } from '../services/api';

const { Option } = Select;
const { TextArea } = Input;

interface SchemaField {
  id: string;
  fieldKey: string;
  label: string;
  dataType: string;
  fieldGroup: string | null;
  isRequired: boolean;
  isUnique: boolean;
  validationRules?: Record<string, unknown>;
  defaultValue?: unknown;
  referenceTypeId?: string | null;
  enumValues?: string[] | null;
  displayOrder: number;
}

interface ObjectTypeSchemaEditorProps {
  typeId: string;
  onSchemaChange?: () => void;
}

const DATA_TYPES = [
  { value: 'string', label: 'Строка' },
  { value: 'number', label: 'Число' },
  { value: 'money', label: 'Деньги' },
  { value: 'date', label: 'Дата' },
  { value: 'boolean', label: 'Булево' },
  { value: 'enum', label: 'Перечисление' },
  { value: 'reference', label: 'Ссылка на объект' },
  { value: 'file', label: 'Файл' },
  { value: 'json', label: 'JSON' }
];

const FIELD_GROUPS = [
  'Основное',
  'Идентификация',
  'Финансы (БУ)',
  'Амортизация',
  'Эксплуатация',
  'Налоговая',
  'Управленческая',
  'Связи',
  'Прочее'
];

export function ObjectTypeSchemaEditor({ typeId, onSchemaChange }: ObjectTypeSchemaEditorProps) {
  const [schemas, setSchemas] = useState<SchemaField[]>([]);
  const [loading, setLoading] = useState(false);
  const [schemaModalVisible, setSchemaModalVisible] = useState(false);
  const [editingSchema, setEditingSchema] = useState<SchemaField | null>(null);
  const [schemaForm] = Form.useForm();
  const [objectTypes, setObjectTypes] = useState<Array<{ id: string; code: string; name: string }>>([]);

  useEffect(() => {
    if (typeId) {
      loadSchemas();
      loadObjectTypes();
    }
  }, [typeId]);

  const loadSchemas = async () => {
    if (!typeId) return;
    setLoading(true);
    try {
      const response = await api.objects.types.getSchemas(typeId);
      setSchemas(response.data || []);
    } catch (e: any) {
      message.error('Ошибка загрузки схемы полей: ' + (e.message || 'Неизвестная ошибка'));
    } finally {
      setLoading(false);
    }
  };

  const loadObjectTypes = async () => {
    try {
      const response = await api.objects.types.list({ activeOnly: true });
      setObjectTypes(response.data || []);
    } catch (e) {
      console.error('Ошибка загрузки типов объектов:', e);
    }
  };

  const handleCreateSchema = () => {
    setEditingSchema(null);
    schemaForm.resetFields();
    schemaForm.setFieldsValue({
      dataType: 'string',
      fieldGroup: 'Основное',
      isRequired: false,
      isUnique: false,
      displayOrder: schemas.length + 1
    });
    setSchemaModalVisible(true);
  };

  const handleEditSchema = (schema: SchemaField) => {
    setEditingSchema(schema);
    schemaForm.setFieldsValue({
      fieldKey: schema.fieldKey,
      label: schema.label,
      dataType: schema.dataType,
      fieldGroup: schema.fieldGroup || 'Основное',
      isRequired: schema.isRequired,
      isUnique: schema.isUnique,
      displayOrder: schema.displayOrder,
      referenceTypeId: schema.referenceTypeId,
      enumValues: schema.enumValues ? schema.enumValues.join('\n') : '',
      defaultValue: schema.defaultValue
    });
    setSchemaModalVisible(true);
  };

  const handleDeleteSchema = async (fieldKey: string) => {
    if (!typeId) return;
    try {
      await api.objects.types.deleteSchema(typeId, fieldKey);
      message.success('Поле удалено');
      await loadSchemas();
      onSchemaChange?.();
    } catch (e: any) {
      message.error('Ошибка удаления: ' + (e.message || 'Неизвестная ошибка'));
    }
  };

  const handleSubmitSchema = async () => {
    try {
      const values = await schemaForm.validateFields();
      const payload: any = {
        fieldKey: values.fieldKey,
        label: values.label,
        dataType: values.dataType,
        fieldGroup: values.fieldGroup || null,
        isRequired: values.isRequired || false,
        isUnique: values.isUnique || false,
        displayOrder: values.displayOrder || 0
      };

      if (values.dataType === 'reference' && values.referenceTypeId) {
        payload.referenceTypeId = values.referenceTypeId;
      }

      if (values.dataType === 'enum' && values.enumValues) {
        payload.enumValues = values.enumValues
          .split('\n')
          .map((v: string) => v.trim())
          .filter((v: string) => v.length > 0);
      }

      if (values.defaultValue !== undefined && values.defaultValue !== null && values.defaultValue !== '') {
        payload.defaultValue = values.defaultValue;
      }

      if (!typeId) return;

      await api.objects.types.upsertSchema(typeId, payload);
      message.success(editingSchema ? 'Поле обновлено' : 'Поле создано');
      setSchemaModalVisible(false);
      await loadSchemas();
      onSchemaChange?.();
    } catch (e: any) {
      message.error('Ошибка сохранения: ' + (e.message || 'Неизвестная ошибка'));
    }
  };

  const columns = [
    {
      title: 'Ключ поля',
      dataIndex: 'fieldKey',
      key: 'fieldKey',
      width: 150
    },
    {
      title: 'Название',
      dataIndex: 'label',
      key: 'label'
    },
    {
      title: 'Тип данных',
      dataIndex: 'dataType',
      key: 'dataType',
      width: 120,
      render: (type: string) => {
        const typeInfo = DATA_TYPES.find((t) => t.value === type);
        return <Tag>{typeInfo?.label || type}</Tag>;
      }
    },
    {
      title: 'Группа',
      dataIndex: 'fieldGroup',
      key: 'fieldGroup',
      width: 150
    },
    {
      title: 'Обязательное',
      dataIndex: 'isRequired',
      key: 'isRequired',
      width: 100,
      render: (required: boolean) => (required ? <Tag color="red">Да</Tag> : <Tag>Нет</Tag>)
    },
    {
      title: 'Порядок',
      dataIndex: 'displayOrder',
      key: 'displayOrder',
      width: 80
    },
    {
      title: 'Действия',
      key: 'actions',
      width: 150,
      render: (_: any, record: SchemaField) => (
        <Space>
          <Button type="link" size="small" icon={<EditOutlined />} onClick={() => handleEditSchema(record)}>
            Редактировать
          </Button>
          <Popconfirm
            title="Удалить поле?"
            onConfirm={() => handleDeleteSchema(record.fieldKey)}
            okText="Да"
            cancelText="Нет"
          >
            <Button type="link" size="small" danger icon={<DeleteOutlined />}>
              Удалить
            </Button>
          </Popconfirm>
        </Space>
      )
    }
  ];

  return (
    <div>
      <Space style={{ marginBottom: 16, width: '100%', justifyContent: 'space-between' }}>
        <Button type="primary" icon={<PlusOutlined />} onClick={handleCreateSchema}>
          Добавить поле
        </Button>
      </Space>

      <Table
        columns={columns}
        dataSource={schemas}
        rowKey="fieldKey"
        loading={loading}
        pagination={false}
        size="small"
      />

      <Modal
        title={editingSchema ? 'Редактировать поле' : 'Добавить поле'}
        open={schemaModalVisible}
        onOk={handleSubmitSchema}
        onCancel={() => setSchemaModalVisible(false)}
        width={600}
      >
        <Form form={schemaForm} layout="vertical">
          <Form.Item
            name="fieldKey"
            label="Ключ поля"
            rules={[
              { required: true, message: 'Введите ключ поля' },
              {
                pattern: /^[a-z][a-zA-Z0-9]*$/,
                message: 'Ключ должен начинаться с буквы и содержать только латинские буквы, цифры'
              }
            ]}
          >
            <Input disabled={!!editingSchema} placeholder="inventoryNumber" />
          </Form.Item>
          <Form.Item name="label" label="Название" rules={[{ required: true, message: 'Введите название' }]}>
            <Input placeholder="Инвентарный номер" />
          </Form.Item>
          <Form.Item name="dataType" label="Тип данных" rules={[{ required: true }]}>
            <Select>
              {DATA_TYPES.map((type) => (
                <Option key={type.value} value={type.value}>
                  {type.label}
                </Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item
            noStyle
            shouldUpdate={(prevValues, currentValues) => prevValues.dataType !== currentValues.dataType}
          >
            {({ getFieldValue }) => {
              const dataType = getFieldValue('dataType');
              return (
                <>
                  {dataType === 'reference' && (
                    <Form.Item name="referenceTypeId" label="Тип объекта для ссылки">
                      <Select placeholder="Выберите тип объекта">
                        {objectTypes.map((type) => (
                          <Option key={type.id} value={type.id}>
                            {type.name} ({type.code})
                          </Option>
                        ))}
                      </Select>
                    </Form.Item>
                  )}
                  {dataType === 'enum' && (
                    <Form.Item
                      name="enumValues"
                      label="Значения перечисления (по одному на строку)"
                      rules={[{ required: true, message: 'Введите значения перечисления' }]}
                    >
                      <TextArea rows={4} placeholder="value1&#10;value2&#10;value3" />
                    </Form.Item>
                  )}
                </>
              );
            }}
          </Form.Item>
          <Form.Item name="fieldGroup" label="Группа полей">
            <Select>
              {FIELD_GROUPS.map((group) => (
                <Option key={group} value={group}>
                  {group}
                </Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item name="isRequired" label="Обязательное" valuePropName="checked">
            <Switch />
          </Form.Item>
          <Form.Item name="isUnique" label="Уникальное" valuePropName="checked">
            <Switch />
          </Form.Item>
          <Form.Item name="displayOrder" label="Порядок отображения">
            <InputNumber min={0} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="defaultValue" label="Значение по умолчанию">
            <Input placeholder="Значение по умолчанию (опционально)" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
