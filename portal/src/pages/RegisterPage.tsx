import { useState, useEffect } from 'react';
import { Form, Input, Button, Card, Typography, message, Space, Select } from 'antd';
import { UserOutlined, LockOutlined, MailOutlined, ArrowLeftOutlined } from '@ant-design/icons';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../services/api';

const { Title, Text } = Typography;
const { Option } = Select;

export function RegisterPage() {
  const navigate = useNavigate();
  const { register, isAuthenticated } = useAuth();
  const [loading, setLoading] = useState(false);
  const [organizations, setOrganizations] = useState<any[]>([]);
  const [form] = Form.useForm();

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  useEffect(() => {
    // Загружаем список организаций для выбора
    api.nsi.organizations().then((response) => {
      setOrganizations(response.data || []);
    }).catch(() => {
      // Игнорируем ошибку, организация не обязательна
    });
  }, []);

  const onFinish = async (values: any) => {
    try {
      setLoading(true);
      await register({
        username: values.username,
        email: values.email,
        password: values.password,
        passwordConfirm: values.passwordConfirm,
        organizationId: values.organizationId,
        role: values.role || 'user'
      });
      message.success('Регистрация выполнена успешно');
      navigate('/dashboard');
    } catch (error: any) {
      message.error(error.message || 'Ошибка при регистрации');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        padding: '20px'
      }}
    >
      <Card
        style={{
          width: '100%',
          maxWidth: 450,
          boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
        }}
      >
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Button
              type="text"
              icon={<ArrowLeftOutlined />}
              onClick={() => navigate('/login')}
              style={{ padding: 0 }}
            >
              Назад
            </Button>
            <div style={{ flex: 1, textAlign: 'center' }}>
              <Title level={2} style={{ marginBottom: 8, margin: 0 }}>
                Регистрация
              </Title>
              <Text type="secondary">Создайте новый аккаунт</Text>
            </div>
            <div style={{ width: 60 }} /> {/* Spacer для центрирования */}
          </div>

          <Form
            form={form}
            name="register"
            onFinish={onFinish}
            layout="vertical"
            size="large"
            autoComplete="off"
          >
            <Form.Item
              name="username"
              rules={[
                { required: true, message: 'Введите имя пользователя' },
                { min: 3, message: 'Имя пользователя должно быть не менее 3 символов' }
              ]}
            >
              <Input
                prefix={<UserOutlined />}
                placeholder="Имя пользователя"
              />
            </Form.Item>

            <Form.Item
              name="email"
              rules={[
                { type: 'email', message: 'Введите корректный email' }
              ]}
            >
              <Input
                prefix={<MailOutlined />}
                placeholder="Email (необязательно)"
              />
            </Form.Item>

            <Form.Item
              name="password"
              rules={[
                { required: true, message: 'Введите пароль' },
                { min: 6, message: 'Пароль должен быть не менее 6 символов' }
              ]}
            >
              <Input.Password
                prefix={<LockOutlined />}
                placeholder="Пароль"
              />
            </Form.Item>

            <Form.Item
              name="passwordConfirm"
              dependencies={['password']}
              rules={[
                { required: true, message: 'Подтвердите пароль' },
                ({ getFieldValue }) => ({
                  validator(_, value) {
                    if (!value || getFieldValue('password') === value) {
                      return Promise.resolve();
                    }
                    return Promise.reject(new Error('Пароли не совпадают'));
                  }
                })
              ]}
            >
              <Input.Password
                prefix={<LockOutlined />}
                placeholder="Подтвердите пароль"
              />
            </Form.Item>

            <Form.Item
              name="organizationId"
              label="Организация (необязательно)"
            >
              <Select
                placeholder="Выберите организацию"
                allowClear
                showSearch
                optionFilterProp="children"
                filterOption={(input, option) =>
                  (option?.children as string)?.toLowerCase().includes(input.toLowerCase())
                }
              >
                {organizations.map((org) => (
                  <Option key={org.id} value={org.id}>
                    {org.name}
                  </Option>
                ))}
              </Select>
            </Form.Item>

            <Form.Item
              name="role"
              label="Роль"
              initialValue="employee"
            >
              <Select>
                <Option value="employee">Сотрудник</Option>
                <Option value="org_admin">Администратор организации</Option>
                <Option value="ecof_admin" disabled>Администратор ЕЦОФ (только по назначению)</Option>
              </Select>
            </Form.Item>

            <Form.Item>
              <Button
                type="primary"
                htmlType="submit"
                loading={loading}
                block
              >
                Зарегистрироваться
              </Button>
            </Form.Item>
          </Form>

          <div style={{ textAlign: 'center' }}>
            <Text type="secondary">Уже есть аккаунт? </Text>
            <Link to="/login">
              <Button type="link" style={{ padding: 0 }}>
                Войти
              </Button>
            </Link>
          </div>
        </Space>
      </Card>
    </div>
  );
}
