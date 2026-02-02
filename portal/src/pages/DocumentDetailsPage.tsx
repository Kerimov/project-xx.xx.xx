import { Card, Col, Descriptions, Row, Space, Tabs, Tag, Typography, Button, message, Dropdown, Modal, Upload, List, Popconfirm, Timeline } from 'antd';
import type { TabsProps } from 'antd';
import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { StopOutlined, CheckCircleOutlined, LockOutlined, EditOutlined, DeleteOutlined, UploadOutlined, DownloadOutlined, CopyOutlined } from '@ant-design/icons';
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

/** Подписи для пунктов «Изменить статус»: действие или название статуса по-русски */
const statusTransitionLabels: Record<string, string> = {
  Draft: 'Вернуть в черновик',
  Validated: 'Пометить как проверенный',
  Frozen: 'Заморозить',
  Cancelled: 'Отменить',
  QueuedToUH: 'В очереди в УХ',
  SentToUH: 'Отправлен в УХ',
  AcceptedByUH: 'Принят УХ',
  PostedInUH: 'Проведен в УХ',
  RejectedByUH: 'Отклонен УХ'
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
  const [copying, setCopying] = useState(false);

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

  const buildCopyPayload = () => {
    return {
      packageId: doc.packageId || null,
      number: `${doc.number}-COPY`,
      date: doc.date,
      type: doc.type,
      organizationId: doc.organizationId,
      counterpartyName: doc.counterpartyName || null,
      counterpartyInn: doc.counterpartyInn || null,
      amount: doc.amount ?? doc.totalAmount ?? 0,
      currency: doc.currency || 'RUB',
      contractId: doc.contractId || null,
      paymentAccountId: doc.paymentAccountId || null,
      warehouseId: doc.warehouseId || null,
      hasDiscrepancies: doc.hasDiscrepancies ?? false,
      originalReceived: doc.originalReceived ?? false,
      isUPD: doc.isUPD ?? false,
      invoiceRequired: doc.invoiceRequired ?? false,
      items: doc.items || [],
      totalAmount: doc.totalAmount ?? doc.amount ?? 0,
      totalVAT: doc.totalVAT ?? 0,
      dueDate: doc.dueDate || null,
      receiptBasis: doc.receiptBasis || null,
      returnBasis: doc.returnBasis || null,
      documentNumber: doc.documentNumber || null,
      paymentTerms: doc.paymentTerms || null
    };
  };

  const handleCopy = async () => {
    if (!doc) return;
    try {
      setCopying(true);
      const response = await api.documents.create(buildCopyPayload());
      message.success('Документ скопирован');
      navigate(`/documents/${response.data.id}/edit`);
    } catch (error: any) {
      message.error('Ошибка при копировании: ' + (error.message || 'Неизвестная ошибка'));
    } finally {
      setCopying(false);
    }
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

  const formatValue = (value: any): string => {
    if (value === null || value === undefined || value === '') return '—';
    if (typeof value === 'boolean') return value ? 'Да' : 'Нет';
    if (typeof value === 'string' && value.match(/^\d{4}-\d{2}-\d{2}/)) {
      return dayjs(value).format('DD.MM.YYYY');
    }
    return String(value);
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
                <Descriptions.Item label="Организация">{doc.organizationName || doc.company || '—'}</Descriptions.Item>
                {doc.organizationId && (
                  <Descriptions.Item label="ID организации">
                    <Text type="secondary" style={{ fontFamily: 'monospace', fontSize: '12px' }}>
                      {doc.organizationId}
                    </Text>
                  </Descriptions.Item>
                )}
                <Descriptions.Item label="Контрагент">{doc.counterpartyName || doc.counterparty || '—'}</Descriptions.Item>
                {doc.counterpartyId && (
                  <Descriptions.Item label="ID контрагента">
                    <Text type="secondary" style={{ fontFamily: 'monospace', fontSize: '12px' }}>
                      {doc.counterpartyId}
                    </Text>
                  </Descriptions.Item>
                )}
                {doc.counterpartyInn && (
                  <Descriptions.Item label="ИНН контрагента">{doc.counterpartyInn}</Descriptions.Item>
                )}
                {doc.contractId && (
                  <Descriptions.Item label="Договор">
                    <Text type="secondary" style={{ fontFamily: 'monospace', fontSize: '12px' }}>
                      {doc.contractId}
                    </Text>
                  </Descriptions.Item>
                )}
                {(doc.warehouseName || doc.warehouseId) && (
                  <Descriptions.Item label="Склад">
                    {doc.warehouseName || (
                      <Text type="secondary" style={{ fontFamily: 'monospace', fontSize: '12px' }}>
                        {doc.warehouseId}
                      </Text>
                    )}
                  </Descriptions.Item>
                )}
                {doc.paymentAccountId && (
                  <Descriptions.Item label="Счет оплаты">
                    <Text type="secondary" style={{ fontFamily: 'monospace', fontSize: '12px' }}>
                      {doc.paymentAccountId}
                    </Text>
                  </Descriptions.Item>
                )}
                <Descriptions.Item label="Сумма">{formatAmount(doc.amount || doc.totalAmount, doc.currency)}</Descriptions.Item>
                {doc.totalVAT !== undefined && doc.totalVAT !== null && (
                  <Descriptions.Item label="НДС">{formatAmount(doc.totalVAT, doc.currency)}</Descriptions.Item>
                )}
                <Descriptions.Item label="Валюта">{doc.currency || 'RUB'}</Descriptions.Item>
              </Descriptions>
            </Card>
          </Col>
          <Col xs={24} md={10}>
            <Card size="small" title="Дополнительные реквизиты">
              <Descriptions column={1} size="small">
                {doc.dueDate && (
                  <Descriptions.Item label="Срок оплаты">{formatValue(doc.dueDate)}</Descriptions.Item>
                )}
                {doc.documentNumber && (
                  <Descriptions.Item label="Номер документа-основания">{doc.documentNumber}</Descriptions.Item>
                )}
                {doc.paymentTerms && (
                  <Descriptions.Item label="Условия оплаты">{doc.paymentTerms}</Descriptions.Item>
                )}
                {doc.receiptBasis && (
                  <Descriptions.Item label="Основание оприходования">{doc.receiptBasis}</Descriptions.Item>
                )}
                {doc.returnBasis && (
                  <Descriptions.Item label="Основание возврата">{doc.returnBasis}</Descriptions.Item>
                )}
                <Descriptions.Item label="Есть расхождения">
                  {formatValue(doc.hasDiscrepancies)}
                </Descriptions.Item>
                <Descriptions.Item label="Оригинал получен">
                  {formatValue(doc.originalReceived)}
                </Descriptions.Item>
                <Descriptions.Item label="УПД">
                  {formatValue(doc.isUPD)}
                </Descriptions.Item>
                <Descriptions.Item label="Требуется счет">
                  {formatValue(doc.invoiceRequired)}
                </Descriptions.Item>
              </Descriptions>
            </Card>
            <Card size="small" title="Техническая информация" style={{ marginTop: 16 }}>
              <Descriptions column={1} size="small">
                <Descriptions.Item label="ID документа портала">
                  <Text type="secondary" style={{ fontFamily: 'monospace', fontSize: '12px' }}>
                    {doc.id}
                  </Text>
                </Descriptions.Item>
                <Descriptions.Item label="Версия">{doc.version}</Descriptions.Item>
                <Descriptions.Item label="Пакет">{doc.packageId || '—'}</Descriptions.Item>
                <Descriptions.Item label="Статус портала">
                  <Tag color={portal.color}>{portal.text}</Tag>
                </Descriptions.Item>
                <Descriptions.Item label="Статус УХ">
                  <Tag color={uh.color}>{uh.text}</Tag>
                </Descriptions.Item>
              </Descriptions>
            </Card>
          </Col>
          {doc.items && doc.items.length > 0 && (
            <Col xs={24}>
              <Card size="small" title={`Позиции документа (${doc.items.length})`}>
                <List
                  size="small"
                  dataSource={doc.items}
                  renderItem={(item: any, index: number) => (
                    <List.Item>
                      <List.Item.Meta
                        title={
                          <Space>
                            <Text strong>Позиция {index + 1}</Text>
                            {item.rowNumber && (
                              <Text type="secondary">(строка {item.rowNumber})</Text>
                            )}
                          </Space>
                        }
                        description={
                          <Space direction="vertical" size={4} style={{ width: '100%' }}>
                            {(item.nomenclatureName || item.name) && (
                              <Text>Номенклатура: {item.nomenclatureName || item.name}</Text>
                            )}
                            <Space wrap>
                              {item.quantity !== undefined && item.quantity !== null && (
                                <Text>Количество: {item.quantity}</Text>
                              )}
                              {item.unit && <Text>Ед. изм.: {item.unit}</Text>}
                              {item.price !== undefined && item.price !== null && (
                                <Text>Цена: {formatAmount(item.price, doc.currency)}</Text>
                              )}
                              {item.amount !== undefined && item.amount !== null && (
                                <Text>Сумма: {formatAmount(item.amount, doc.currency)}</Text>
                              )}
                            </Space>
                            <Space wrap>
                              {item.vatPercent !== undefined && item.vatPercent !== null && (
                                <Text>НДС %: {item.vatPercent}</Text>
                              )}
                              {item.vatAmount !== undefined && item.vatAmount !== null && (
                                <Text>НДС: {formatAmount(item.vatAmount, doc.currency)}</Text>
                              )}
                              {item.totalAmount !== undefined && item.totalAmount !== null && (
                                <Text strong>Всего: {formatAmount(item.totalAmount, doc.currency)}</Text>
                              )}
                            </Space>
                            {item.accountId && (
                              <Text type="secondary" style={{ fontSize: '12px', fontFamily: 'monospace' }}>
                                Счет: {item.accountId}
                              </Text>
                            )}
                            {item.countryOfOrigin && (
                              <Text type="secondary">Страна происхождения: {item.countryOfOrigin}</Text>
                            )}
                            {item.type && (
                              <Tag>{item.type === 'goods' ? 'Товар' : item.type === 'services' ? 'Услуга' : 'Комиссия'}</Tag>
                            )}
                          </Space>
                        }
                      />
                    </List.Item>
                  )}
                />
              </Card>
            </Col>
          )}
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
      label: `Проверки (${checks.length})`,
      children: (
        <Card size="small">
          {checks.length === 0 ? (
            <Text type="secondary">Проверки отсутствуют</Text>
          ) : (
            <List
              dataSource={checks}
              renderItem={(c) => (
                <List.Item>
                  <List.Item.Meta
                    title={
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
                          {c.level === 'error' ? 'Ошибка' : c.level === 'warning' ? 'Предупреждение' : 'Информация'}
                        </Tag>
                        <Tag>{c.source}</Tag>
                        {c.field && <Tag color="default">{c.field}</Tag>}
                      </Space>
                    }
                    description={<Text>{c.message}</Text>}
                  />
                </List.Item>
              )}
            />
          )}
        </Card>
      )
    },
    {
      key: 'history',
      label: `История (${history.length})`,
      children: (
        <Card size="small">
          {history.length === 0 ? (
            <Text type="secondary">История изменений отсутствует</Text>
          ) : (
            <Timeline
              items={history.map((h) => {
                const details = h.details;
                const changedFields = details?.changedFields || [];
                
                return {
                  children: (
                    <Space direction="vertical" size={8} style={{ width: '100%' }}>
                      <Space>
                        <Text strong>{h.action}</Text>
                      </Space>
                      <Space>
                        <Text type="secondary" style={{ fontSize: '12px' }}>
                          {dayjs(h.at).format('DD.MM.YYYY HH:mm:ss')}
                        </Text>
                        <Text type="secondary" style={{ fontSize: '12px' }}>
                          • {h.user || 'Система'}
                        </Text>
                      </Space>
                      {changedFields.length > 0 && (
                        <div style={{ marginTop: 8, paddingLeft: 16, borderLeft: '2px solid #d9d9d9' }}>
                          <Text type="secondary" style={{ fontSize: '12px', fontWeight: 500 }}>
                            Измененные поля:
                          </Text>
                          <List
                            size="small"
                            dataSource={changedFields}
                            renderItem={(field: any) => {
                              // Функция для форматирования значений
                              const formatValue = (value: any): string => {
                                if (value === null || value === undefined) return '(пусто)';
                                if (Array.isArray(value)) {
                                  return `[${value.length} элементов]`;
                                }
                                if (typeof value === 'object') {
                                  return `{объект}`;
                                }
                                if (typeof value === 'string' && value.match(/^\d{4}-\d{2}-\d{2}/)) {
                                  // Дата в формате ISO
                                  return dayjs(value).format('DD.MM.YYYY');
                                }
                                const str = String(value);
                                return str.length > 50 ? str.substring(0, 50) + '...' : str;
                              };

                              return (
                                <List.Item style={{ padding: '4px 0', border: 'none' }}>
                                  <Space direction="vertical" size={2} style={{ width: '100%' }}>
                                    <Text style={{ fontSize: '12px' }}>
                                      <Text strong>{field.label || field.field}:</Text>
                                    </Text>
                                    <Space style={{ fontSize: '11px', paddingLeft: 8 }} wrap>
                                      <Text delete type="secondary">
                                        {formatValue(field.oldValue)}
                                      </Text>
                                      <Text>→</Text>
                                      <Text type="success">
                                        {formatValue(field.newValue)}
                                      </Text>
                                    </Space>
                                  </Space>
                                </List.Item>
                              );
                            }}
                          />
                        </div>
                      )}
                    </Space>
                  )
                };
              })}
            />
          )}
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
            <Button
              icon={<CopyOutlined />}
              onClick={handleCopy}
              loading={copying}
            >
              Копировать
            </Button>
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
                    label: statusTransitionLabels[status] ?? portalStatusLabel[status]?.text ?? status,
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

