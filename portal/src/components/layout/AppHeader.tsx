import { Layout, Typography, Button, Space, Dropdown, Avatar } from 'antd';
import { UserOutlined, LogoutOutlined, BellOutlined } from '@ant-design/icons';
import type { MenuProps } from 'antd';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

const { Header } = Layout;
const { Text } = Typography;

export function AppHeader() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const menuItems: MenuProps['items'] = [
    {
      key: 'profile',
      label: (
        <div style={{ padding: '4px 0', minWidth: '200px' }}>
          <div style={{ fontWeight: 500 }}>{user?.username}</div>
          {user?.email && <div style={{ fontSize: '12px', color: '#999' }}>{user.email}</div>}
          <div style={{ fontSize: '12px', color: '#999' }}>Роль: {user?.role}</div>
        </div>
      )
    },
    {
      type: 'divider'
    },
    {
      key: 'logout',
      label: (
        <Button type="text" danger icon={<LogoutOutlined />} onClick={handleLogout} block>
          Выйти
        </Button>
      )
    }
  ];

  return (
    <Header className="app-header">
      <Typography.Title level={4} className="app-header-title">
        Портал ЕЦОФ
      </Typography.Title>
      <Space size="large">
        <BellOutlined className="app-header-icon" />
        <Dropdown menu={{ items: menuItems }} trigger={['click']} placement="bottomRight">
          <Space style={{ cursor: 'pointer' }}>
            <Avatar size="small" icon={<UserOutlined />} />
            <span className="app-header-username">{user?.username || 'Пользователь'}</span>
          </Space>
        </Dropdown>
      </Space>
    </Header>
  );
}
