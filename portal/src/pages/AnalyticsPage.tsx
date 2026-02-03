import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Card,
  Checkbox,
  Col,
  Divider,
  Row,
  Space,
  Typography,
  message,
  Tag,
  Tabs,
  Table,
  Button,
  Modal,
  Form,
  Input,
  InputNumber,
  Select,
  Switch,
  DatePicker
} from 'antd';
import type { TabsProps } from 'antd';
import { PlusOutlined, EditOutlined } from '@ant-design/icons';
import { ObjectTypeSchemaEditor } from '../components/ObjectTypeSchemaEditor';
import { api } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { useAnalyticsAccess } from '../contexts/AnalyticsAccessContext';
import dayjs from 'dayjs';

const { TextArea } = Input;

type TypeRow = { id: string; code: string; name: string; directionId: string | null; isActive: boolean };
type SubRow = { typeId: string; typeCode: string; typeName: string; isEnabled: boolean };

interface ObjectType {
  id: string;
  code: string;
  name: string;
  directionId: string | null;
  icon: string | null;
  description: string | null;
  isActive: boolean;
}

interface ObjectCard {
  id: string;
  typeId: string;
  code: string;
  name: string;
  organizationId: string | null;
  status: string;
  attrs: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export function AnalyticsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { refresh: refreshAccess } = useAnalyticsAccess();
  const isOrgAdmin = useMemo(() => user?.role === 'org_admin' || user?.role === 'ecof_admin', [user?.role]);
  const isEcofAdmin = useMemo(() => user?.role === 'ecof_admin', [user?.role]);
  
  // Аналитики
  const [types, setTypes] = useState<TypeRow[]>([]);
  const [subs, setSubs] = useState<SubRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingTypeId, setSavingTypeId] = useState<string | null>(null);

  // Объекты учета
  const [objectTypes, setObjectTypes] = useState<ObjectType[]>([]);
  const [objectSubs, setObjectSubs] = useState<Array<{ typeId: string; typeCode: string; typeName: string; isEnabled: boolean }>>([]);
  const [objectCards, setObjectCards] = useState<ObjectCard[]>([]);
  const [objectCardsLoading, setObjectCardsLoading] = useState(false);
  const [selectedObjectTypeCode, setSelectedObjectTypeCode] = useState<string | null>(null);
  const [objectTypeModalVisible, setObjectTypeModalVisible] = useState(false);
  const [objectCardModalVisible, setObjectCardModalVisible] = useState(false);
  const [objectTypeForm] = Form.useForm();
  const [objectCardForm] = Form.useForm();
  const [editingObjectType, setEditingObjectType] = useState<ObjectType | null>(null);
  const [savingObjectTypeId, setSavingObjectTypeId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string>('analytics');
  const [schemaEditorVisible, setSchemaEditorVisible] = useState(false);
  const [schemaEditorTypeId, setSchemaEditorTypeId] = useState<string | null>(null);
  
  // Администрирование аналитик (для ecof_admin)
  const [adminCreateForm] = Form.useForm();
  const [adminValueForm] = Form.useForm();

  const enabledSet = useMemo(() => new Set(subs.filter((s) => s.isEnabled).map((s) => s.typeId)), [subs]);
  const objectEnabledSet = useMemo(() => new Set(objectSubs.filter((s) => s.isEnabled).map((s) => s.typeId)), [objectSubs]);
  
  // Для сотрудников показываем только подписанные аналитики
  const displayedTypes = useMemo(() => {
    if (isOrgAdmin) {
      return types.filter((t) => t.isActive);
    } else {
      return types.filter((t) => t.isActive && enabledSet.has(t.id));
    }
  }, [types, enabledSet, isOrgAdmin]);

  // Для сотрудников показываем только подписанные объекты учета
  const displayedObjectTypes = useMemo(() => {
    if (isOrgAdmin) {
      return objectTypes.filter((t) => t.isActive);
    } else {
      return objectTypes.filter((t) => t.isActive && objectEnabledSet.has(t.id));
    }
  }, [objectTypes, objectEnabledSet, isOrgAdmin]);

  const loadAnalytics = async () => {
    try {
      const [tRes, sRes] = await Promise.all([
        api.analytics.listTypes(),
        api.analytics.listSubscriptions()
      ]);
      setTypes(tRes.data || []);
      setSubs(sRes.data || []);
    } catch (e: any) {
      message.error(e?.message || 'Ошибка загрузки аналитик');
    }
  };

  const loadObjectTypes = async () => {
    try {
      const [tRes, sRes] = await Promise.all([
        api.objects.types.list({ activeOnly: false }),
        api.objects.subscriptions.list()
      ]);
      setObjectTypes(tRes.data || []);
      setObjectSubs(sRes.data || []);
    } catch (e: any) {
      message.error(e?.message || 'Ошибка загрузки объектов учета');
    }
  };

  const loadObjectCards = async (typeCode: string, search?: string) => {
    if (!typeCode) return;
    try {
      setObjectCardsLoading(true);
      const response = await api.objects.subscribedCards.list({ typeCode, search, limit: 100 });
      setObjectCards(response.data.cards || []);
    } catch (e: any) {
      message.error(e?.message || 'Ошибка загрузки карточек объектов');
    } finally {
      setObjectCardsLoading(false);
    }
  };

  const load = async () => {
    try {
      setLoading(true);
      await Promise.all([loadAnalytics(), loadObjectTypes()]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (selectedObjectTypeCode && activeTab === 'objects') {
      loadObjectCards(selectedObjectTypeCode);
    }
  }, [selectedObjectTypeCode, activeTab]);

  const toggleSubscription = async (typeId: string, isEnabled: boolean) => {
    try {
      setSavingTypeId(typeId);
      await api.analytics.setSubscription({ typeId, isEnabled });
      const sRes = await api.analytics.listSubscriptions();
      setSubs(sRes.data || []);
      await refreshAccess();
      message.success(isEnabled ? 'Подписка включена' : 'Подписка отключена');
    } catch (e: any) {
      message.error(e?.message || 'Ошибка сохранения подписки');
    } finally {
      setSavingTypeId(null);
    }
  };

  const toggleObjectSubscription = async (typeId: string, isEnabled: boolean) => {
    try {
      setSavingObjectTypeId(typeId);
      await api.objects.subscriptions.set({ typeId, isEnabled });
      await loadObjectTypes();
      message.success(isEnabled ? 'Подписка включена' : 'Подписка отключена');
    } catch (e: any) {
      message.error(e?.message || 'Ошибка сохранения подписки');
    } finally {
      setSavingObjectTypeId(null);
    }
  };

  const handleCreateObjectType = () => {
    setEditingObjectType(null);
    objectTypeForm.resetFields();
    setObjectTypeModalVisible(true);
  };

  const handleEditObjectType = (type: ObjectType) => {
    setEditingObjectType(type);
    objectTypeForm.setFieldsValue({
      code: type.code,
      name: type.name,
      directionId: type.directionId,
      icon: type.icon,
      description: type.description,
      isActive: type.isActive
    });
    setObjectTypeModalVisible(true);
  };

  const handleEditSchema = (type: ObjectType) => {
    setSchemaEditorTypeId(type.id);
    setSchemaEditorVisible(true);
  };

  const handleSubmitObjectType = async () => {
    try {
      const values = await objectTypeForm.validateFields();
      if (editingObjectType) {
        await api.objects.types.update(editingObjectType.id, values);
        message.success('Тип объекта учета обновлён');
      } else {
        await api.objects.types.create(values);
        message.success('Тип объекта учета создан');
      }
      setObjectTypeModalVisible(false);
      await loadObjectTypes();
    } catch (e: any) {
      message.error('Ошибка сохранения: ' + (e.message || 'Неизвестная ошибка'));
    }
  };

  const [objectCardSchemas, setObjectCardSchemas] = useState<Array<{
    fieldKey: string;
    label: string;
    dataType: string;
    fieldGroup: string | null;
    isRequired: boolean;
    enumValues?: string[];
    displayOrder: number;
  }>>([]);

  const handleCreateObjectCard = async () => {
    if (!selectedObjectTypeCode) {
      message.warning('Выберите тип объекта учета');
      return;
    }
    const type = objectTypes.find((t) => t.code === selectedObjectTypeCode);
    if (!type) return;
    
    // Загружаем схему полей для типа объекта
    try {
      const schemasRes = await api.objects.types.getSchemas(type.id);
      const schemasData = schemasRes.data || [];
      setObjectCardSchemas(schemasData);
      
      // Инициализируем форму значениями по умолчанию
      const initialValues: Record<string, unknown> = {
        typeId: type.id,
        status: 'Active'
      };
      
      schemasData.forEach((field) => {
        if (field.defaultValue !== undefined && field.defaultValue !== null) {
          initialValues[field.fieldKey] = field.defaultValue;
        }
      });
      
      objectCardForm.resetFields();
      objectCardForm.setFieldsValue(initialValues);
      setObjectCardModalVisible(true);
    } catch (e: any) {
      message.error('Ошибка загрузки схемы полей: ' + (e.message || 'Неизвестная ошибка'));
    }
  };

  const handleSubmitObjectCard = async () => {
    try {
      const values = await objectCardForm.validateFields();
      
      // Разделяем основные поля и атрибуты
      const { typeId, code, name, status, organizationId, ...attrsRaw } = values;
      
      // Преобразуем даты из dayjs в строки для attrs
      const attrs: Record<string, unknown> = {};
      Object.entries(attrsRaw).forEach(([key, value]) => {
        const field = objectCardSchemas.find((f) => f.fieldKey === key);
        if (field?.dataType === 'date' && dayjs.isDayjs(value)) {
          attrs[key] = (value as any).format('YYYY-MM-DD');
        } else {
          attrs[key] = value;
        }
      });
      
      await api.objects.cards.create({
        typeId,
        code,
        name,
        status: status || 'Active',
        organizationId: organizationId || null,
        attrs
      });
      
      message.success('Карточка объекта учета создана');
      setObjectCardModalVisible(false);
      objectCardForm.resetFields();
      setObjectCardSchemas([]);
      if (selectedObjectTypeCode) {
        await loadObjectCards(selectedObjectTypeCode);
      }
    } catch (e: any) {
      message.error('Ошибка сохранения: ' + (e.message || 'Неизвестная ошибка'));
    }
  };

  const objectTypeColumns = [
    {
      title: 'Код',
      dataIndex: 'code',
      key: 'code',
      width: 200
    },
    {
      title: 'Наименование',
      dataIndex: 'name',
      key: 'name'
    },
    {
      title: 'Статус',
      dataIndex: 'isActive',
      key: 'isActive',
      width: 100,
      render: (isActive: boolean) => (
        <Tag color={isActive ? 'green' : 'red'}>{isActive ? 'Активен' : 'Неактивен'}</Tag>
      )
    },
    ...(isEcofAdmin
      ? [
          {
            title: 'Действия',
            key: 'actions',
            width: 100,
            render: (_: any, record: ObjectType) => (
              <Button type="link" icon={<EditOutlined />} onClick={() => handleEditObjectType(record)}>
                Редактировать
              </Button>
            )
          }
        ]
      : [])
  ];

  const objectCardColumns = [
    {
      title: 'Код',
      dataIndex: 'code',
      key: 'code',
      width: 150
    },
    {
      title: 'Наименование',
      dataIndex: 'name',
      key: 'name',
      render: (_: any, record: ObjectCard) => (
        <Button
          type="link"
          onClick={() => navigate(`/objects/cards/${record.id}`)}
          style={{ padding: 0 }}
        >
          {record.name}
        </Button>
      )
    },
    {
      title: 'Статус',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: string) => (
        <Tag color={status === 'Active' ? 'green' : status === 'Archived' ? 'gray' : 'orange'}>
          {status === 'Active' ? 'Активен' : status === 'Archived' ? 'Архив' : 'Неактивен'}
        </Tag>
      )
    },
    {
      title: 'Дата создания',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 150,
      render: (date: string) => dayjs(date).format('DD.MM.YYYY')
    }
  ];

  const tabsItems: TabsProps['items'] = [
    {
      key: 'analytics',
      label: 'Аналитики',
      children: (
        <Space direction="vertical" style={{ width: '100%' }} size="large">
          <Card size="small" title="Подписки на виды аналитик" loading={loading}>
            <Typography.Paragraph type="secondary" style={{ marginTop: 0 }}>
              {isOrgAdmin
                ? 'Включите только те аналитики, которые ваша организация будет получать и использовать в документах на портале.'
                : 'Аналитики, на которые подписана ваша организация. Для изменения подписок обратитесь к администратору организации.'}
            </Typography.Paragraph>

            <Divider style={{ margin: '12px 0' }} />

            {loading ? (
              <Typography.Paragraph type="secondary" style={{ textAlign: 'center', padding: '40px 0' }}>
                Загрузка аналитик...
              </Typography.Paragraph>
            ) : displayedTypes.length === 0 ? (
              <Typography.Paragraph type="secondary" style={{ textAlign: 'center', padding: '40px 0' }}>
                {isOrgAdmin
                  ? 'Нет доступных аналитик. Обратитесь к администратору ЕЦОФ для добавления аналитик в каталог или создайте новый тип аналитики во вкладке "Администрирование".'
                  : 'Ваша организация не подписана ни на одну аналитику. Обратитесь к администратору организации для настройки подписок.'}
              </Typography.Paragraph>
            ) : (
              <>
                <Typography.Text strong style={{ display: 'block', marginBottom: 12 }}>
                  Доступно аналитик: {displayedTypes.length}
                  {isOrgAdmin && ` (из ${types.length} в каталоге)`}
                </Typography.Text>
                <Row gutter={[12, 12]}>
                  {displayedTypes.map((t) => (
                    <Col key={t.id} xs={24} md={12} lg={8}>
                      <Card size="small">
                        <Space direction="vertical">
                          <Checkbox
                            checked={enabledSet.has(t.id)}
                            disabled={!isOrgAdmin || savingTypeId === t.id}
                            onChange={(e) => toggleSubscription(t.id, e.target.checked)}
                          >
                            <b>{t.name}</b>
                          </Checkbox>
                          <Typography.Text type="secondary">Код: {t.code}</Typography.Text>
                          {!isOrgAdmin && <Tag color="green">Подписана</Tag>}
                        </Space>
                      </Card>
                    </Col>
                  ))}
                </Row>
              </>
            )}
          </Card>
        </Space>
      )
    },
    {
      key: 'objects',
      label: 'Объекты учета',
      children: (
        <Space direction="vertical" style={{ width: '100%' }} size="large">
          {/* Шаг 1. Тип объекта учета */}
          <Card size="small" title="Шаг 1. Тип объекта учета">
            <Typography.Paragraph type="secondary" style={{ marginTop: 0 }}>
              Выберите тип объекта (Основное средство, Проект и т.д.). Включите подписку на нужный тип — тогда вы сможете создавать объекты этого типа и добавлять к ним аналитики.
            </Typography.Paragraph>
            <Divider style={{ margin: '12px 0' }} />
            {displayedObjectTypes.length === 0 ? (
              <Typography.Paragraph type="secondary" style={{ textAlign: 'center', padding: '40px 0' }}>
                {isOrgAdmin
                  ? 'Нет доступных типов объектов. Обратитесь к администратору ЕЦОФ или создайте тип во вкладке «Администрирование».'
                  : 'Ваша организация не подписана ни на один тип объекта. Обратитесь к администратору организации.'}
              </Typography.Paragraph>
            ) : (
              <Row gutter={[12, 12]}>
                {displayedObjectTypes.map((t) => (
                  <Col key={t.id} xs={24} md={12} lg={8}>
                    <Card size="small">
                      <Space direction="vertical">
                        <Checkbox
                          checked={objectEnabledSet.has(t.id)}
                          disabled={!isOrgAdmin || savingObjectTypeId === t.id}
                          onChange={(e) => toggleObjectSubscription(t.id, e.target.checked)}
                        >
                          <b>{t.name}</b>
                        </Checkbox>
                        <Typography.Text type="secondary">Код: {t.code}</Typography.Text>
                        {!isOrgAdmin && <Tag color="green">Подписана</Tag>}
                      </Space>
                    </Card>
                  </Col>
                ))}
              </Row>
            )}
          </Card>

          {/* Шаг 2. Создание объекта и добавление аналитик */}
          <Card
            size="small"
            title="Шаг 2. Создание объекта и добавление аналитик"
            extra={
              isOrgAdmin && selectedObjectTypeCode ? (
                <Button type="primary" icon={<PlusOutlined />} onClick={handleCreateObjectCard}>
                  Создать объект
                </Button>
              ) : null
            }
          >
            <Typography.Paragraph type="secondary" style={{ marginTop: 0 }}>
              Создайте объект выбранного типа (код и наименование), затем заполните аналитические признаки — характеристики, суммы, даты и т.д.
            </Typography.Paragraph>
            <Divider style={{ margin: '12px 0' }} />
            <Space direction="vertical" style={{ width: '100%' }}>
              <Space wrap>
                <Typography.Text strong>Тип объекта:</Typography.Text>
                <Select
                  placeholder="Выберите тип объекта"
                  style={{ width: 320 }}
                  value={selectedObjectTypeCode}
                  onChange={(value) => {
                    setSelectedObjectTypeCode(value);
                    if (value) loadObjectCards(value);
                    else setObjectCards([]);
                  }}
                  options={displayedObjectTypes
                    .filter((t) => objectEnabledSet.has(t.id))
                    .map((t) => ({ label: `${t.name} (${t.code})`, value: t.code }))}
                  notFoundContent={
                    displayedObjectTypes.length === 0
                      ? 'Нет доступных типов. Включите подписку в шаге 1.'
                      : 'Нет подписанных типов. Включите подписку в шаге 1.'
                  }
                />
                {selectedObjectTypeCode && (
                  <Input.Search
                    placeholder="Поиск по коду или наименованию..."
                    style={{ width: 280 }}
                    onSearch={(value) => selectedObjectTypeCode && loadObjectCards(selectedObjectTypeCode, value || undefined)}
                    allowClear
                  />
                )}
              </Space>
              {!selectedObjectTypeCode && (
                <Typography.Paragraph type="secondary" style={{ marginBottom: 0 }}>
                  Выберите тип объекта выше, затем нажмите «Создать объект» — откроется форма: сначала укажете объект (код, наименование), затем добавите аналитики.
                </Typography.Paragraph>
              )}
            </Space>
          </Card>

          {/* Шаг 3. Созданные объекты */}
          <Card size="small" title="Шаг 3. Созданные объекты">
            <Typography.Paragraph type="secondary" style={{ marginTop: 0 }}>
              Список объектов выбранного типа. Нажмите на наименование, чтобы открыть карточку и при необходимости отредактировать аналитики.
            </Typography.Paragraph>
            <Divider style={{ margin: '12px 0' }} />
            {selectedObjectTypeCode ? (
              objectCards.length > 0 ? (
                <Table
                  columns={objectCardColumns}
                  dataSource={objectCards}
                  rowKey="id"
                  loading={objectCardsLoading}
                  pagination={{ pageSize: 20 }}
                  size="small"
                />
              ) : (
                <Typography.Paragraph type="secondary" style={{ textAlign: 'center', padding: '40px 0' }}>
                  {objectCardsLoading ? 'Загрузка...' : 'Нет объектов этого типа. На шаге 2 нажмите «Создать объект» и заполните форму (объект + аналитики).'}
                </Typography.Paragraph>
              )
            ) : (
              <Typography.Paragraph type="secondary" style={{ textAlign: 'center', padding: '40px 0' }}>
                Выберите тип объекта в шаге 2, чтобы увидеть список созданных объектов.
              </Typography.Paragraph>
            )}
          </Card>
        </Space>
      )
    },
    ...(isEcofAdmin ? [{
      key: 'admin',
      label: 'Администрирование',
      children: (
        <Space direction="vertical" style={{ width: '100%' }} size="large">
          <Card size="small" title="Создать тип аналитики">
            <Typography.Paragraph type="secondary" style={{ marginBottom: 16 }}>
              Создайте новый тип аналитики, который будет доступен для подписки организациям. 
              После создания тип появится в каталоге аналитик во вкладке "Аналитики".
            </Typography.Paragraph>
            <Form layout="vertical" form={adminCreateForm}>
              <Row gutter={12}>
                <Col xs={24} md={6}>
                  <Form.Item
                    name="code"
                    label="Код (A-Z0-9_)"
                    rules={[{ required: true, message: 'Укажите code' }]}
                  >
                    <Input placeholder="COUNTERPARTY" />
                  </Form.Item>
                </Col>
                <Col xs={24} md={12}>
                  <Form.Item name="name" label="Название" rules={[{ required: true, message: 'Укажите name' }]}>
                    <Input placeholder="Контрагент" />
                  </Form.Item>
                </Col>
                <Col xs={24} md={6}>
                  <Form.Item name="directionId" label="Direction ID (опц.)">
                    <Input placeholder="UUID или пусто" />
                  </Form.Item>
                </Col>
              </Row>
              <Button type="primary" onClick={async () => {
                try {
                  const v = await adminCreateForm.validateFields();
                  await api.analytics.adminCreateType(v);
                  message.success('Тип аналитики создан');
                  adminCreateForm.resetFields();
                  await loadAnalytics();
                } catch (e: any) {
                  if (e?.errorFields) return;
                  message.error(e?.message || 'Ошибка создания');
                }
              }}>
                Создать
              </Button>
            </Form>
          </Card>

          <Card size="small" title="Каталог аналитик">
            <Typography.Paragraph type="secondary" style={{ marginBottom: 16 }}>
              Все типы аналитик, доступные в системе (созданные через миграции или вручную).
            </Typography.Paragraph>
            <Table
              columns={[
                { title: 'Код', dataIndex: 'code', key: 'code', width: 200 },
                { title: 'Название', dataIndex: 'name', key: 'name' },
                {
                  title: 'Статус',
                  dataIndex: 'isActive',
                  key: 'isActive',
                  width: 100,
                  render: (active: boolean) => (
                    <Tag color={active ? 'green' : 'red'}>{active ? 'Активен' : 'Неактивен'}</Tag>
                  )
                }
              ]}
              dataSource={types}
              rowKey="id"
              pagination={{ pageSize: 20 }}
              size="small"
              loading={loading}
            />
          </Card>

          <Card size="small" title="Добавить/обновить значение аналитики (ручной ввод)">
            <Form layout="vertical" form={adminValueForm}>
              <Row gutter={12}>
                <Col xs={24} md={6}>
                  <Form.Item name="typeCode" label="TypeCode" rules={[{ required: true, message: 'Укажите typeCode' }]}>
                    <Input placeholder="COUNTERPARTY" />
                  </Form.Item>
                </Col>
                <Col xs={24} md={6}>
                  <Form.Item name="code" label="Код значения" rules={[{ required: true, message: 'Укажите code' }]}>
                    <Input placeholder="000123" />
                  </Form.Item>
                </Col>
                <Col xs={24} md={12}>
                  <Form.Item name="name" label="Название" rules={[{ required: true, message: 'Укажите name' }]}>
                    <Input placeholder="ООО Ромашка" />
                  </Form.Item>
                </Col>
              </Row>
              <Row gutter={12}>
                <Col xs={24} md={16}>
                  <Form.Item name="attrs" label="attrs (JSON, опц.)">
                    <Input.TextArea rows={3} placeholder='{"inn":"7700000000"}' />
                  </Form.Item>
                </Col>
                <Col xs={24} md={8}>
                  <Form.Item name="isActive" label="Активен? (true/false)" initialValue="true">
                    <Input />
                  </Form.Item>
                </Col>
              </Row>
              <Button onClick={async () => {
                try {
                  const v = await adminValueForm.validateFields();
                  await api.analytics.adminUpsertValue({
                    typeCode: v.typeCode,
                    code: v.code,
                    name: v.name,
                    attrs: v.attrs ? JSON.parse(v.attrs) : undefined,
                    isActive: v.isActive !== 'false'
                  });
                  message.success('Значение сохранено (событие создано)');
                  adminValueForm.resetFields();
                } catch (e: any) {
                  if (e?.errorFields) return;
                  message.error(e?.message || 'Ошибка сохранения значения');
                }
              }} type="primary">
                Сохранить значение
              </Button>
            </Form>
          </Card>

          {/* Управление типами объектов учета (только для ecof_admin) */}
          <Card size="small" title="Типы объектов учета">
            <Space style={{ marginBottom: 16 }}>
              <Button type="primary" icon={<PlusOutlined />} onClick={handleCreateObjectType}>
                Создать тип
              </Button>
            </Space>
            <Table
              columns={objectTypeColumns}
              dataSource={objectTypes}
              rowKey="id"
              pagination={{ pageSize: 10 }}
              size="small"
              loading={loading}
            />
          </Card>

          <Card size="small" title="Список типов аналитик" loading={loading}>
            <Table<TypeRow>
              rowKey="id"
              dataSource={types}
              pagination={{ pageSize: 50 }}
              columns={[
                { title: 'Код', dataIndex: 'code', key: 'code' },
                { title: 'Название', dataIndex: 'name', key: 'name' },
                { title: 'Active', dataIndex: 'isActive', key: 'isActive', render: (v) => String(v) },
                { title: 'Direction', dataIndex: 'directionId', key: 'directionId', render: (v) => v || '—' }
              ]}
            />
          </Card>
        </Space>
      )
    }] : [])
  ];

  return (
    <div className="page">
      <Space direction="vertical" style={{ width: '100%' }} size="large">
        <Space style={{ width: '100%', justifyContent: 'space-between' }}>
          <Typography.Title level={3} style={{ margin: 0 }}>
            Аналитики и объекты учета
          </Typography.Title>
        </Space>
        <Typography.Text type="secondary">
          Организация: <b>{user?.organizationId || '—'}</b>
        </Typography.Text>

        <Tabs activeKey={activeTab} onChange={setActiveTab} items={tabsItems} />

        {/* Модальное окно создания/редактирования типа объекта учета */}
        <Modal
          title={editingObjectType ? 'Редактировать тип объекта учета' : 'Создать тип объекта учета'}
          open={objectTypeModalVisible}
          onOk={handleSubmitObjectType}
          onCancel={() => setObjectTypeModalVisible(false)}
          width={600}
        >
          <Form form={objectTypeForm} layout="vertical">
            <Form.Item
              name="code"
              label="Код"
              rules={[
                { required: true, message: 'Введите код' },
                {
                  pattern: /^[A-Z_][A-Z0-9_]*$/,
                  message: 'Код должен быть в формате UPPER_SNAKE_CASE'
                }
              ]}
            >
              <Input disabled={!!editingObjectType} placeholder="FIXED_ASSET" />
            </Form.Item>
            <Form.Item name="name" label="Наименование" rules={[{ required: true, message: 'Введите наименование' }]}>
              <Input placeholder="Основное средство" />
            </Form.Item>
            <Form.Item name="icon" label="Иконка">
              <Input placeholder="build" />
            </Form.Item>
            <Form.Item name="description" label="Описание">
              <TextArea rows={3} placeholder="Описание назначения объекта учета" />
            </Form.Item>
            <Form.Item name="isActive" label="Активен" valuePropName="checked" initialValue={true}>
              <Switch />
            </Form.Item>
          </Form>
        </Modal>

        {/* Модальное окно редактирования схемы полей типа объекта */}
        <Modal
          title="Схема полей типа объекта учета"
          open={schemaEditorVisible}
          onCancel={() => {
            setSchemaEditorVisible(false);
            setSchemaEditorTypeId(null);
          }}
          footer={null}
          width={900}
        >
          {schemaEditorTypeId && (
            <ObjectTypeSchemaEditor
              typeId={schemaEditorTypeId}
              onSchemaChange={() => {
                if (selectedObjectTypeCode) {
                  loadObjectCards(selectedObjectTypeCode);
                }
              }}
            />
          )}
        </Modal>

        {/* Модальное окно: создание объекта и добавление аналитик */}
        <Modal
          title="Создать объект учета"
          open={objectCardModalVisible}
          onOk={handleSubmitObjectCard}
          onCancel={() => {
            setObjectCardModalVisible(false);
            objectCardForm.resetFields();
            setObjectCardSchemas([]);
          }}
          width={800}
          okText="Создать"
          cancelText="Отмена"
        >
          <Form form={objectCardForm} layout="vertical">
            <Form.Item name="typeId" hidden>
              <Input />
            </Form.Item>

            {/* 1. Объект */}
            <Typography.Title level={5} style={{ marginTop: 0, marginBottom: 12 }}>
              1. Объект
            </Typography.Title>
            <Typography.Paragraph type="secondary" style={{ marginTop: 0, marginBottom: 12 }}>
              Укажите код и наименование объекта учета.
            </Typography.Paragraph>
            <Form.Item name="code" label="Код" rules={[{ required: true, message: 'Введите код' }]}>
              <Input placeholder="0005" />
            </Form.Item>
            <Form.Item name="name" label="Наименование" rules={[{ required: true, message: 'Введите наименование' }]}>
              <Input placeholder="Легковой автомобиль Toyota Camry для отдела продаж" />
            </Form.Item>
            <Form.Item name="status" label="Статус" initialValue="Active">
              <Select>
                <Select.Option value="Active">Активен</Select.Option>
                <Select.Option value="Inactive">Неактивен</Select.Option>
                <Select.Option value="Archived">Архив</Select.Option>
              </Select>
            </Form.Item>

            {/* 2. Добавление аналитик */}
            {objectCardSchemas.length > 0 && (
              <>
                <Typography.Title level={5} style={{ marginTop: 24, marginBottom: 8 }}>
                  2. Добавление аналитик
                </Typography.Title>
                <Typography.Paragraph type="secondary" style={{ marginTop: 0, marginBottom: 12 }}>
                  Заполните аналитические признаки объекта (характеристики, суммы, даты и т.д.).
                </Typography.Paragraph>
                {Object.entries(
                  objectCardSchemas.reduce((acc, field) => {
                    const group = field.fieldGroup || 'Прочее';
                    if (!acc[group]) acc[group] = [];
                    acc[group].push(field);
                    return acc;
                  }, {} as Record<string, typeof objectCardSchemas>)
                )
                  .sort(([a], [b]) => {
                    // Сортируем группы: Основное первым
                    if (a === 'Основное') return -1;
                    if (b === 'Основное') return 1;
                    return a.localeCompare(b);
                  })
                  .map(([group, fields]) => (
                    <div key={group}>
                      <Typography.Title level={5} style={{ marginTop: 16, marginBottom: 8 }}>
                        {group}
                      </Typography.Title>
                      {fields
                        .sort((a, b) => a.displayOrder - b.displayOrder)
                        .map((field) => {
                          const rules = field.isRequired
                            ? [{ required: true, message: `Поле "${field.label}" обязательно` }]
                            : undefined;

                          switch (field.dataType) {
                            case 'string':
                              return (
                                <Form.Item key={field.fieldKey} label={field.label} name={field.fieldKey} rules={rules}>
                                  <Input placeholder={field.label} />
                                </Form.Item>
                              );
                            case 'number':
                              return (
                                <Form.Item key={field.fieldKey} label={field.label} name={field.fieldKey} rules={rules}>
                                  <InputNumber style={{ width: '100%' }} placeholder={field.label} />
                                </Form.Item>
                              );
                            case 'money':
                              return (
                                <Form.Item key={field.fieldKey} label={field.label} name={field.fieldKey} rules={rules}>
                                  <InputNumber style={{ width: '100%' }} precision={2} placeholder={field.label} />
                                </Form.Item>
                              );
                            case 'date':
                              return (
                                <Form.Item key={field.fieldKey} label={field.label} name={field.fieldKey} rules={rules}>
                                  <DatePicker style={{ width: '100%' }} format="DD.MM.YYYY" />
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
                                  <Switch />
                                </Form.Item>
                              );
                            case 'enum':
                              return (
                                <Form.Item key={field.fieldKey} label={field.label} name={field.fieldKey} rules={rules}>
                                  <Select placeholder={field.label}>
                                    {field.enumValues?.map((val) => (
                                      <Select.Option key={val} value={val}>
                                        {val}
                                      </Select.Option>
                                    ))}
                                  </Select>
                                </Form.Item>
                              );
                            case 'reference':
                              // Для reference полей пока используем простой Input
                              // В будущем можно использовать ObjectCardSelect
                              return (
                                <Form.Item key={field.fieldKey} label={field.label} name={field.fieldKey} rules={rules}>
                                  <Input placeholder={`UUID ${field.label}`} />
                                </Form.Item>
                              );
                            default:
                              return (
                                <Form.Item key={field.fieldKey} label={field.label} name={field.fieldKey} rules={rules}>
                                  <Input placeholder={field.label} />
                                </Form.Item>
                              );
                          }
                        })}
                    </div>
                  ))}
              </>
            )}
          </Form>
        </Modal>
      </Space>
    </div>
  );
}
