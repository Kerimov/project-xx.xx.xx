import { Menu } from 'antd';
import {
  AppstoreOutlined,
  FileDoneOutlined,
  FileTextOutlined,
  LineChartOutlined,
  CloudSyncOutlined,
  DatabaseOutlined,
  LinkOutlined,
  FileSearchOutlined,
  ApartmentOutlined,
  SettingOutlined
} from '@ant-design/icons';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

export function AppSidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

  const items = [
    { key: '/dashboard', icon: <AppstoreOutlined />, label: 'Дашборд' },
    { key: '/packages', icon: <FileDoneOutlined />, label: 'Пакеты' },
    { key: '/documents', icon: <FileTextOutlined />, label: 'Документы' },
    { key: '/organization/cabinet', icon: <SettingOutlined />, label: 'Личный кабинет' },
    { key: '/analytics', icon: <ApartmentOutlined />, label: 'Аналитики' },
    { key: '/nsi', icon: <DatabaseOutlined />, label: 'Справочники' },
    { key: '/reports', icon: <LineChartOutlined />, label: 'Отчётность' },
    { key: '/integration', icon: <CloudSyncOutlined />, label: 'Интеграция с УХ' },
    { key: '/logs', icon: <FileSearchOutlined />, label: 'Логи' },
    { key: '/uh-db-connection', icon: <LinkOutlined />, label: 'Подключение к БД УХ' }
  ] as any[];

  if (['ecof_admin', 'admin'].includes(user?.role || '')) {
    items.push({ key: '/analytics/admin', icon: <SettingOutlined />, label: 'Админ: аналитики' });
  }

  // Определяем активный ключ меню на основе текущего пути
  const getSelectedKey = () => {
    const path = location.pathname;
    if (path.startsWith('/nsi')) return '/nsi';
    if (path.startsWith('/uh-db-connection')) return '/uh-db-connection';
    if (path.startsWith('/analytics/admin')) return '/analytics/admin';
    if (path.startsWith('/organization/cabinet')) return '/organization/cabinet';
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

