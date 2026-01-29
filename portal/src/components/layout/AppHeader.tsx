import { Layout, Button, Space, Dropdown, Avatar } from 'antd';
import { UserOutlined, LogoutOutlined, BellOutlined } from '@ant-design/icons';
import type { MenuProps } from 'antd';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

const { Header } = Layout;

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
      <div className="app-header-left">
        <div className="app-brand">
          <div className="app-brand-text">
            <div className="app-brand-title">Портал ЕЦОФ</div>
            <div className="app-brand-subtitle">Первичные документы • 1С:УХ</div>
          </div>
        </div>
      </div>

      <div className="app-header-right">
        <button className="app-icon-button" type="button" aria-label="Уведомления">
          <BellOutlined />
        </button>
        <Dropdown menu={{ items: menuItems }} trigger={['click']} placement="bottomRight">
          <div className="app-user-chip" role="button" tabIndex={0}>
            <Avatar size="small" icon={<UserOutlined />} />
            <span className="app-header-username">{user?.username || 'Пользователь'}</span>
            <span className="app-user-role">{user?.role || ''}</span>
          </div>
        </Dropdown>
      </div>
    </Header>
  );
}
