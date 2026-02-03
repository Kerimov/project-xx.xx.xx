import { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Card, Typography } from 'antd';

interface AdminRouteProps {
  children: ReactNode;
}

/**
 * Компонент для защиты роутов, доступных только администраторам
 * Разрешает доступ для org_admin и ecof_admin, запрещает для employee
 */
export function AdminRoute({ children }: AdminRouteProps) {
  const { user } = useAuth();

  const isAdmin = user?.role === 'org_admin' || user?.role === 'ecof_admin';

  if (!isAdmin) {
    return (
      <div className="page">
        <Card variant="outlined">
          <Typography.Text type="danger">
            Доступ запрещен. Требуется роль администратора организации или ЕЦОФ.
          </Typography.Text>
        </Card>
      </div>
    );
  }

  return <>{children}</>;
}
