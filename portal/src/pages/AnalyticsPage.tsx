import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Card,
  Checkbox,
  Col,
  List,
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

/** Типы объектов, для которых можно заполнить данные из справочника НСИ (Организации, Контрагенты, Договоры, Счета, Склады, Номенклатура, План счетов, Подразделения) */
const OBJECT_TYPE_REFERENCE: Record<string, { label: string; load: (search?: string) => Promise<Array<{ id: string; code?: string | null; name: string; [k: string]: unknown }>> }> = {
  ORG: { label: 'Организации', load: (search) => api.nsi.organizations(search).then((r) => r.data || []) },
  ITEM: { label: 'Номенклатура', load: (search) => api.nsi.nomenclature(search).then((r) => r.data || []) },
  NOMENCLATURE: { label: 'Номенклатура', load: (search) => api.nsi.nomenclature(search).then((r) => r.data || []) },
  COUNTERPARTY: { label: 'Контрагенты', load: (search) => api.nsi.counterparties(search).then((r) => r.data || []) },
  CONTRACT: { label: 'Договоры', load: () => api.nsi.contracts(undefined, undefined).then((r) => r.data || []) },
  BANK_ACCOUNT: { label: 'Счета', load: () => api.nsi.accounts(undefined, undefined).then((r) => r.data || []) },
  WAREHOUSE: { label: 'Склады', load: (search) => api.nsi.warehouses(undefined, search).then((r) => r.data || []) },
  ACCOUNTING_ACCOUNT: { label: 'План счетов', load: (search) => api.nsi.accountingAccounts(search).then((r) => r.data || []) },
  DEPARTMENT: { label: 'Подразделения', load: (search) => api.nsi.departments(undefined, search).then((r) => r.data || []) },
  ACCOUNT: { label: 'Счета (банк/касса)', load: () => api.nsi.accounts(undefined, undefined).then((r) => r.data || []) }
};

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
  const [objectCards, setObjectCards] = useState<ObjectCard[]>([]);
  const [objectCardsLoading, setObjectCardsLoading] = useState(false);
  const [selectedObjectTypeCode, setSelectedObjectTypeCode] = useState<string | null>(null);
  const [objectTypeModalVisible, setObjectTypeModalVisible] = useState(false);
  const [objectCardModalVisible, setObjectCardModalVisible] = useState(false);
  const [objectTypeForm] = Form.useForm();
  const [objectCardForm] = Form.useForm();
  const [referenceItems, setReferenceItems] = useState<Array<{ id: string; code?: string | null; name: string; [k: string]: unknown }>>([]);
  const [referenceLoading, setReferenceLoading] = useState(false);
  const [editingObjectType, setEditingObjectType] = useState<ObjectType | null>(null);
  const [savingObjectTypeId, setSavingObjectTypeId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string>('analytics');
  const [schemaEditorVisible, setSchemaEditorVisible] = useState(false);
  const [schemaEditorTypeId, setSchemaEditorTypeId] = useState<string | null>(null);
  /** Схема полей выбранного типа объекта — для отображения аналитик по объектам в таблице */
  const [objectTypeSchemaForList, setObjectTypeSchemaForList] = useState<Array<{ fieldKey: string; label: string; fieldGroup: string; dataType: string }>>([]);

  // Администрирование аналитик (для ecof_admin)
  const [adminCreateForm] = Form.useForm();
  const [adminValueForm] = Form.useForm();
  const [webhookForm] = Form.useForm();
  const [webhookLoading, setWebhookLoading] = useState(false);
  const [webhookInfo, setWebhookInfo] = useState<any | null>(null);

  const enabledSet = useMemo(() => new Set(subs.filter((s) => s.isEnabled).map((s) => s.typeId)), [subs]);
  const enabledCodeSet = useMemo(
    () => new Set(subs.filter((s) => s.isEnabled).map((s) => String(s.typeCode || '').toUpperCase())),
    [subs]
  );
  
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
      return objectTypes.filter((t) => t.isActive && enabledCodeSet.has(String(t.code || '').toUpperCase()));
    }
  }, [objectTypes, enabledCodeSet, isOrgAdmin]);

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

  const loadWebhook = async () => {
    if (!isOrgAdmin) return;
    setWebhookLoading(true);
    try {
      const res = await api.analytics.getWebhook();
      setWebhookInfo(res.data || null);
      webhookForm.setFieldsValue({
        url: res.data?.url || '',
        secret: '',
        isActive: res.data?.isActive ?? true,
      });
    } catch (e: any) {
      // не блокируем страницу
      setWebhookInfo(null);
    } finally {
      setWebhookLoading(false);
    }
  };

  const loadObjectTypes = async () => {
    try {
      const [tRes] = await Promise.all([
        api.objects.types.list({ activeOnly: false }),
      ]);
      setObjectTypes(tRes.data || []);
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
      await loadWebhook();
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
      const type = objectTypes.find((t) => t.code === selectedObjectTypeCode);
      if (type) {
        api.objects.types.getSchemas(type.id).then((r) => {
          const list = (r.data || []).map((f: any) => ({
            fieldKey: f.fieldKey,
            label: f.label,
            fieldGroup: f.fieldGroup || 'Прочее',
            dataType: f.dataType || 'string'
          }));
          setObjectTypeSchemaForList(list);
        }).catch(() => setObjectTypeSchemaForList([]));
      } else {
        setObjectTypeSchemaForList([]);
      }
    } else {
      setObjectTypeSchemaForList([]);
    }
  }, [selectedObjectTypeCode, activeTab, objectTypes]);

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

  // Подписка на тип объекта учета = подписка на аналитику с тем же code (вариант B)
  const toggleObjectSubscription = async (objectTypeCode: string, isEnabled: boolean) => {
    try {
      setSavingObjectTypeId(objectTypeCode);
      const at = types.find((t) => String(t.code || '').toUpperCase() === String(objectTypeCode || '').toUpperCase());
      if (!at) {
        message.error(`Не найден тип аналитики для кода ${objectTypeCode}. Примените миграцию seed analytics_types из object_types.`);
        return;
      }
      await api.analytics.setSubscription({ typeId: at.id, isEnabled });
      const sRes = await api.analytics.listSubscriptions();
      setSubs(sRes.data || []);
      await refreshAccess();
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
      // Загружаем справочник для заполнения аналитики из НСИ
      const refConfig = selectedObjectTypeCode ? OBJECT_TYPE_REFERENCE[selectedObjectTypeCode] : null;
      if (refConfig) {
        setReferenceLoading(true);
        try {
          const items = await refConfig.load();
          setReferenceItems(Array.isArray(items) ? items : []);
        } catch {
          setReferenceItems([]);
        } finally {
          setReferenceLoading(false);
        }
      } else {
        setReferenceItems([]);
      }
    } catch (e: any) {
      message.error('Ошибка загрузки схемы полей: ' + (e.message || 'Неизвестная ошибка'));
    }
  };

  const fillFormFromReference = (item: { id: string; code?: string | null; name: string; [k: string]: unknown }) => {
    if (!selectedObjectTypeCode) return;
    const code = item.code ?? item.id;
    const name = item.name ?? '';
    const attrs: Record<string, unknown> = {};
    if (item.data && typeof item.data === 'object' && !Array.isArray(item.data)) {
      Object.assign(attrs, item.data as Record<string, unknown>);
    }
    if (item.inn != null) attrs.inn = item.inn;
    if (item.organizationId != null) attrs.organizationId = item.organizationId;
    if (item.counterpartyId != null) attrs.counterpartyId = item.counterpartyId;
    const currentValues = objectCardForm.getFieldsValue();
    objectCardForm.setFieldsValue({
      ...currentValues,
      code: code ?? currentValues.code,
      name: name || currentValues.name,
      ...attrs
    });
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

  const FIELD_KEY_LABELS: Record<string, string> = {
    monthlyAmortNU: 'Амортизация/мес (НУ)',
    amortMethodNU: 'Метод амортизации (НУ)',
    usefulLifeMonthsNU: 'СПИ (НУ), мес.',
    techSpecs: 'Технические характеристики',
    insurance: 'Страхование',
    history: 'История движения',
    maintenanceSchedule: 'График ТО',
    description: 'Описание',
    note: 'Примечание',
    bik: 'БИК'
  };

  const formatAttrValue = (value: unknown, dataType?: string, fieldKey?: string): string => {
    if (value === null || value === undefined) return '—';
    if (dataType === 'date' && typeof value === 'string') return dayjs(value).format('DD.MM.YYYY');
    if (typeof value === 'number') return value.toLocaleString('ru-RU');
    if (typeof value === 'boolean') return value ? 'Да' : 'Нет';
    if (typeof value === 'string') {
      const lower = value.toLowerCase();
      if (lower === 'linear') return 'Линейный';
      if (lower === 'good') return 'Хорошее';
      if (lower === 'active') return 'Активен';
      if (lower === 'inactive') return 'Неактивен';
      return value;
    }
    if (typeof value === 'object') {
      if (Array.isArray(value)) {
        const items = value as Array<{ date?: string; event?: string; document?: string }>;
        if (items.length && typeof items[0] === 'object' && items[0] !== null && 'event' in items[0]) {
          return items
            .map((it) => {
              const d = it.date ? dayjs(it.date).format('DD.MM.YYYY') : '';
              const ev = it.event || '';
              const doc = it.document ? ` (${it.document})` : '';
              return d ? `${d} — ${ev}${doc}` : ev;
            })
            .join('; ');
        }
        return items.map((it) => (typeof it === 'object' ? JSON.stringify(it) : String(it))).join('; ');
      }
      const obj = value as Record<string, unknown>;
      if (fieldKey === 'insurance' && obj.osago && obj.casco) {
        const osago = obj.osago as { number?: string; validUntil?: string };
        const casco = obj.casco as { number?: string; validUntil?: string };
        const parts: string[] = [];
        if (osago?.number || osago?.validUntil) parts.push(`ОСАГО: ${osago.number || '—'} до ${osago.validUntil ? dayjs(osago.validUntil).format('DD.MM.YYYY') : '—'}`);
        if (casco?.number || casco?.validUntil) parts.push(`КАСКО: ${casco.number || '—'} до ${casco.validUntil ? dayjs(casco.validUntil).format('DD.MM.YYYY') : '—'}`);
        return parts.join('; ') || '—';
      }
      if (fieldKey === 'techSpecs' || (obj.model !== undefined && obj.engineVolume !== undefined)) {
        const model = obj.model as string | undefined;
        const engineVolume = obj.engineVolume as string | undefined;
        const year = obj.year as number | undefined;
        const color = obj.color as string | undefined;
        const licensePlate = obj.licensePlate as string | undefined;
        const parts: string[] = [];
        if (model) parts.push(`модель ${model}`);
        if (engineVolume) parts.push(engineVolume);
        if (year) parts.push(`${year} г.`);
        if (color) parts.push(`цвет ${color}`);
        if (licensePlate) parts.push(`гос. номер ${licensePlate}`);
        return parts.length ? parts.join(', ') : '—';
      }
      if (fieldKey === 'maintenanceSchedule' || (obj.nextMaintenance !== undefined && obj.nextMaintenanceMileage !== undefined)) {
        const next = obj.nextMaintenance as string | undefined;
        const mileage = obj.nextMaintenanceMileage as number | undefined;
        if (next && mileage != null) return `Следующее ТО: ${dayjs(next).format('DD.MM.YYYY')} (пробег ${mileage.toLocaleString('ru-RU')} км)`;
        if (next) return `Следующее ТО: ${dayjs(next).format('DD.MM.YYYY')}`;
        return '—';
      }
      return Object.entries(obj)
        .map(([k, v]) => `${k}: ${typeof v === 'object' && v !== null ? JSON.stringify(v) : v}`)
        .join('; ');
    }
    return String(value);
  };

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

  const expandableRowRender = (record: ObjectCard) => {
    const attrs = record.attrs || {};
    const schemaMap = new Map(objectTypeSchemaForList.map((s) => [s.fieldKey, s]));
    const byGroup: Record<string, Array<{ label: string; value: unknown; dataType: string; fieldKey: string }>> = {};
    Object.entries(attrs).forEach(([key, value]) => {
      if (value === null || value === undefined || value === '') return;
      const s = schemaMap.get(key);
      const g = s ? (s.fieldGroup || 'Прочее') : 'Прочее';
      if (!byGroup[g]) byGroup[g] = [];
      const label = s ? s.label : (FIELD_KEY_LABELS[key] || key);
      byGroup[g].push({
        label,
        value,
        dataType: s ? s.dataType : 'string',
        fieldKey: key
      });
    });

    const groups = Object.entries(byGroup).sort(([a], [b]) => a.localeCompare(b));
    if (groups.length === 0) {
      return (
        <Typography.Paragraph type="secondary" style={{ margin: 12 }}>
          Аналитические признаки не заполнены. Откройте карточку объекта для редактирования.
        </Typography.Paragraph>
      );
    }
    return (
      <div style={{ padding: '12px 24px' }}>
        <Typography.Text strong style={{ marginBottom: 8, display: 'block' }}>
          Аналитики по объекту
        </Typography.Text>
        {groups.map(([group, items]) => (
          <Card key={group} size="small" title={group} style={{ marginBottom: 12 }}>
            <Row gutter={[16, 8]}>
              {items.map(({ label, value, dataType, fieldKey }) => (
                <Col key={fieldKey} xs={24} sm={12} md={8} lg={6}>
                  <Typography.Text type="secondary">{label}:</Typography.Text>{' '}
                  <Typography.Text>{formatAttrValue(value, dataType, fieldKey)}</Typography.Text>
                </Col>
              ))}
            </Row>
          </Card>
        ))}
      </div>
    );
  };

  const tabsItems: TabsProps['items'] = [
    {
      key: 'analytics',
      label: 'Аналитики',
      children: (
        <Space direction="vertical" style={{ width: '100%' }} size="large">
          <Card size="small" title="Подписки на виды аналитик" loading={loading}>
            <Typography.Paragraph type="secondary" style={{ marginTop: 0, marginBottom: 16 }}>
              {isOrgAdmin
                ? 'Включите аналитики, которые организация будет использовать в документах и объектах учета.'
                : 'Аналитики, на которые подписана ваша организация.'}
            </Typography.Paragraph>
            {loading ? (
              <Typography.Paragraph type="secondary" style={{ textAlign: 'center', padding: 24 }}>Загрузка...</Typography.Paragraph>
            ) : displayedTypes.length === 0 ? (
              <Typography.Paragraph type="secondary" style={{ textAlign: 'center', padding: 24 }}>
                {isOrgAdmin ? 'Нет доступных аналитик. Добавьте тип во вкладке «Администрирование».' : 'Нет подписок. Обратитесь к администратору организации.'}
              </Typography.Paragraph>
            ) : (
              <List
                size="small"
                dataSource={displayedTypes}
                renderItem={(t) => (
                  <List.Item
                    extra={!isOrgAdmin && enabledSet.has(t.id) ? <Tag color="green">Подписана</Tag> : null}
                  >
                    <Checkbox
                      checked={enabledSet.has(t.id)}
                      disabled={!isOrgAdmin || savingTypeId === t.id}
                      onChange={(e) => toggleSubscription(t.id, e.target.checked)}
                    >
                      <Space size={4}>
                        <Typography.Text strong>{t.name}</Typography.Text>
                        <Typography.Text type="secondary" style={{ fontSize: 12 }}>({t.code})</Typography.Text>
                      </Space>
                    </Checkbox>
                  </List.Item>
                )}
              />
            )}
          </Card>

          {isOrgAdmin && (
            <Card size="small" title="Webhook для доставки аналитик" loading={webhookLoading}>
              <Typography.Paragraph type="secondary" style={{ marginTop: 0 }}>
                Настройте URL и секрет для получения событий (Upsert/Deactivate/Snapshot) по подписанным аналитикам.
              </Typography.Paragraph>
              <Form layout="vertical" form={webhookForm}>
                <Row gutter={12}>
                  <Col xs={24} md={16}>
                    <Form.Item name="url" label="URL" rules={[{ required: true, message: 'Укажите URL' }]}>
                      <Input placeholder="https://example.com/ecof/webhook" />
                    </Form.Item>
                  </Col>
                  <Col xs={24} md={8}>
                    <Form.Item name="isActive" label="Активен" initialValue={true}>
                      <Select>
                        <Select.Option value={true}>Да</Select.Option>
                        <Select.Option value={false}>Нет</Select.Option>
                      </Select>
                    </Form.Item>
                  </Col>
                </Row>
                <Row gutter={12}>
                  <Col xs={24} md={16}>
                    <Form.Item
                      name="secret"
                      label="Secret (HMAC)"
                      tooltip="Секрет используется для подписи x-ecof-signature. При сохранении обязателен."
                    >
                      <Input.Password placeholder="Минимум 8 символов" />
                    </Form.Item>
                  </Col>
                  <Col xs={24} md={8} style={{ display: 'flex', alignItems: 'flex-end', gap: 8 }}>
                    <Button
                      type="primary"
                      onClick={async () => {
                        try {
                          const v = await webhookForm.validateFields();
                          if (!v.secret || String(v.secret).length < 8) {
                            message.error('Укажите secret (минимум 8 символов)');
                            return;
                          }
                          await api.analytics.upsertWebhook({ url: v.url, secret: v.secret, isActive: v.isActive });
                          message.success('Webhook сохранён');
                          webhookForm.setFieldValue('secret', '');
                          await loadWebhook();
                        } catch (e: any) {
                          if (e?.errorFields) return;
                          message.error(e?.message || 'Ошибка сохранения webhook');
                        }
                      }}
                    >
                      Сохранить
                    </Button>
                    <Button
                      onClick={async () => {
                        try {
                          await api.analytics.resync();
                          message.success('Ресинк запущен (Snapshot события будут отправлены в webhook)');
                        } catch (e: any) {
                          message.error(e?.message || 'Ошибка запуска ресинка');
                        }
                      }}
                    >
                      Ресинк
                    </Button>
                  </Col>
                </Row>

                {webhookInfo?.url && (
                  <Typography.Paragraph type="secondary" style={{ marginBottom: 0 }}>
                    Текущий webhook: <b>{webhookInfo.url}</b>{' '}
                    {webhookInfo.isActive ? <Tag color="green">активен</Tag> : <Tag>выключен</Tag>}
                  </Typography.Paragraph>
                )}
              </Form>
            </Card>
          )}
        </Space>
      )
    },
    {
      key: 'objects',
      label: 'Объекты учета',
      children: (
        <Space direction="vertical" style={{ width: '100%' }} size="large">
          <Card size="small" title="Шаг 1. Тип объекта учета">
            <Typography.Paragraph type="secondary" style={{ marginTop: 0, marginBottom: 16 }}>
              Включите подписку на нужный тип объекта — затем можно создавать объекты и заполнять аналитики.
            </Typography.Paragraph>
            {displayedObjectTypes.length === 0 ? (
              <Typography.Paragraph type="secondary" style={{ textAlign: 'center', padding: 24 }}>
                {isOrgAdmin ? 'Нет типов объектов. Создайте тип во вкладке «Администрирование».' : 'Нет подписок. Обратитесь к администратору организации.'}
              </Typography.Paragraph>
            ) : (
              <List
                size="small"
                dataSource={displayedObjectTypes}
                renderItem={(t) => (
                  <List.Item
                    extra={!isOrgAdmin && enabledCodeSet.has(String(t.code || '').toUpperCase()) ? <Tag color="green">Подписана</Tag> : null}
                  >
                    <Checkbox
                      checked={enabledCodeSet.has(String(t.code || '').toUpperCase())}
                      disabled={!isOrgAdmin || savingObjectTypeId === t.code}
                      onChange={(e) => toggleObjectSubscription(t.code, e.target.checked)}
                    >
                      <Space size={4}>
                        <Typography.Text strong>{t.name}</Typography.Text>
                        <Typography.Text type="secondary" style={{ fontSize: 12 }}>({t.code})</Typography.Text>
                      </Space>
                    </Checkbox>
                  </List.Item>
                )}
              />
            )}
          </Card>

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
            <Space wrap align="center" style={{ marginBottom: selectedObjectTypeCode ? 16 : 0 }}>
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
                  .filter((t) => enabledCodeSet.has(String(t.code || '').toUpperCase()))
                  .map((t) => ({ label: `${t.name} (${t.code})`, value: t.code }))}
                notFoundContent="Включите подписку в шаге 1"
              />
              {selectedObjectTypeCode && (
                <Input.Search
                  placeholder="Поиск..."
                  style={{ width: 240 }}
                  onSearch={(value) => selectedObjectTypeCode && loadObjectCards(selectedObjectTypeCode, value || undefined)}
                  allowClear
                />
              )}
            </Space>
            {!selectedObjectTypeCode && (
              <Typography.Paragraph type="secondary" style={{ marginBottom: 0 }}>Выберите тип объекта и нажмите «Создать объект» для добавления объекта и аналитик.</Typography.Paragraph>
            )}
          </Card>

          <Card size="small" title="Шаг 3. Созданные объекты">
            <Typography.Paragraph type="secondary" style={{ marginTop: 0, marginBottom: 16 }}>
              Раскройте строку (▶), чтобы увидеть аналитики по объекту. Нажмите на наименование для редактирования.
            </Typography.Paragraph>
            {selectedObjectTypeCode ? (
              objectCards.length > 0 ? (
                <Table
                  columns={objectCardColumns}
                  dataSource={objectCards}
                  rowKey="id"
                  loading={objectCardsLoading}
                  pagination={{ pageSize: 20 }}
                  size="small"
                  expandable={{
                    expandedRowRender: expandableRowRender,
                    rowExpandable: (record) => true
                  }}
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
              Новый тип появится во вкладке «Аналитики» для подписки организаций.
            </Typography.Paragraph>
            <Form layout="vertical" form={adminCreateForm}>
              <Row gutter={12}>
                <Col xs={24} md={6}>
                  <Form.Item name="code" label="Код" rules={[{ required: true, message: 'Укажите код' }]}>
                    <Input placeholder="COUNTERPARTY" />
                  </Form.Item>
                </Col>
                <Col xs={24} md={12}>
                  <Form.Item name="name" label="Название" rules={[{ required: true, message: 'Укажите название' }]}>
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

          <Card size="small" title="Добавить значение аналитики">
            <Form layout="vertical" form={adminValueForm}>
              <Row gutter={12}>
                <Col xs={24} md={6}>
                  <Form.Item name="typeCode" label="Код типа" rules={[{ required: true, message: 'Укажите код типа' }]}>
                    <Input placeholder="COUNTERPARTY" />
                  </Form.Item>
                </Col>
                <Col xs={24} md={6}>
                  <Form.Item name="code" label="Код значения" rules={[{ required: true, message: 'Укажите код' }]}>
                    <Input placeholder="000123" />
                  </Form.Item>
                </Col>
                <Col xs={24} md={12}>
                  <Form.Item name="name" label="Название" rules={[{ required: true, message: 'Укажите название' }]}>
                    <Input placeholder="ООО Ромашка" />
                  </Form.Item>
                </Col>
              </Row>
              <Row gutter={12}>
                <Col xs={24} md={16}>
                  <Form.Item name="attrs" label="Атрибуты (JSON, опц.)">
                    <Input.TextArea rows={2} placeholder='{"inn":"7700000000"}' />
                  </Form.Item>
                </Col>
                <Col xs={24} md={8}>
                  <Form.Item name="isActive" label="Активен" initialValue="true">
                    <Select>
                      <Select.Option value="true">Да</Select.Option>
                      <Select.Option value="false">Нет</Select.Option>
                    </Select>
                  </Form.Item>
                </Col>
              </Row>
              <Button type="primary" onClick={async () => {
                try {
                  const v = await adminValueForm.validateFields();
                  await api.analytics.adminUpsertValue({
                    typeCode: v.typeCode,
                    code: v.code,
                    name: v.name,
                    attrs: v.attrs ? JSON.parse(v.attrs) : undefined,
                    isActive: v.isActive !== 'false'
                  });
                  message.success('Значение сохранено');
                  adminValueForm.resetFields();
                } catch (e: any) {
                  if (e?.errorFields) return;
                  message.error(e?.message || 'Ошибка сохранения');
                }
              }}>
                Сохранить
              </Button>
            </Form>
          </Card>

          <Card size="small" title="Типы объектов учета">
            <Space style={{ marginBottom: 16 }}>
              <Button type="primary" icon={<PlusOutlined />} onClick={handleCreateObjectType}>
                Создать тип
              </Button>
            </Space>
            {objectTypes.length === 0 ? (
              <Typography.Paragraph type="secondary" style={{ padding: 24, textAlign: 'center' }}>Нет типов объектов. Создайте тип кнопкой выше.</Typography.Paragraph>
            ) : (
              <List
                size="small"
                dataSource={objectTypes}
                renderItem={(t) => (
                  <List.Item
                    extra={
                      isEcofAdmin ? (
                        <Button type="link" size="small" icon={<EditOutlined />} onClick={() => handleEditObjectType(t)}>
                          Редактировать
                        </Button>
                      ) : null
                    }
                  >
                    <Space>
                      <Typography.Text strong>{t.name}</Typography.Text>
                      <Typography.Text type="secondary">({t.code})</Typography.Text>
                      <Tag color={t.isActive ? 'green' : 'red'}>{t.isActive ? 'Активен' : 'Неактивен'}</Tag>
                    </Space>
                  </List.Item>
                )}
              />
            )}
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
            setReferenceItems([]);
          }}
          width={800}
          okText="Создать"
          cancelText="Отмена"
        >
          <Form form={objectCardForm} layout="vertical">
            <Form.Item name="typeId" hidden>
              <Input />
            </Form.Item>

            {/* Заполнить из справочника НСИ */}
            {selectedObjectTypeCode && OBJECT_TYPE_REFERENCE[selectedObjectTypeCode] && referenceItems.length >= 0 && (
              <Card size="small" title="Заполнить из справочника" style={{ marginBottom: 16 }}>
                <Typography.Paragraph type="secondary" style={{ marginTop: 0, marginBottom: 8 }}>
                  Выберите запись из справочника «{OBJECT_TYPE_REFERENCE[selectedObjectTypeCode].label}» — код, наименование и аналитики подставятся в форму.
                </Typography.Paragraph>
                <Select
                  placeholder={`Выберите из справочника ${OBJECT_TYPE_REFERENCE[selectedObjectTypeCode].label}`}
                  style={{ width: '100%' }}
                  loading={referenceLoading}
                  showSearch
                  filterOption={(input, option) =>
                    (option?.label ?? '').toString().toLowerCase().includes(input.toLowerCase())
                  }
                  options={referenceItems.map((it) => ({
                    value: it.id,
                    label: it.name + (it.code ? ` (${it.code})` : '')
                  }))}
                  allowClear
                  onSelect={(value) => {
                    const item = referenceItems.find((i) => i.id === value);
                    if (item) fillFormFromReference(item);
                  }}
                />
              </Card>
            )}

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
