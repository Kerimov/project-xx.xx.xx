import { useState, useEffect } from 'react';
import { Card, Col, Row, Statistic, Spin, Tag, Typography } from 'antd';
import { api } from '../services/api';

export function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<{
    packagesInProcessing: number;
    documentsWithErrors: number;
    processedToday: number;
    queueCount: number;
  } | null>(null);

  useEffect(() => {
    let cancelled = false;
    api.admin.dashboard.stats()
      .then((res) => {
        if (!cancelled) {
          setStats(res.data);
        }
      })
      .catch(() => {
        if (!cancelled) setStats(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  return (
    <div className="page">
      <Typography.Title level={3}>Обзор ЕЦОФ</Typography.Title>
      <Spin spinning={loading}>
        <Row gutter={[16, 16]}>
          <Col xs={24} md={12} lg={6}>
            <Card>
              <Statistic
                title="Пакетов в обработке"
                value={stats?.packagesInProcessing ?? 0}
              />
            </Card>
          </Col>
          <Col xs={24} md={12} lg={6}>
            <Card>
              <Statistic
                title="Документов с ошибками"
                value={stats?.documentsWithErrors ?? 0}
                valueStyle={{ color: stats?.documentsWithErrors ? '#cf1322' : undefined }}
              />
            </Card>
          </Col>
          <Col xs={24} md={12} lg={6}>
            <Card>
              <Statistic
                title="Проведено за сегодня"
                value={stats?.processedToday ?? 0}
              />
            </Card>
          </Col>
          <Col xs={24} md={12} lg={6}>
            <Card>
              <Statistic
                title="В очереди на УХ"
                value={stats?.queueCount ?? 0}
              />
            </Card>
          </Col>
        </Row>
        <Row gutter={[16, 16]} style={{ marginTop: 24 }}>
          <Col xs={24} lg={16}>
            <Card title="Состояние потоков">
              <Tag color="processing">Импорт пакетов</Tag>
              <Tag color="success">Выгрузка в УХ</Tag>
              <Tag color="warning">Ошибки проведения</Tag>
            </Card>
          </Col>
          <Col xs={24} lg={8}>
            <Card title="Быстрые ссылки">
              <ul className="link-list">
                <li>Новые пакеты за сегодня</li>
                <li>Документы с ошибками</li>
                <li>Просроченные пакеты</li>
              </ul>
            </Card>
          </Col>
        </Row>
      </Spin>
    </div>
  );
}

