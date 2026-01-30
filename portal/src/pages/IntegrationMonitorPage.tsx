import { useState, useEffect } from 'react';
import { Card, Table, Tag, Typography, Statistic, Row, Col, Button, Space, message, Spin, Alert, Tooltip } from 'antd';
import { ReloadOutlined, SyncOutlined } from '@ant-design/icons';
import { api } from '../services/api';
import dayjs from 'dayjs';

const { Title } = Typography;

const statusColorMap: Record<string, string> = {
  Pending: 'processing',
  Processing: 'warning',
  Completed: 'success',
  Failed: 'error'
};

const statusLabelMap: Record<string, string> = {
  Pending: 'В очереди',
  Processing: 'Обрабатывается',
  Completed: 'Завершено',
  Failed: 'Ошибка'
};

const operationTypeMap: Record<string, string> = {
  UpsertDocument: 'Создание/обновление',
  PostDocument: 'Проведение',
  CancelDocument: 'Отмена'
};

export function IntegrationMonitorPage() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ pending: 0, processing: 0, completed: 0, failed: 0 });
  const [items, setItems] = useState<any[]>([]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [statsRes, itemsRes] = await Promise.all([
        api.admin.queue.stats(),
        api.admin.queue.items(undefined, 50)
      ]);
      setStats(statsRes.data);
      setItems(itemsRes.data);
    } catch (error: any) {
      message.error('Ошибка загрузки данных: ' + (error.message || 'Неизвестная ошибка'));
    } finally {
      setLoading(false);
    }
  };

  const handleSyncNSI = async () => {
    try {
      await api.admin.nsi.sync();
      message.success('Синхронизация НСИ запущена');
    } catch (error: any) {
      message.error('Ошибка запуска синхронизации: ' + (error.message || 'Неизвестная ошибка'));
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 10000); // Обновление каждые 10 секунд
    return () => clearInterval(interval);
  }, []);

  const columns = [
    {
      title: 'Документ',
      key: 'document',
      render: (record: any) => (
        <div>
          <div>{record.documentNumber || record.documentId.substring(0, 8)}</div>
          <div style={{ fontSize: '12px', color: '#999' }}>{record.documentType}</div>
        </div>
      )
    },
    {
      title: 'Операция',
      dataIndex: 'operationType',
      key: 'operationType',
      render: (type: string) => operationTypeMap[type] || type
    },
    {
      title: 'Статус',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => {
        const color = statusColorMap[status] || 'default';
        const label = statusLabelMap[status] || status;
        return <Tag color={color}>{label}</Tag>;
      }
    },
    {
      title: 'Попытки',
      dataIndex: 'attempts',
      key: 'attempts',
      render: (attempts: number) => `${attempts}/3`
    },
    {
      title: 'Создано',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (date: string) => dayjs(date).format('DD.MM.YYYY HH:mm:ss')
    },
    {
      title: 'Обработано',
      dataIndex: 'completedAt',
      key: 'completedAt',
      render: (date: string | null) => date ? dayjs(date).format('DD.MM.YYYY HH:mm:ss') : '-'
    },
    {
      title: 'Ошибка',
      dataIndex: 'lastError',
      key: 'lastError',
      render: (error: string | null) => {
        if (!error) return '—';
        const isConnRefused = error.includes('ECONNREFUSED') || error.includes('fetch failed');
        const shortMsg = isConnRefused
          ? 'Сервер 1С недоступен (ECONNREFUSED)'
          : error.length > 60 ? `${error.substring(0, 60)}…` : error;
        return (
          <Tooltip title={error}>
            <span>
              <Tag color="red">{shortMsg}</Tag>
              {isConnRefused && (
                <Typography.Text type="secondary" style={{ fontSize: 11, display: 'block', marginTop: 4 }}>
                  UH_API_URL — базовый URL (без /documents). Backend вызывает .../ecof/documents, .../ecof/health. Проверьте, что 1С запущена.
                </Typography.Text>
              )}
            </span>
          </Tooltip>
        );
      }
    }
  ];

  return (
    <div className="page">
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        <Space>
          <Title level={3} style={{ margin: 0 }}>Интеграция с УХ</Title>
          <Button icon={<ReloadOutlined />} onClick={loadData} loading={loading}>
            Обновить
          </Button>
          <Button icon={<SyncOutlined />} onClick={handleSyncNSI}>
            Синхронизировать НСИ
          </Button>
        </Space>

        <Row gutter={16}>
          <Col span={6}>
            <Card>
              <Statistic title="В очереди" value={stats.pending} valueStyle={{ color: '#1890ff' }} />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic title="Обрабатывается" value={stats.processing} valueStyle={{ color: '#faad14' }} />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic title="Завершено" value={stats.completed} valueStyle={{ color: '#3f8600' }} />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic title="Ошибки" value={stats.failed} valueStyle={{ color: '#cf1322' }} />
            </Card>
          </Col>
        </Row>

        {items.some((i: any) => i.lastError && (i.lastError.includes('ECONNREFUSED') || i.lastError.includes('fetch failed'))) && (
          <Alert
            type="warning"
            showIcon
            message="Сервер 1С недоступен"
            description="Backend не может подключиться к HTTP API 1С (ECONNREFUSED). UH_API_URL в backend/.env — базовый URL сервиса ecof (без /documents), например https://localhost:8035/kk_test/hs/ecof. Backend сам обращается к .../documents, .../health. Проверьте, что HTTP-сервис 1С запущен; при HTTPS с самоподписанным сертификатом задайте UH_API_INSECURE=true."
            style={{ marginBottom: 16 }}
          />
        )}
        <Card title="Задачи очереди">
          <Spin spinning={loading}>
            <Table
              columns={columns}
              dataSource={items.map(item => ({ ...item, key: item.id }))}
              size="middle"
              pagination={{ pageSize: 20 }}
            />
          </Spin>
        </Card>
      </Space>
    </div>
  );
}

