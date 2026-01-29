import { Menu } from 'antd';
import {
  AppstoreOutlined,
  FileDoneOutlined,
  FileTextOutlined,
  LineChartOutlined,
  CloudSyncOutlined
} from '@ant-design/icons';
import { useLocation, useNavigate } from 'react-router-dom';

const items = [
  { key: '/dashboard', icon: <AppstoreOutlined />, label: 'Дашборд' },
  { key: '/packages', icon: <FileDoneOutlined />, label: 'Пакеты' },
  { key: '/documents', icon: <FileTextOutlined />, label: 'Документы' },
  { key: '/reports', icon: <LineChartOutlined />, label: 'Отчётность' },
  { key: '/integration', icon: <CloudSyncOutlined />, label: 'Интеграция с УХ' }
];

export function AppSidebar() {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <Menu
      mode="inline"
      selectedKeys={[location.pathname]}
      items={items}
      onClick={(info) => navigate(info.key)}
    />
  );
}

