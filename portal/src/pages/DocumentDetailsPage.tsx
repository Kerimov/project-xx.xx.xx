import { Card, Col, Descriptions, Row, Space, Tabs, Tag, Typography, Button, message, Dropdown, Modal, Upload, List, Popconfirm } from 'antd';
import type { TabsProps } from 'antd';
import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { StopOutlined, CheckCircleOutlined, LockOutlined, EditOutlined, DeleteOutlined, UploadOutlined, DownloadOutlined } from '@ant-design/icons';
import { api } from '../services/api';
import dayjs from 'dayjs';

const { Title, Text } = Typography;

const portalStatusLabel: Record<string, { text: string; color: string }> = {
  Draft: { text: 'Черновик', color: 'default' },
  Validated: { text: 'Проверен', color: 'processing' },
  Frozen: { text: 'Заморожен', color: 'geekblue' },
  QueuedToUH: { text: 'В очереди в УХ', color: 'processing' },
  SentToUH: { text: 'Отправлен в УХ', color: 'processing' },
  AcceptedByUH: { text: 'Принят УХ', color: 'success' },
  PostedInUH: { text: 'Проведен в УХ', color: 'success' },
  RejectedByUH: { text: 'Отклонен УХ', color: 'warning' },
  Cancelled: { text: 'Отменен', color: 'error' }
};

const uhStatusLabel: Record<string, { text: string; color: string }> = {
  None: { text: '—', color: 'default' },
  Accepted: { text: 'Принят', color: 'processing' },
  Posted: { text: 'Проведён', color: 'success' },
  Error: { text: 'Ошибка', color: 'error' }
};

const statusTransitionLabels: Record<string, string> = {
  Draft: 'Вернуть в черновик',
  Validated: 'Пометить как проверенный',
  Frozen: 'Заморозить',
  Cancelled: 'Отменить'
};

export function DocumentDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [doc, setDoc] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [statusTransitions, setStatusTransitions] = useState<{
    currentStatus: string;
    editable: boolean;
    availableTransitions: string[];
  } | null>(null);
  const [changingStatus, setChangingStatus] = useState(false);
  const [files, setFiles] = useState<any[]>([]);
  const [uploading, setUploading] = useState(false);
  const [deletingFileId, setDeletingFileId] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    const loadDocument = async () => {
      try {
        setLoading(true);
        setError(null);
        const [docResponse, transitionsResponse, filesResponse] = await Promise.all([
          api.documents.getById(id),
          api.documents.getStatusTransitions(id).catch(() => null),
          api.files.list(id).catch(() => ({ data: [] }))
        ]);
        setDoc(docResponse.data);
        setFiles(filesResponse.data || []);
        if (transitionsResponse) {
          setStatusTransitions(transitionsResponse.data);
        }
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Ошибка загрузки документа';
        setError(msg);
        setDoc(null);
      } finally {
        setLoading(false);
      }
    };
    loadDocument();
  }, [id]);

  const handleFileUpload = async (file: File) => {
    if (!id) return;
    
    try {
      setUploading(true);
      await api.files.upload(id, file);
      message.success('Файл успешно загружен');
      
      // Обновляем список файлов
      const filesResponse = await api.files.list(id);
      setFiles(filesResponse.data || []);
      
      // Обновляем документ для обновления счетчика файлов
      const docResponse = await api.documents.getById(id);
      setDoc(docResponse.data);
    } catch (error: any) {
      message.error('Ошибка при загрузке файла: ' + (error.message || 'Неизвестная ошибка'));
    } finally {
      setUploading(false);
    }
  };

  const handleFileDelete = async (fileId: string) => {
    if (!id) return;
    
    try {
      setDeletingFileId(fileId);
      await api.files.delete(fileId);
      message.success('Файл успешно удален');
      
      // Обновляем список файлов
      const filesResponse = await api.files.list(id);
      setFiles(filesResponse.data || []);
      
      // Обновляем документ
      const docResponse = await api.documents.getById(id);
      setDoc(docResponse.data);
    } catch (error: any) {
      message.error('Ошибка при удалении файла: ' + (error.message || 'Неизвестная ошибка'));
    } finally {
      setDeletingFileId(null);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const handleCancel = async () => {
    if (!id || !doc) return;
    
    if (!confirm('Вы уверены, что хотите отменить этот документ?')) {
      return;
    }

    try {
      setCancelling(true);
      await api.documents.cancel(id);
      message.success('Документ отменен');
      // Перезагружаем документ
      const response = await api.documents.getById(id);
      setDoc(response.data);
    } catch (error: any) {
      message.error('Ошибка при отмене документа: ' + (error.message || 'Неизвестная ошибка'));
    } finally {
      setCancelling(false);
    }
  };

  const canCancel = doc && ['Draft', 'Validated'].includes(doc.portalStatus);
  const canDelete = doc && ['Draft', 'Validated', 'Cancelled', 'RejectedByUH'].includes(doc.portalStatus);
  const canEdit = statusTransitions?.editable ?? false;
  const availableTransitions = statusTransitions?.availableTransitions || [];

  const handleStatusChange = async (newStatus: string) => {
    if (!id || !doc) return;

    try {
      setChangingStatus(true);
      await api.documents.changeStatus(id, newStatus);
      message.success(`Статус документа изменен на "${portalStatusLabel[newStatus]?.text || newStatus}"`);
      
      // Перезагружаем документ и переходы
      const [docResponse, transitionsResponse] = await Promise.all([
        api.documents.getById(id),
        api.documents.getStatusTransitions(id)
      ]);
      setDoc(docResponse.data);
      setStatusTransitions(transitionsResponse.data);
    } catch (error: any) {
      message.error('Ошибка при изменении статуса: ' + (error.message || 'Неизвестная ошибка'));
    } finally {
      setChangingStatus(false);
    }
  };

  const handleDelete = async () => {
    if (!id || !doc) return;
    
    Modal.confirm({
      title: 'Удаление документа',
      content: `Вы уверены, что хотите удалить документ "${doc.number}"? Это действие нельзя отменить.`,
      okText: 'Удалить',
      okType: 'danger',
      cancelText: 'Отмена',
      onOk: async () => {
        try {
          setDeleting(true);
          await api.documents.delete(id);
          message.success('Документ успешно удален');
          navigate('/documents');
        } catch (error: any) {
          message.error('Ошибка при удалении документа: ' + (error.message || 'Неизвестная ошибка'));
        } finally {
          setDeleting(false);
        }
      }
    });
  };

  if (loading) {
    return (
      <div className="page">
        <Text>Загрузка документа...</Text>
      </div>
    );
  }

  if (error || !doc) {
    return (
      <div className="page">
        <Text type="danger">{error || 'Документ не найден'}</Text>
      </div>
    );
  }

  const portal = portalStatusLabel[doc.portalStatus] ?? {
    text: doc.portalStatus,
    color: 'default'
  };
  const uh = uhStatusLabel[doc.uhStatus] ?? {
    text: doc.uhStatus,
    color: 'default'
  };

  const checks = doc.checks ?? [];
  const history = doc.history ?? [];
  
  const canUploadFiles = canEdit; // Можно загружать файлы только если документ редактируемый

  const formatAmount = (amount: number | null | undefined, currency: string | null | undefined) => {
    if (amount === null || amount === undefined) return '—';
    return amount.toLocaleString('ru-RU', {
      style: 'currency',
      currency: currency || 'RUB'
    });
  };

  const items: TabsProps['items'] = [
    {
      key: 'data',
      label: 'Данные',
      children: (
        <Row gutter={[16, 16]}>
          <Col xs={24} md={14}>
            <Card size="small" title="Основные реквизиты">
              <Descriptions column={1} size="small">
                <Descriptions.Item label="Номер">{doc.number}</Descriptions.Item>
                <Descriptions.Item label="Дата">{doc.date}</Descriptions.Item>
                <Descriptions.Item label="Тип документа">{doc.type}</Descriptions.Item>
                <Descriptions.Item label="Организация">{doc.company}</Descriptions.Item>
                <Descriptions.Item label="Контрагент">{doc.counterparty}</Descriptions.Item>
                <Descriptions.Item label="Сумма">{formatAmount(doc.amount, doc.currency)}</Descriptions.Item>
              </Descriptions>
            </Card>
          </Col>
          <Col xs={24} md={10}>
            <Card size="small" title="Техническая информация">
              <Descriptions column={1} size="small">
                <Descriptions.Item label="ID документа портала">{doc.id}</Descriptions.Item>
                <Descriptions.Item label="Версия">{doc.version}</Descriptions.Item>
                <Descriptions.Item label="Пакет">{doc.packageId || '—'}</Descriptions.Item>
                <Descriptions.Item label="ID (route)">
                  <Text type="secondary">{id}</Text>
                </Descriptions.Item>
              </Descriptions>
            </Card>
          </Col>
        </Row>
      )
    },
    {
      key: 'files',
      label: `Файлы (${files.length})`,
      children: (
        <Card size="small">
          <Space direction="vertical" style={{ width: '100%' }} size="middle">
            {canUploadFiles && (
              <Upload
                beforeUpload={(file) => {
                  // Проверка размера файла (максимум 50 МБ)
                  const maxSize = 50 * 1024 * 1024; // 50 МБ
                  if (file.size > maxSize) {
                    message.error('Размер файла не должен превышать 50 МБ');
                    return false;
                  }
                  handleFileUpload(file);
                  return false; // Предотвращаем автоматическую загрузку
                }}
                showUploadList={false}
                maxCount={1}
                accept="*/*"
              >
                <Button 
                  icon={<UploadOutlined />} 
                  loading={uploading}
                  type="primary"
                >
                  Загрузить файл
                </Button>
              </Upload>
            )}
            {files.length === 0 ? (
              <Text type="secondary">Файлы не загружены</Text>
            ) : (
              <List
                dataSource={files}
                renderItem={(file) => (
                  <List.Item
                    actions={[
                      <Button
                        key="download"
                        type="link"
                        icon={<DownloadOutlined />}
                        onClick={async () => {
                          try {
                            await api.files.download(file.id);
                          } catch (error: any) {
                            message.error('Ошибка при скачивании файла: ' + (error.message || 'Неизвестная ошибка'));
                          }
                        }}
                      >
                        Скачать
                      </Button>,
                      canUploadFiles && (
                        <Popconfirm
                          key="delete"
                          title="Удаление файла"
                          description={`Удалить файл "${file.name}"?`}
                          onConfirm={() => handleFileDelete(file.id)}
                          okText="Удалить"
                          okType="danger"
                          cancelText="Отмена"
                        >
                          <Button
                            type="link"
                            danger
                            icon={<DeleteOutlined />}
                            loading={deletingFileId === file.id}
                          >
                            Удалить
                          </Button>
                        </Popconfirm>
                      )
                    ].filter(Boolean)}
                  >
                    <List.Item.Meta
                      title={<Text>{file.name}</Text>}
                      description={
                        <Space direction="vertical" size={0}>
                          <Text type="secondary">
                            Размер: {formatFileSize(file.size || 0)}
                          </Text>
                          <Text type="secondary">
                            Загружен {dayjs(file.uploadedAt).format('DD.MM.YYYY HH:mm')} пользователем {file.uploadedBy || 'система'}
                          </Text>
                          {file.hash && (
                            <Text type="secondary" style={{ fontSize: '12px', fontFamily: 'monospace' }}>
                              Хэш: {file.hash.substring(0, 16)}...
                            </Text>
                          )}
                        </Space>
                      }
                    />
                  </List.Item>
                )}
              />
            )}
          </Space>
        </Card>
      )
    },
    {
      key: 'checks',
      label: 'Проверки',
      children: (
        <Card size="small">
          {checks.map((c) => (
            <div key={c.id} style={{ marginBottom: 12 }}>
              <Space>
                <Tag
                  color={
                    c.level === 'error'
                      ? 'error'
                      : c.level === 'warning'
                      ? 'warning'
                      : 'default'
                  }
                >
                  {c.level === 'error' ? 'Ошибка' : 'Предупреждение'}
                </Tag>
                <Tag>{c.source}</Tag>
                {c.field && <Tag color="default">{c.field}</Tag>}
              </Space>
              <div>
                <Text>{c.message}</Text>
              </div>
            </div>
          ))}
        </Card>
      )
    },
    {
      key: 'history',
      label: 'История',
      children: (
        <Card size="small">
          {history.map((h) => (
            <div key={h.id} style={{ marginBottom: 8 }}>
              <Text strong>{h.at}</Text>{' '}
              <Text type="secondary">{h.user}</Text>
              <div>
                <Text>{h.action}</Text>
              </div>
            </div>
          ))}
        </Card>
      )
    }
  ];

  return (
    <div className="page">
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        <Space align="baseline" size="middle" style={{ width: '100%', justifyContent: 'space-between', flexWrap: 'nowrap' }}>
          <Space align="baseline" size="middle" style={{ flexWrap: 'nowrap' }}>
            <Title level={3} style={{ marginBottom: 0, whiteSpace: 'nowrap' }}>
              Документ {doc.number}
            </Title>
            <Tag color={portal.color}>{portal.text}</Tag>
            <Tag color={uh.color}>{uh.text}</Tag>
            {canEdit ? (
              <Tag icon={<EditOutlined />} color="green">Редактируемый</Tag>
            ) : (
              <Tag icon={<LockOutlined />} color="default">Только чтение</Tag>
            )}
          </Space>
          <Space style={{ flexWrap: 'nowrap' }}>
            {canEdit && (
              <Button 
                type="primary"
                icon={<EditOutlined />}
                onClick={() => navigate(`/documents/${id}/edit`)}
              >
                Редактировать
              </Button>
            )}
            {availableTransitions.length > 0 && (
              <Dropdown
                menu={{
                  items: availableTransitions.map(status => ({
                    key: status,
                    label: statusTransitionLabels[status] || status,
                    onClick: () => handleStatusChange(status)
                  }))
                }}
                trigger={['click']}
              >
                <Button 
                  icon={<CheckCircleOutlined />}
                  loading={changingStatus}
                >
                  Изменить статус
                </Button>
              </Dropdown>
            )}
            {canCancel && (
              <Button 
                danger 
                icon={<StopOutlined />}
                onClick={handleCancel}
                loading={cancelling}
              >
                Отменить документ
              </Button>
            )}
            {canDelete && (
              <Button 
                danger 
                icon={<DeleteOutlined />}
                onClick={handleDelete}
                loading={deleting}
              >
                Удалить
              </Button>
            )}
          </Space>
        </Space>
        <Tabs items={items} />
      </Space>
    </div>
  );
}

