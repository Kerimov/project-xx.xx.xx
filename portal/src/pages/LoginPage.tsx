import { useState, useEffect } from 'react';
import { Form, Input, Button, Card, Typography, message, Space, Divider } from 'antd';
import { UserOutlined, LockOutlined } from '@ant-design/icons';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const { Title, Text } = Typography;

export function LoginPage() {
  const navigate = useNavigate();
  const { login, isAuthenticated } = useAuth();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  const onFinish = async (values: { username: string; password: string }) => {
    try {
      setLoading(true);
      await login(values.username, values.password);
      message.success('Вход выполнен успешно');
      navigate('/dashboard');
    } catch (error: any) {
      message.error(error.message || 'Ошибка при входе');
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
          maxWidth: 400,
          boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
        }}
      >
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          <div style={{ textAlign: 'center' }}>
            <Title level={2} style={{ marginBottom: 8 }}>
              ЕЦОФ Портал
            </Title>
            <Text type="secondary">Вход в систему</Text>
          </div>

          <Form
            name="login"
            onFinish={onFinish}
            layout="vertical"
            size="large"
            autoComplete="off"
          >
            <Form.Item
              name="username"
              rules={[{ required: true, message: 'Введите имя пользователя' }]}
            >
              <Input
                prefix={<UserOutlined />}
                placeholder="Имя пользователя"
              />
            </Form.Item>

            <Form.Item
              name="password"
              rules={[{ required: true, message: 'Введите пароль' }]}
            >
              <Input.Password
                prefix={<LockOutlined />}
                placeholder="Пароль"
              />
            </Form.Item>

            <Form.Item>
              <Button
                type="primary"
                htmlType="submit"
                loading={loading}
                block
              >
                Войти
              </Button>
            </Form.Item>
          </Form>

          <Divider>или</Divider>

          <div style={{ textAlign: 'center' }}>
            <Text type="secondary">Нет аккаунта? </Text>
            <Link to="/register">
              <Button type="link" style={{ padding: 0 }}>
                Зарегистрироваться
              </Button>
            </Link>
          </div>
        </Space>
      </Card>
    </div>
  );
}
