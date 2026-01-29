import { Table, Tag, Typography, Button, Space } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { api } from '../services/api';
import { message } from 'antd';

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

export function DocumentsPage() {
  const navigate = useNavigate();
  const [documents, setDocuments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDocuments();
  }, []);

  const loadDocuments = async () => {
    try {
      setLoading(true);
      const response = await api.documents.list();
      setDocuments(response.data || []);
    } catch (error) {
      console.error('Error loading documents:', error);
      message.error('Ошибка при загрузке документов');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page">
      <Space style={{ width: '100%', justifyContent: 'space-between', marginBottom: 16 }}>
        <Typography.Title level={3} style={{ margin: 0 }}>
          Документы
        </Typography.Title>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => navigate('/documents/new')}
        >
          Создать документ
        </Button>
      </Space>
      <Table
        columns={columns}
        dataSource={documents.map(doc => ({ ...doc, key: doc.id }))}
        size="middle"
        loading={loading}
        onRow={(record) => ({
          onClick: () => navigate(`/documents/${record.id}`)
        })}
      />
    </div>
  );
}

