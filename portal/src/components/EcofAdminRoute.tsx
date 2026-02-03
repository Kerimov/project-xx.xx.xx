import { ReactNode } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Card, Typography } from 'antd';

export function EcofAdminRoute({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const ok = user?.role === 'ecof_admin';

  if (!ok) {
    return (
      <div className="page">
        <Card variant="outlined">
          <Typography.Text type="danger">Доступ запрещен. Требуется роль администратора ЕЦОФ.</Typography.Text>
        </Card>
      </div>
    );
  }

  return <>{children}</>;
}

