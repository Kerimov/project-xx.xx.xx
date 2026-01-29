import { Card, Col, Descriptions, Row, Space, Tabs, Tag, Typography, Button, message, Dropdown } from 'antd';
import type { TabsProps } from 'antd';
import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { StopOutlined, CheckCircleOutlined, LockOutlined, EditOutlined } from '@ant-design/icons';
import { api } from '../services/api';

const { Title, Text } = Typography;

const portalStatusLabel: Record<string, { text: string; color: string }> = {
  Draft: { text: 'Черновик', color: 'default' },
  Validated: { text: 'Проверен', color: 'processing' },
  Frozen: { text: 'Заморожен', color: 'geekblue' },
  QueuedToUH: { text: 'В очереди в УХ', color: 'processing' },
  SentToUH: { text: 'Отправлен в УХ', color: 'processing' }
};

const uhStatusLabel: Record<string, { text: string; color: string }> = {
  None: { text: '—', color: 'default' },
  Accepted: { text: 'Принят', color: 'processing' },
  Posted: { text: 'Проведён', color: 'success' },
  Error: { text: 'Ошибка', color: 'error' }
};

export function DocumentDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [doc, setDoc] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [statusTransitions, setStatusTransitions] = useState<{
    currentStatus: string;
    editable: boolean;
    availableTransitions: string[];
  } | null>(null);
  const [changingStatus, setChangingStatus] = useState(false);

  useEffect(() => {
    if (!id) return;
    const loadDocument = async () => {
      try {
        setLoading(true);
        setError(null);
        const [docResponse, transitionsResponse] = await Promise.all([
          api.documents.getById(id),
          api.documents.getStatusTransitions(id).catch(() => null)
        ]);
        setDoc(docResponse.data);
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

  const files = doc.files ?? [];
  const checks = doc.checks ?? [];
  const history = doc.history ?? [];

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
      label: 'Файлы',
      children: (
        <Card size="small">
          {files.map((f) => (
            <div key={f.id} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
              <Space direction="vertical" size={0}>
                <Text>{f.name}</Text>
                <Text type="secondary">
                  Загружен {f.uploadedAt} пользователем {f.uploadedBy}
                </Text>
                <Text type="secondary">Хэш: {f.hash}</Text>
              </Space>
              <a>Скачать</a>
            </div>
          ))}
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
        <Space align="baseline" size="middle" style={{ width: '100%', justifyContent: 'space-between' }}>
          <Space align="baseline" size="middle">
            <Title level={3} style={{ marginBottom: 0 }}>
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
          <Space>
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
          </Space>
        </Space>
        <Tabs items={items} />
      </Space>
    </div>
  );
}

