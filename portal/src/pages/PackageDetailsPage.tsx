import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Card,
  Descriptions,
  Table,
  Tag,
  Typography,
  Button,
  Space,
  message,
  Modal
} from 'antd';
import { ArrowLeftOutlined, PlusOutlined, SendOutlined } from '@ant-design/icons';
import { api } from '../services/api';
import { documentGroups } from '../config/documentGroups';

const getDocumentTypeLabel = (type: string): string => {
  for (const group of documentGroups) {
    for (const subgroup of group.subgroups || []) {
      const docType = subgroup.documents?.find(doc => doc.type === type);
      if (docType) return docType.label;
    }
  }
  return type;
};

const statusColorMap: Record<string, string> = {
  New: 'default',
  InProcessing: 'processing',
  Done: 'success',
  Failed: 'error',
  PartiallyFailed: 'warning'
};

const statusLabelMap: Record<string, string> = {
  New: 'Новый',
  InProcessing: 'В обработке',
  Done: 'Завершён',
  Failed: 'Ошибка',
  PartiallyFailed: 'Частично с ошибками'
};

const portalStatusColorMap: Record<string, string> = {
  Draft: 'default',
  Validated: 'processing',
  Frozen: 'geekblue',
  QueuedToUH: 'processing',
  SentToUH: 'processing',
  AcceptedByUH: 'success',
  PostedInUH: 'success',
  UnpostedInUH: 'warning',
  RejectedByUH: 'warning',
  Cancelled: 'error'
};

const portalStatusLabelMap: Record<string, string> = {
  Draft: 'Черновик',
  Validated: 'Проверен',
  Frozen: 'Заморожен',
  QueuedToUH: 'В очереди в УХ',
  SentToUH: 'Отправлен в УХ',
  AcceptedByUH: 'Принят УХ',
  PostedInUH: 'Проведен в УХ',
  UnpostedInUH: 'Отменено проведение в УХ',
  RejectedByUH: 'Отклонен УХ',
  Cancelled: 'Отменен'
};

export function PackageDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [pkg, setPkg] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [availableDocs, setAvailableDocs] = useState<any[]>([]);
  const [loadingDocs, setLoadingDocs] = useState(false);
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [adding, setAdding] = useState(false);
  const [sendingToUH, setSendingToUH] = useState(false);

  const loadPackage = useCallback(async () => {
    if (!id) return;
    try {
      setLoading(true);
      const response = await api.packages.getById(id);
      setPkg(response.data);
    } catch {
      message.error('Пакет не найден');
      navigate('/packages');
    } finally {
      setLoading(false);
    }
  }, [id, navigate]);

  useEffect(() => {
    loadPackage();
  }, [loadPackage]);

  const openAddModal = async () => {
    setAddModalOpen(true);
    setSelectedRowKeys([]);
    try {
      setLoadingDocs(true);
      const res = await api.documents.list({ notInPackageId: id, limit: 500 });
      setAvailableDocs(res.data || []);
    } catch {
      message.error('Ошибка загрузки документов');
    } finally {
      setLoadingDocs(false);
    }
  };

  const handleSendToUH = async () => {
    if (!id) return;
    try {
      setSendingToUH(true);
      const res = await api.packages.sendToUH(id);
      const d = res.data;
      if (d.enqueued > 0) {
        message.success(`Отправлено в очередь УХ: ${d.enqueued} документов`);
        loadPackage();
      } else {
        message.info(d.message || 'Нет документов для отправки');
      }
      if (d.errors?.length) {
        message.warning(`Ошибки: ${d.errors.slice(0, 3).join('; ')}${d.errors.length > 3 ? '...' : ''}`);
      }
    } catch (e: any) {
      message.error('Ошибка: ' + (e?.message || 'Неизвестная ошибка'));
    } finally {
      setSendingToUH(false);
    }
  };

  const handleAddDocuments = async () => {
    if (selectedRowKeys.length === 0) {
      message.warning('Выберите документы');
      return;
    }
    try {
      setAdding(true);
      await api.packages.addDocuments(id!, selectedRowKeys as string[]);
      message.success(`Добавлено документов: ${selectedRowKeys.length}`);
      setAddModalOpen(false);
      loadPackage();
    } catch (e: any) {
      message.error('Ошибка: ' + (e?.message || 'Неизвестная ошибка'));
    } finally {
      setAdding(false);
    }
  };

  const documents = pkg?.documents || [];
  const documentColumns = [
    { title: 'Номер', dataIndex: 'number', key: 'number', width: 120 },
    { title: 'Дата', dataIndex: 'date', key: 'date', width: 100 },
    { title: 'Тип', dataIndex: 'type', key: 'type', width: 150 },
    {
      title: 'Статус портала',
      dataIndex: 'portalStatus',
      key: 'portalStatus',
      width: 180,
      render: (s: string) => (
        <Tag color={portalStatusColorMap[s] || 'default'}>
          {portalStatusLabelMap[s] || s}
        </Tag>
      )
    },
    { title: 'Статус УХ', dataIndex: 'uhStatus', key: 'uhStatus', width: 120 }
  ];

  if (loading || !pkg) {
    return (
      <div className="page">
        <Typography.Text>Загрузка...</Typography.Text>
      </div>
    );
  }

  return (
    <div className="page">
      <Space style={{ marginBottom: 16 }} wrap>
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/packages')}>
          К пакетам
        </Button>
        <Button
          type="primary"
          icon={<SendOutlined />}
          onClick={handleSendToUH}
          loading={sendingToUH}
          disabled={!pkg?.documents?.length}
        >
          Отправить все в УХ
        </Button>
      </Space>

      <Typography.Title level={3}>{pkg.name}</Typography.Title>

      <Card size="small" title="Основные реквизиты" style={{ marginBottom: 16 }}>
        <Descriptions column={1} size="small">
          <Descriptions.Item label="Пакет">{pkg.name}</Descriptions.Item>
          <Descriptions.Item label="Организация">{pkg.company || '—'}</Descriptions.Item>
          <Descriptions.Item label="Период">{pkg.period}</Descriptions.Item>
          <Descriptions.Item label="Тип">{pkg.type || '—'}</Descriptions.Item>
          <Descriptions.Item label="Статус">
            <Tag color={statusColorMap[pkg.status] || 'default'}>
              {statusLabelMap[pkg.status] || pkg.status}
            </Tag>
          </Descriptions.Item>
          <Descriptions.Item label="Документов">{pkg.documentCount ?? documents.length}</Descriptions.Item>
        </Descriptions>
      </Card>

      <Card
        size="small"
        title={`Документы пакета (${documents.length})`}
        extra={
          <Button type="primary" size="small" icon={<PlusOutlined />} onClick={openAddModal}>
            Добавить документы
          </Button>
        }
      >
        {documents.length === 0 ? (
          <Space direction="vertical">
            <Typography.Text type="secondary">
              В пакете пока нет документов. Добавьте документы кнопкой выше или при создании документа.
            </Typography.Text>
            <Button type="primary" icon={<PlusOutlined />} onClick={openAddModal}>
              Добавить документы
            </Button>
          </Space>
        ) : (
          <Table
            columns={documentColumns}
            dataSource={documents}
            rowKey="id"
            size="small"
            pagination={{ pageSize: 10, showSizeChanger: true, showTotal: (t) => `Всего: ${t}` }}
            onRow={(row) => ({
              style: { cursor: 'pointer' },
              onClick: () => navigate(`/documents/${row.id}`)
            })}
            locale={{ emptyText: 'Нет документов' }}
          />
        )}
      </Card>

      <Modal
        title="Добавить документы в пакет"
        open={addModalOpen}
        onOk={handleAddDocuments}
        onCancel={() => setAddModalOpen(false)}
        okText={`Добавить (${selectedRowKeys.length})`}
        okButtonProps={{ disabled: selectedRowKeys.length === 0 }}
        confirmLoading={adding}
        width={700}
      >
        <Typography.Text type="secondary" style={{ display: 'block', marginBottom: 12 }}>
          Выберите документы, которые нужно добавить в пакет:
        </Typography.Text>
        <Table
          size="small"
          dataSource={availableDocs}
          rowKey="id"
          loading={loadingDocs}
          pagination={{ pageSize: 10 }}
          rowSelection={{
            selectedRowKeys,
            onChange: (keys) => setSelectedRowKeys(keys)
          }}
          columns={[
            { title: '№', dataIndex: 'number', key: 'number', width: 100 },
            { title: 'Дата', dataIndex: 'date', key: 'date', width: 90 },
            { title: 'Тип', dataIndex: 'type', key: 'type', render: (t: string) => getDocumentTypeLabel(t) },
            { title: 'Контрагент', dataIndex: 'counterparty', key: 'counterparty' }
          ]}
          locale={{ emptyText: 'Нет документов для добавления (все уже в этом пакете)' }}
        />
      </Modal>
    </div>
  );
}
