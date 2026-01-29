import { Card, Col, Row, Statistic, Tag, Typography } from 'antd';

export function DashboardPage() {
  return (
    <div className="page">
      <Typography.Title level={3}>Обзор ЕЦОФ</Typography.Title>
      <Row gutter={[16, 16]}>
        <Col xs={24} md={12} lg={6}>
          <Card>
            <Statistic title="Пакетов в обработке" value={42} />
          </Card>
        </Col>
        <Col xs={24} md={12} lg={6}>
          <Card>
            <Statistic title="Документов с ошибками" value={7} valueStyle={{ color: '#cf1322' }} />
          </Card>
        </Col>
        <Col xs={24} md={12} lg={6}>
          <Card>
            <Statistic title="Проведено за сегодня" value={128} />
          </Card>
        </Col>
        <Col xs={24} md={12} lg={6}>
          <Card>
            <Statistic title="В очереди на УХ" value={315} />
          </Card>
        </Col>
      </Row>
      <Row gutter={[16, 16]} style={{ marginTop: 24 }}>
        <Col xs={24} lg={16}>
          <Card title="Состояние потоков">
            <Tag color="processing">Импорт пакетов</Tag>
            <Tag color="success">Выгрузка в УХ</Tag>
            <Tag color="warning">Ошибки проведения</Tag>
          </Card>
        </Col>
        <Col xs={24} lg={8}>
          <Card title="Быстрые ссылки">
            <ul className="link-list">
              <li>Новые пакеты за сегодня</li>
              <li>Документы с ошибками</li>
              <li>Просроченные пакеты</li>
            </ul>
          </Card>
        </Col>
      </Row>
    </div>
  );
}

