import { Card, Col, Descriptions, Row, Space, Tabs, Tag, Typography } from 'antd';
import type { TabsProps } from 'antd';
import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
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
  const [doc, setDoc] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    const loadDocument = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await api.documents.getById(id);
        setDoc(response.data);
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
        <Space align="baseline" size="middle">
          <Title level={3} style={{ marginBottom: 0 }}>
            Документ {doc.number}
          </Title>
          <Tag color={portal.color}>{portal.text}</Tag>
          <Tag color={uh.color}>{uh.text}</Tag>
        </Space>
        <Tabs items={items} />
      </Space>
    </div>
  );
}

