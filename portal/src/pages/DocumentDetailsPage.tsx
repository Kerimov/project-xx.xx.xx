import { Card, Col, Descriptions, Row, Space, Tabs, Tag, Typography } from 'antd';
import type { TabsProps } from 'antd';
import { useParams } from 'react-router-dom';

const { Title, Text } = Typography;

const mockDocument = {
  id: '1',
  number: 'СФ-000123',
  date: '22.01.2026',
  type: 'Счёт-фактура',
  company: 'Дочка 1',
  counterparty: 'ООО «Поставщик»',
  amount: 123456.78,
  currency: 'RUB',
  portalStatus: 'Frozen',
  uhStatus: 'Accepted',
  version: 'v1',
  package: 'PKG-2026-01-001'
};

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

const files = [
  {
    id: 'f1',
    name: 'scan_sf-000123.pdf',
    uploadedAt: '22.01.2026 09:15',
    uploadedBy: 'user1',
    hash: 'e3b0c442...'
  }
];

const checks = [
  {
    id: 'c1',
    source: 'Портал',
    level: 'warning',
    message: 'Отсутствует ИНН контрагента, заполните позже.',
    field: 'ИНН контрагента'
  },
  {
    id: 'c2',
    source: 'УХ',
    level: 'error',
    message: 'Не найден договор с указанным контрагентом.',
    field: 'Договор'
  }
];

const history = [
  { id: 'h1', at: '22.01.2026 09:10', user: 'user1', action: 'Создан черновик' },
  { id: 'h2', at: '22.01.2026 09:12', user: 'user1', action: 'Заморожена версия v1' },
  { id: 'h3', at: '22.01.2026 09:20', user: 'system', action: 'Отправлен в УХ' },
  { id: 'h4', at: '22.01.2026 09:25', user: 'system', action: 'Принят УХ' }
];

export function DocumentDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const doc = mockDocument; // временно используем заглушку

  const portal = portalStatusLabel[doc.portalStatus] ?? {
    text: doc.portalStatus,
    color: 'default'
  };
  const uh = uhStatusLabel[doc.uhStatus] ?? {
    text: doc.uhStatus,
    color: 'default'
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
                <Descriptions.Item label="Сумма">
                  {doc.amount.toLocaleString('ru-RU', {
                    style: 'currency',
                    currency: doc.currency
                  })}
                </Descriptions.Item>
              </Descriptions>
            </Card>
          </Col>
          <Col xs={24} md={10}>
            <Card size="small" title="Техническая информация">
              <Descriptions column={1} size="small">
                <Descriptions.Item label="ID документа портала">{doc.id}</Descriptions.Item>
                <Descriptions.Item label="Версия">{doc.version}</Descriptions.Item>
                <Descriptions.Item label="Пакет">{doc.package}</Descriptions.Item>
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

