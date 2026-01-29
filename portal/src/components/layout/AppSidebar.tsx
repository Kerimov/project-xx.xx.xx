import { Menu } from 'antd';
import {
  AppstoreOutlined,
  FileDoneOutlined,
  FileTextOutlined,
  LineChartOutlined,
  CloudSyncOutlined,
  DatabaseOutlined,
  LinkOutlined
} from '@ant-design/icons';
import { useLocation, useNavigate } from 'react-router-dom';

const items = [
  { key: '/dashboard', icon: <AppstoreOutlined />, label: 'Дашборд' },
  { key: '/packages', icon: <FileDoneOutlined />, label: 'Пакеты' },
  { key: '/documents', icon: <FileTextOutlined />, label: 'Документы' },
  { key: '/nsi', icon: <DatabaseOutlined />, label: 'Справочники' },
  { key: '/reports', icon: <LineChartOutlined />, label: 'Отчётность' },
  { key: '/integration', icon: <CloudSyncOutlined />, label: 'Интеграция с УХ' },
  { key: '/uh-db-connection', icon: <LinkOutlined />, label: 'Подключение к БД УХ' }
];

export function AppSidebar() {
  const navigate = useNavigate();
  const location = useLocation();

  // Определяем активный ключ меню на основе текущего пути
  const getSelectedKey = () => {
    const path = location.pathname;
    if (path.startsWith('/nsi')) return '/nsi';
    if (path.startsWith('/uh-db-connection')) return '/uh-db-connection';
    return path;
  };

  return (
    <Menu
      mode="inline"
      selectedKeys={[getSelectedKey()]}
      items={items}
      onClick={(info) => navigate(info.key)}
    />
  );
}

