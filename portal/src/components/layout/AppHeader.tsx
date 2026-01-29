import { Layout, Typography, Space, Avatar, Dropdown, MenuProps, Badge } from 'antd';
import { BellOutlined, UserOutlined } from '@ant-design/icons';

const { Header } = Layout;

const profileMenuItems: MenuProps['items'] = [
  {
    key: 'profile',
    label: 'Профиль'
  },
  {
    key: 'logout',
    label: 'Выйти'
  }
];

export function AppHeader() {
  return (
    <Header className="app-header">
      <Typography.Title level={4} className="app-header-title">
        Портал ЕЦОФ
      </Typography.Title>
      <Space size="large">
        <Badge count={0} overflowCount={99} size="small">
          <BellOutlined className="app-header-icon" />
        </Badge>
        <Dropdown menu={{ items: profileMenuItems }} trigger={['click']}>
          <Space>
            <Avatar size="small" icon={<UserOutlined />} />
            <span className="app-header-username">Пользователь</span>
          </Space>
        </Dropdown>
      </Space>
    </Header>
  );
}

