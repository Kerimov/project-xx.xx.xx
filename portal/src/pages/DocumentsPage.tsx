import { Table, Tag, Typography } from 'antd';

const columns = [
  { title: '№', dataIndex: 'number', key: 'number', width: 120 },
  { title: 'Дата', dataIndex: 'date', key: 'date', width: 120 },
  { title: 'Тип', dataIndex: 'type', key: 'type', width: 160 },
  { title: 'Контрагент', dataIndex: 'counterparty', key: 'counterparty' },
  { title: 'Сумма', dataIndex: 'amount', key: 'amount', align: 'right', width: 140 },
  {
    title: 'Статус портала',
    dataIndex: 'portalStatus',
    key: 'portalStatus',
    width: 160,
    render: (status: string) => {
      const colorMap: Record<string, string> = {
        Draft: 'default',
        Validated: 'processing',
        Frozen: 'geekblue',
        QueuedToUH: 'processing',
        SentToUH: 'processing'
      };
      const labelMap: Record<string, string> = {
        Draft: 'Черновик',
        Validated: 'Проверен',
        Frozen: 'Заморожен',
        QueuedToUH: 'В очереди в УХ',
        SentToUH: 'Отправлен в УХ'
      };

      const color = colorMap[status] || 'default';
      const label = labelMap[status] || status;

      return <Tag color={color}>{label}</Tag>;
    }
  },
  {
    title: 'Статус УХ',
    dataIndex: 'uhStatus',
    key: 'uhStatus',
    width: 140,
    render: (status: string) => {
      const colorMap: Record<string, string> = {
        None: 'default',
        Accepted: 'processing',
        Posted: 'success',
        Error: 'error'
      };
      const labelMap: Record<string, string> = {
        None: '—',
        Accepted: 'Принят',
        Posted: 'Проведён',
        Error: 'Ошибка'
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
    number: 'СФ-000123',
    date: '22.01.2026',
    type: 'Счёт-фактура',
    counterparty: 'ООО «Поставщик»',
    amount: 123456.78,
    portalStatus: 'Frozen',
    uhStatus: 'Accepted'
  }
];

export function DocumentsPage() {
  return (
    <div className="page">
      <Typography.Title level={3}>Документы</Typography.Title>
      <Table columns={columns} dataSource={data} size="middle" />
    </div>
  );
}

