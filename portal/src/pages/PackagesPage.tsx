import { Table, Tag, Typography } from 'antd';

const columns = [
  { title: 'Пакет', dataIndex: 'name', key: 'name' },
  { title: 'Дочка', dataIndex: 'company', key: 'company' },
  { title: 'Период', dataIndex: 'period', key: 'period' },
  { title: 'Тип', dataIndex: 'type', key: 'type' },
  { title: 'Документов', dataIndex: 'documents', key: 'documents' },
  {
    title: 'Статус',
    dataIndex: 'status',
    key: 'status',
    render: (status: string) => {
      const colorMap: Record<string, string> = {
        InProcessing: 'processing',
        Done: 'success',
        Failed: 'error',
        PartiallyFailed: 'warning'
      };
      const labelMap: Record<string, string> = {
        InProcessing: 'В обработке',
        Done: 'Завершён',
        Failed: 'Ошибка',
        PartiallyFailed: 'Частично с ошибками'
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
    name: 'PKG-2026-01-001',
    company: 'Дочка 1',
    period: '01.2026',
    type: 'Реализация',
    documents: 120,
    status: 'InProcessing'
  }
];

export function PackagesPage() {
  return (
    <div className="page">
      <Typography.Title level={3}>Пакеты</Typography.Title>
      <Table columns={columns} dataSource={data} size="middle" />
    </div>
  );
}

