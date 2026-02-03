import { useEffect, useMemo, useState } from 'react';
import {
  Card,
  Tabs,
  Typography,
  Space,
  Table,
  Button,
  Modal,
  Form,
  Input,
  Select,
  message,
  Popconfirm,
  Tag,
  Divider,
  Checkbox,
  Row,
  Col,
} from 'antd';
import type { TabsProps } from 'antd';
import { UserAddOutlined, DeleteOutlined, EditOutlined } from '@ant-design/icons';
import { api } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { useAnalyticsAccess } from '../contexts/AnalyticsAccessContext';

const { Option } = Select;

type OrganizationInfo = {
  id: string;
  code: string;
  name: string;
  inn: string | null;
  directionId: string | null;
  createdAt: string;
  updatedAt: string;
};

type Employee = {
  id: string;
  username: string;
  email: string | null;
  role: string;
  organizationId: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

type TypeRow = { id: string; code: string; name: string; directionId: string | null; isActive: boolean };
type SubRow = { typeId: string; typeCode: string; typeName: string; isEnabled: boolean };

export function OrganizationCabinetPage() {
  const { user } = useAuth();
  const { refresh: refreshAccess } = useAnalyticsAccess();
  const [orgInfo, setOrgInfo] = useState<OrganizationInfo | null>(null);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [employeesLoading, setEmployeesLoading] = useState(false);
  
  // Для добавления сотрудника
  const [addEmployeeModalVisible, setAddEmployeeModalVisible] = useState(false);
  const [addEmployeeForm] = Form.useForm();
  const [userSearchResults, setUserSearchResults] = useState<Array<{ id: string; username: string; email: string | null; role: string; organizationId: string | null }>>([]);
  const [searchingUsers, setSearchingUsers] = useState(false);
  
  // Для редактирования роли
  const [editRoleModalVisible, setEditRoleModalVisible] = useState(false);
  const [editRoleForm] = Form.useForm();
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  
  // Для аналитик
  const [types, setTypes] = useState<TypeRow[]>([]);
  const [subs, setSubs] = useState<SubRow[]>([]);
  const [savingTypeId, setSavingTypeId] = useState<string | null>(null);
  const [webhookForm] = Form.useForm();
  const [webhookLoading, setWebhookLoading] = useState(false);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [webhookData, setWebhookData] = useState<{ url?: string; secret?: string; isActive?: boolean } | null>(null);
  const [activeTab, setActiveTab] = useState<string>('employees');

  const enabledSet = useMemo(() => new Set(subs.filter((s) => s.isEnabled).map((s) => s.typeId)), [subs]);

  // Загрузка информации об организации
  const loadOrganization = async () => {
    try {
      setLoading(true);
      const res = await api.organization.getMyOrganization();
      setOrgInfo(res.data);
    } catch (e: any) {
      message.error(e?.message || 'Ошибка загрузки информации об организации');
    } finally {
      setLoading(false);
    }
  };

  // Загрузка сотрудников
  const loadEmployees = async () => {
    try {
      setEmployeesLoading(true);
      const res = await api.organization.getEmployees();
      setEmployees(res.data);
    } catch (e: any) {
      message.error(e?.message || 'Ошибка загрузки сотрудников');
    } finally {
      setEmployeesLoading(false);
    }
  };

  // Загрузка аналитик
  const loadAnalytics = async () => {
    try {
      setAnalyticsLoading(true);
      const [tRes, sRes, wRes] = await Promise.all([
        api.analytics.listTypes(),
        api.analytics.listSubscriptions(),
        api.analytics.getWebhook()
      ]);
      setTypes(tRes.data || []);
      setSubs(sRes.data || []);

      // Сохраняем данные webhook в состоянии вместо установки в форму сразу
      if (wRes.data) {
        setWebhookData({
          url: wRes.data.url,
          secret: '',
          isActive: wRes.data.isActive
        });
      } else {
        setWebhookData({ url: '', secret: '', isActive: true });
      }
    } catch (e: any) {
      message.error(e?.message || 'Ошибка загрузки аналитик');
    } finally {
      setAnalyticsLoading(false);
    }
  };

  // Устанавливаем значения формы когда вкладка аналитик становится активной
  useEffect(() => {
    if (activeTab === 'analytics' && webhookData) {
      // Используем setTimeout чтобы форма успела смонтироваться
      setTimeout(() => {
        webhookForm.setFieldsValue(webhookData);
      }, 0);
    }
  }, [activeTab, webhookData, webhookForm]);

  useEffect(() => {
    loadOrganization();
    loadEmployees();
    loadAnalytics();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Поиск пользователей для добавления
  const handleUserSearch = async (value: string) => {
    if (!value || value.length < 2) {
      setUserSearchResults([]);
      return;
    }
    try {
      setSearchingUsers(true);
      const res = await api.organization.searchUsers(value);
      setUserSearchResults(res.data);
    } catch (e: any) {
      message.error(e?.message || 'Ошибка поиска пользователей');
    } finally {
      setSearchingUsers(false);
    }
  };

  // Добавление сотрудника
  const handleAddEmployee = async () => {
    try {
      const values = await addEmployeeForm.validateFields();
      await api.organization.assignEmployee({ userId: values.userId });
      message.success('Сотрудник добавлен в организацию');
      setAddEmployeeModalVisible(false);
      addEmployeeForm.resetFields();
      setUserSearchResults([]);
      await loadEmployees();
    } catch (e: any) {
      if (e?.errorFields) return;
      message.error(e?.message || 'Ошибка добавления сотрудника');
    }
  };

  // Открытие модального окна редактирования роли
  const handleEditRole = (employee: Employee) => {
    setEditingEmployee(employee);
    editRoleForm.setFieldsValue({ role: employee.role });
    setEditRoleModalVisible(true);
  };

  // Сохранение роли
  const handleSaveRole = async () => {
    if (!editingEmployee) return;
    try {
      const values = await editRoleForm.validateFields();
      await api.organization.updateEmployeeRole(editingEmployee.id, { role: values.role });
      message.success('Роль обновлена');
      setEditRoleModalVisible(false);
      editRoleForm.resetFields();
      setEditingEmployee(null);
      await loadEmployees();
    } catch (e: any) {
      if (e?.errorFields) return;
      message.error(e?.message || 'Ошибка обновления роли');
    }
  };

  // Отвязка сотрудника
  const handleUnassignEmployee = async (employeeId: string) => {
    try {
      await api.organization.unassignEmployee(employeeId);
      message.success('Сотрудник отвязан от организации');
      await loadEmployees();
    } catch (e: any) {
      message.error(e?.message || 'Ошибка отвязки сотрудника');
    }
  };

  // Управление подписками на аналитики
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

  // Сохранение webhook
  const saveWebhook = async () => {
    try {
      const values = await webhookForm.validateFields();
      setWebhookLoading(true);
      await api.analytics.upsertWebhook(values);
      message.success('Webhook сохранён. Запущен ресинк подписанных аналитик.');
      await api.analytics.resync();
    } catch (e: any) {
      if (e?.errorFields) return;
      message.error(e?.message || 'Ошибка сохранения webhook');
    } finally {
      setWebhookLoading(false);
    }
  };

  // Ресинк аналитик
  const resync = async () => {
    try {
      setWebhookLoading(true);
      const r = await api.analytics.resync();
      message.success(`Ресинк поставлен в очередь: ${r.data.created}`);
    } catch (e: any) {
      message.error(e?.message || 'Ошибка ресинка');
    } finally {
      setWebhookLoading(false);
    }
  };

  const getRoleTag = (role: string) => {
    const colors: Record<string, string> = {
      ecof_admin: 'red',
      admin: 'red',
      ecof_user: 'blue',
      company_user: 'green',
      user: 'default',
    };
    const labels: Record<string, string> = {
      ecof_admin: 'Админ ЕЦОФ',
      admin: 'Админ',
      ecof_user: 'Пользователь ЕЦОФ',
      company_user: 'Пользователь компании',
      user: 'Пользователь',
    };
    return <Tag color={colors[role] || 'default'}>{labels[role] || role}</Tag>;
  };

  const employeeColumns = [
    {
      title: 'Имя пользователя',
      dataIndex: 'username',
      key: 'username',
    },
    {
      title: 'Email',
      dataIndex: 'email',
      key: 'email',
      render: (email: string | null) => email || '—',
    },
    {
      title: 'Роль',
      dataIndex: 'role',
      key: 'role',
      render: (role: string) => getRoleTag(role),
    },
    {
      title: 'Статус',
      dataIndex: 'isActive',
      key: 'isActive',
      render: (isActive: boolean) => (
        <Tag color={isActive ? 'green' : 'red'}>{isActive ? 'Активен' : 'Неактивен'}</Tag>
      ),
    },
    {
      title: 'Действия',
      key: 'actions',
      render: (_: any, record: Employee) => (
        <Space>
          <Button
            type="link"
            icon={<EditOutlined />}
            onClick={() => handleEditRole(record)}
            disabled={['ecof_admin', 'admin'].includes(record.role)}
          >
            Изменить роль
          </Button>
          <Popconfirm
            title="Отвязать сотрудника от организации?"
            onConfirm={() => handleUnassignEmployee(record.id)}
            okText="Да"
            cancelText="Нет"
            disabled={['ecof_admin', 'admin'].includes(record.role)}
          >
            <Button
              type="link"
              danger
              icon={<DeleteOutlined />}
              disabled={['ecof_admin', 'admin'].includes(record.role)}
            >
              Отвязать
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div className="page">
      <Space direction="vertical" style={{ width: '100%' }} size={16}>
        <Typography.Title level={2} style={{ margin: 0 }}>
          Личный кабинет организации
        </Typography.Title>

        <Card loading={loading}>
          {orgInfo && (
            <Space direction="vertical" size={8}>
              <Typography.Text strong>Код:</Typography.Text>
              <Typography.Text>{orgInfo.code}</Typography.Text>
              <Typography.Text strong>Наименование:</Typography.Text>
              <Typography.Text>{orgInfo.name}</Typography.Text>
              {orgInfo.inn && (
                <>
                  <Typography.Text strong>ИНН:</Typography.Text>
                  <Typography.Text>{orgInfo.inn}</Typography.Text>
                </>
              )}
            </Space>
          )}
        </Card>

        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          items={[
            {
              key: 'employees',
              label: 'Сотрудники',
              children: (
                <Card
                  title="Сотрудники организации"
                  extra={
                    <Button
                      type="primary"
                      icon={<UserAddOutlined />}
                      onClick={() => setAddEmployeeModalVisible(true)}
                    >
                      Добавить сотрудника
                    </Button>
                  }
                  loading={employeesLoading}
                >
                  <Table
                    columns={employeeColumns}
                    dataSource={employees}
                    rowKey="id"
                    pagination={{ pageSize: 20 }}
                  />
                </Card>
              ),
            },
            {
              key: 'analytics',
              label: 'Настройки аналитик',
              children: (
                <Space direction="vertical" style={{ width: '100%' }} size={16}>
                  <Card size="small" title="Webhook для доставки аналитик (push)" loading={analyticsLoading}>
                    <Form form={webhookForm} layout="vertical">
                      <Row gutter={12}>
                        <Col xs={24} md={14}>
                          <Form.Item
                            name="url"
                            label="URL получателя"
                            rules={[{ required: true, message: 'Укажите URL' }]}
                          >
                            <Input placeholder="https://accounting дочерней компании /webhooks/ecof-analytics" />
                          </Form.Item>
                        </Col>
                        <Col xs={24} md={10}>
                          <Form.Item
                            name="secret"
                            label="Секрет (для подписи HMAC SHA-256)"
                            rules={[{ required: true, message: 'Укажите secret (минимум 8 символов)' }]}
                          >
                            <Input.Password placeholder="********" />
                          </Form.Item>
                        </Col>
                      </Row>
                      <Space wrap>
                        <Button type="primary" onClick={saveWebhook} loading={webhookLoading}>
                          Сохранить webhook
                        </Button>
                        <Button onClick={resync} loading={webhookLoading}>
                          Ресинк подписок
                        </Button>
                        <Tag>Подпись: заголовок `x-ecof-signature`</Tag>
                      </Space>
                    </Form>
                  </Card>

                  <Card size="small" title="Подписки на виды аналитик" loading={analyticsLoading}>
                    <Typography.Paragraph type="secondary" style={{ marginTop: 0 }}>
                      Включите только те аналитики, которые ваша организация будет получать и использовать в документах на портале.
                    </Typography.Paragraph>

                    <Divider style={{ margin: '12px 0' }} />

                    <Row gutter={[12, 12]}>
                      {types
                        .filter((t) => t.isActive)
                        .map((t) => (
                          <Col key={t.id} xs={24} md={12} lg={8}>
                            <Card size="small">
                              <Space direction="vertical">
                                <Checkbox
                                  checked={enabledSet.has(t.id)}
                                  disabled={savingTypeId === t.id}
                                  onChange={(e) => toggleSubscription(t.id, e.target.checked)}
                                >
                                  <b>{t.name}</b>
                                </Checkbox>
                                <Typography.Text type="secondary">Код: {t.code}</Typography.Text>
                              </Space>
                            </Card>
                          </Col>
                        ))}
                    </Row>
                  </Card>
                </Space>
              ),
            },
          ]}
        />
      </Space>

      {/* Модальное окно добавления сотрудника */}
      <Modal
        title="Добавить сотрудника"
        open={addEmployeeModalVisible}
        onOk={handleAddEmployee}
        onCancel={() => {
          setAddEmployeeModalVisible(false);
          addEmployeeForm.resetFields();
          setUserSearchResults([]);
        }}
        okText="Добавить"
        cancelText="Отмена"
      >
        <Form form={addEmployeeForm} layout="vertical">
          <Form.Item
            name="userId"
            label="Пользователь"
            rules={[{ required: true, message: 'Выберите пользователя' }]}
          >
            <Select
              showSearch
              placeholder="Введите имя пользователя или email для поиска"
              loading={searchingUsers}
              onSearch={handleUserSearch}
              filterOption={false}
              notFoundContent={searchingUsers ? 'Поиск...' : 'Начните вводить для поиска'}
            >
              {userSearchResults.map((u) => (
                <Option key={u.id} value={u.id} disabled={!!u.organizationId}>
                  <div>
                    <div style={{ fontWeight: 500 }}>{u.username}</div>
                    {u.email && <div style={{ fontSize: '12px', color: '#999' }}>{u.email}</div>}
                    {u.organizationId && (
                      <div style={{ fontSize: '12px', color: '#ff4d4f' }}>
                        Уже привязан к другой организации
                      </div>
                    )}
                  </div>
                </Option>
              ))}
            </Select>
          </Form.Item>
        </Form>
      </Modal>

      {/* Модальное окно редактирования роли */}
      <Modal
        title="Изменить роль сотрудника"
        open={editRoleModalVisible}
        onOk={handleSaveRole}
        onCancel={() => {
          setEditRoleModalVisible(false);
          editRoleForm.resetFields();
          setEditingEmployee(null);
        }}
        okText="Сохранить"
        cancelText="Отмена"
      >
        {editingEmployee && (
          <div style={{ marginBottom: 16 }}>
            <Typography.Text strong>Пользователь:</Typography.Text> {editingEmployee.username}
            {editingEmployee.email && (
              <>
                <br />
                <Typography.Text strong>Email:</Typography.Text> {editingEmployee.email}
              </>
            )}
          </div>
        )}
        <Form form={editRoleForm} layout="vertical">
          <Form.Item
            name="role"
            label="Роль"
            rules={[{ required: true, message: 'Выберите роль' }]}
            extra={
              <div style={{ marginTop: 8, fontSize: '12px', color: '#666' }}>
                <div><strong>Пользователь</strong> — базовая роль с минимальными правами</div>
                <div><strong>Пользователь компании</strong> — работа в рамках своей организации</div>
                <div><strong>Пользователь ЕЦОФ</strong> — работа на уровне центрального портала</div>
              </div>
            }
          >
            <Select>
              <Option value="user">Пользователь</Option>
              <Option value="company_user">Пользователь компании</Option>
              <Option value="ecof_user">Пользователь ЕЦОФ</Option>
            </Select>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
