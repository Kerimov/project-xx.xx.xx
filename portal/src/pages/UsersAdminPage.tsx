import { useEffect, useState, useMemo } from 'react';
import {
  Card,
  Table,
  Button,
  Modal,
  Form,
  Input,
  Select,
  message,
  Popconfirm,
  Tag,
  Space,
  Typography,
  Row,
  Col,
  Switch,
} from 'antd';
import { UserAddOutlined, EditOutlined, DeleteOutlined, KeyOutlined } from '@ant-design/icons';
import { api } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

const { Option } = Select;

type User = {
  id: string;
  username: string;
  email: string | null;
  role: string;
  organizationId: string | null;
  organizationName: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

type Organization = {
  id: string;
  code: string;
  name: string;
  inn: string | null;
};

export function UsersAdminPage() {
  const { user } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [pagination, setPagination] = useState({ current: 1, pageSize: 20 });
  
  // Фильтры
  const [filters, setFilters] = useState<{ organizationId?: string; role?: string; search?: string }>({});
  
  // Модальные окна
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [passwordModalVisible, setPasswordModalVisible] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  
  // Формы
  const [createForm] = Form.useForm();
  const [editForm] = Form.useForm();
  const [passwordForm] = Form.useForm();

  const isAdmin = useMemo(() => user?.role === 'ecof_admin', [user?.role]);

  useEffect(() => {
    if (!isAdmin) {
      message.error('Доступ запрещен. Требуется роль администратора ЕЦОФ.');
      return;
    }
    loadOrganizations();
    loadUsers();
  }, [isAdmin, pagination.current, pagination.pageSize, filters]);

  const loadOrganizations = async () => {
    try {
      const res = await api.admin.organizations.list();
      setOrganizations(res.data || []);
    } catch (e: any) {
      message.error(e?.message || 'Ошибка загрузки организаций');
    }
  };

  const loadUsers = async () => {
    try {
      setLoading(true);
      const res = await api.admin.users.list({
        ...filters,
        limit: pagination.pageSize,
        offset: (pagination.current - 1) * pagination.pageSize,
      });
      setUsers(res.data || []);
      setTotal(res.pagination?.total || 0);
    } catch (e: any) {
      message.error(e?.message || 'Ошибка загрузки пользователей');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    try {
      const values = await createForm.validateFields();
      await api.admin.users.create(values);
      message.success('Пользователь создан');
      setCreateModalVisible(false);
      createForm.resetFields();
      await loadUsers();
    } catch (e: any) {
      if (e?.errorFields) return;
      message.error(e?.message || 'Ошибка создания пользователя');
    }
  };

  const handleEdit = (user: User) => {
    setEditingUser(user);
    editForm.setFieldsValue({
      username: user.username,
      email: user.email,
      role: user.role,
      organizationId: user.organizationId,
      isActive: user.isActive,
    });
    setEditModalVisible(true);
  };

  const handleSaveEdit = async () => {
    if (!editingUser) return;
    try {
      const values = await editForm.validateFields();
      await api.admin.users.update(editingUser.id, values);
      message.success('Пользователь обновлен');
      setEditModalVisible(false);
      editForm.resetFields();
      setEditingUser(null);
      await loadUsers();
    } catch (e: any) {
      if (e?.errorFields) return;
      message.error(e?.message || 'Ошибка обновления пользователя');
    }
  };

  const handleChangePassword = (user: User) => {
    setEditingUser(user);
    passwordForm.resetFields();
    setPasswordModalVisible(true);
  };

  const handleSavePassword = async () => {
    if (!editingUser) return;
    try {
      const values = await passwordForm.validateFields();
      await api.admin.users.updatePassword(editingUser.id, { password: values.password });
      message.success('Пароль изменен');
      setPasswordModalVisible(false);
      passwordForm.resetFields();
      setEditingUser(null);
    } catch (e: any) {
      if (e?.errorFields) return;
      message.error(e?.message || 'Ошибка изменения пароля');
    }
  };

  const handleDelete = async (userId: string) => {
    try {
      await api.admin.users.delete(userId);
      message.success('Пользователь деактивирован');
      await loadUsers();
    } catch (e: any) {
      message.error(e?.message || 'Ошибка удаления пользователя');
    }
  };

  const getRoleTag = (role: string) => {
    const colors: Record<string, string> = {
      ecof_admin: 'red',
      org_admin: 'orange',
      employee: 'blue',
    };
    const labels: Record<string, string> = {
      ecof_admin: 'Администратор ЕЦОФ',
      org_admin: 'Администратор организации',
      employee: 'Сотрудник',
    };
    return <Tag color={colors[role] || 'default'}>{labels[role] || role}</Tag>;
  };

  const columns = [
    {
      title: 'Имя пользователя',
      dataIndex: 'username',
      key: 'username',
      sorter: true,
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
      filters: [
        { text: 'Администратор ЕЦОФ', value: 'ecof_admin' },
        { text: 'Администратор организации', value: 'org_admin' },
        { text: 'Сотрудник', value: 'employee' },
      ],
      onFilter: (value: any, record: User) => record.role === value,
    },
    {
      title: 'Организация',
      dataIndex: 'organizationName',
      key: 'organizationName',
      render: (name: string | null) => name || '—',
      filters: organizations.map(org => ({ text: org.name, value: org.id })),
      onFilter: (value: any, record: User) => record.organizationId === value,
    },
    {
      title: 'Статус',
      dataIndex: 'isActive',
      key: 'isActive',
      render: (isActive: boolean) => (
        <Tag color={isActive ? 'green' : 'red'}>{isActive ? 'Активен' : 'Неактивен'}</Tag>
      ),
      filters: [
        { text: 'Активен', value: true },
        { text: 'Неактивен', value: false },
      ],
      onFilter: (value: any, record: User) => record.isActive === value,
    },
    {
      title: 'Действия',
      key: 'actions',
      width: 200,
      render: (_: any, record: User) => (
        <Space>
          <Button
            type="link"
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
          >
            Редактировать
          </Button>
          <Button
            type="link"
            icon={<KeyOutlined />}
            onClick={() => handleChangePassword(record)}
          >
            Пароль
          </Button>
          <Popconfirm
            title={record.isActive ? "Деактивировать пользователя?" : "Активировать пользователя?"}
            onConfirm={() => handleDelete(record.id)}
            okText="Да"
            cancelText="Нет"
          >
            <Button
              type="link"
              danger
              icon={<DeleteOutlined />}
            >
              {record.isActive ? 'Деактивировать' : 'Активировать'}
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  if (!isAdmin) {
    return (
      <div className="page">
        <Card>
          <Typography.Text type="danger">
            Доступ запрещен. Требуется роль администратора ЕЦОФ.
          </Typography.Text>
        </Card>
      </div>
    );
  }

  return (
    <div className="page">
      <Space direction="vertical" style={{ width: '100%' }} size={16}>
        <Typography.Title level={2} style={{ margin: 0 }}>
          Управление пользователями
        </Typography.Title>

        <Card
          title="Пользователи"
          extra={
            <Button
              type="primary"
              icon={<UserAddOutlined />}
              onClick={() => setCreateModalVisible(true)}
            >
              Создать пользователя
            </Button>
          }
        >
          <Space direction="vertical" style={{ width: '100%' }} size={12}>
            <Row gutter={16}>
              <Col xs={24} sm={8}>
                <Input.Search
                  placeholder="Поиск по имени или email"
                  allowClear
                  onSearch={(value) => {
                    setFilters({ ...filters, search: value || undefined });
                    setPagination({ ...pagination, current: 1 });
                  }}
                />
              </Col>
              <Col xs={24} sm={8}>
                <Select
                  placeholder="Фильтр по организации"
                  allowClear
                  style={{ width: '100%' }}
                  onChange={(value) => {
                    setFilters({ ...filters, organizationId: value || undefined });
                    setPagination({ ...pagination, current: 1 });
                  }}
                >
                  {organizations.map(org => (
                    <Option key={org.id} value={org.id}>{org.name}</Option>
                  ))}
                </Select>
              </Col>
              <Col xs={24} sm={8}>
                <Select
                  placeholder="Фильтр по роли"
                  allowClear
                  style={{ width: '100%' }}
                  onChange={(value) => {
                    setFilters({ ...filters, role: value || undefined });
                    setPagination({ ...pagination, current: 1 });
                  }}
                >
                  <Option value="ecof_admin">Администратор ЕЦОФ</Option>
                  <Option value="org_admin">Администратор организации</Option>
                  <Option value="employee">Сотрудник</Option>
                </Select>
              </Col>
            </Row>

            <Table
              columns={columns}
              dataSource={users}
              rowKey="id"
              loading={loading}
              pagination={{
                current: pagination.current,
                pageSize: pagination.pageSize,
                total,
                showSizeChanger: true,
                showTotal: (total) => `Всего: ${total}`,
                onChange: (page, pageSize) => {
                  setPagination({ current: page, pageSize });
                },
              }}
            />
          </Space>
        </Card>
      </Space>

      {/* Модальное окно создания пользователя */}
      <Modal
        title="Создать пользователя"
        open={createModalVisible}
        onOk={handleCreate}
        onCancel={() => {
          setCreateModalVisible(false);
          createForm.resetFields();
        }}
        okText="Создать"
        cancelText="Отмена"
        width={600}
      >
        <Form form={createForm} layout="vertical">
          <Form.Item
            name="username"
            label="Имя пользователя"
            rules={[{ required: true, message: 'Введите имя пользователя' }]}
          >
            <Input placeholder="username" />
          </Form.Item>
          <Form.Item
            name="email"
            label="Email"
            rules={[{ type: 'email', message: 'Некорректный email' }]}
          >
            <Input placeholder="email@example.com" />
          </Form.Item>
          <Form.Item
            name="password"
            label="Пароль"
            rules={[{ required: true, message: 'Введите пароль' }, { min: 6, message: 'Минимум 6 символов' }]}
          >
            <Input.Password placeholder="Минимум 6 символов" />
          </Form.Item>
          <Form.Item
            name="role"
            label="Роль"
            rules={[{ required: true, message: 'Выберите роль' }]}
          >
            <Select>
              <Option value="employee">Сотрудник</Option>
              <Option value="org_admin">Администратор организации</Option>
              <Option value="ecof_admin">Администратор ЕЦОФ</Option>
            </Select>
          </Form.Item>
          <Form.Item
            name="organizationId"
            label="Организация"
          >
            <Select
              placeholder="Выберите организацию (опционально)"
              allowClear
            >
              {organizations.map(org => (
                <Option key={org.id} value={org.id}>{org.name}</Option>
              ))}
            </Select>
          </Form.Item>
        </Form>
      </Modal>

      {/* Модальное окно редактирования пользователя */}
      <Modal
        title="Редактировать пользователя"
        open={editModalVisible}
        onOk={handleSaveEdit}
        onCancel={() => {
          setEditModalVisible(false);
          editForm.resetFields();
          setEditingUser(null);
        }}
        okText="Сохранить"
        cancelText="Отмена"
        width={600}
      >
        {editingUser && (
          <Form form={editForm} layout="vertical">
            <Form.Item
              name="username"
              label="Имя пользователя"
              rules={[{ required: true, message: 'Введите имя пользователя' }]}
            >
              <Input placeholder="username" />
            </Form.Item>
            <Form.Item
              name="email"
              label="Email"
              rules={[{ type: 'email', message: 'Некорректный email' }]}
            >
              <Input placeholder="email@example.com" />
            </Form.Item>
            <Form.Item
              name="role"
              label="Роль"
              rules={[{ required: true, message: 'Выберите роль' }]}
            >
              <Select>
                <Option value="employee">Сотрудник</Option>
                <Option value="org_admin">Администратор организации</Option>
                <Option value="ecof_admin">Администратор ЕЦОФ</Option>
              </Select>
            </Form.Item>
            <Form.Item
              name="organizationId"
              label="Организация"
            >
              <Select
                placeholder="Выберите организацию (опционально)"
                allowClear
              >
                {organizations.map(org => (
                  <Option key={org.id} value={org.id}>{org.name}</Option>
                ))}
              </Select>
            </Form.Item>
            <Form.Item
              name="isActive"
              label="Активен"
              valuePropName="checked"
            >
              <Switch />
            </Form.Item>
          </Form>
        )}
      </Modal>

      {/* Модальное окно изменения пароля */}
      <Modal
        title="Изменить пароль"
        open={passwordModalVisible}
        onOk={handleSavePassword}
        onCancel={() => {
          setPasswordModalVisible(false);
          passwordForm.resetFields();
          setEditingUser(null);
        }}
        okText="Изменить"
        cancelText="Отмена"
      >
        {editingUser && (
          <div style={{ marginBottom: 16 }}>
            <Typography.Text strong>Пользователь:</Typography.Text> {editingUser.username}
          </div>
        )}
        <Form form={passwordForm} layout="vertical">
          <Form.Item
            name="password"
            label="Новый пароль"
            rules={[{ required: true, message: 'Введите пароль' }, { min: 6, message: 'Минимум 6 символов' }]}
          >
            <Input.Password placeholder="Минимум 6 символов" />
          </Form.Item>
          <Form.Item
            name="passwordConfirm"
            label="Подтверждение пароля"
            dependencies={['password']}
            rules={[
              { required: true, message: 'Подтвердите пароль' },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || getFieldValue('password') === value) {
                    return Promise.resolve();
                  }
                  return Promise.reject(new Error('Пароли не совпадают'));
                },
              }),
            ]}
          >
            <Input.Password placeholder="Повторите пароль" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
