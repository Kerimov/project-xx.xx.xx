import { Card, Table, Tag, Typography } from 'antd';

const columns = [
  { title: 'ID операции', dataIndex: 'id', key: 'id' },
  { title: 'Тип', dataIndex: 'type', key: 'type' },
  { title: 'Источник', dataIndex: 'source', key: 'source' },
  { title: 'Создано', dataIndex: 'createdAt', key: 'createdAt' },
  {
    title: 'Статус',
    dataIndex: 'status',
    key: 'status',
    render: (status: string) => {
      const colorMap: Record<string, string> = {
        Pending: 'processing',
        Succeeded: 'success',
        Failed: 'error'
      };
      const labelMap: Record<string, string> = {
        Pending: 'В очереди',
        Succeeded: 'Успех',
        Failed: 'Ошибка'
      };
      const color = colorMap[status] || 'default';
      const label = labelMap[status] || status;
      return <Tag color={color}>{label}</Tag>;
    }
  }
];

const data = [
  {
    key: '1',
    id: 'op-001',
    type: 'UpsertDocument',
    source: 'Пакет PKG-2026-01-001',
    createdAt: '22.01.2026 10:15',
    status: 'Pending'
  }
];

export function IntegrationMonitorPage() {
  return (
    <div className="page">
      <Typography.Title level={3}>Интеграция с УХ</Typography.Title>
      <Card>
        <Table columns={columns} dataSource={data} size="middle" />
      </Card>
    </div>
  );
}

