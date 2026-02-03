import { Card, Col, Row, Space, Tabs, Tag, Typography } from 'antd';
import { ApartmentOutlined, DatabaseOutlined, CloudSyncOutlined, SafetyOutlined, ThunderboltOutlined } from '@ant-design/icons';
import { ArchitectureComponentsSvg } from '../components/ArchitectureComponentsSvg';

const { Title, Paragraph, Text } = Typography;

export function EcofArchitecturePage() {
  return (
    <div className="page">
      <Space direction="vertical" size={16} style={{ width: '100%' }}>
        <Card variant="outlined">
          <Space direction="vertical" size={8} style={{ width: '100%' }}>
            <Title level={3} style={{ margin: 0 }}>
              Архитектура high-load: Портал ↔ 1С:УХ
            </Title>
            <Paragraph type="secondary" style={{ margin: 0 }}>
              Страница для администраторов ЕЦОФ: как хранить данные, кэшировать большие справочники и строить надежную интеграцию
              с 1С:УХ при высокой нагрузке.
            </Paragraph>
            <Space wrap>
              <Tag icon={<SafetyOutlined />}>Безопасность (strict contracts)</Tag>
              <Tag icon={<ThunderboltOutlined />}>Производительность (read-model + cache)</Tag>
              <Tag icon={<CloudSyncOutlined />}>Асинхронная интеграция (queue/workers)</Tag>
              <Tag icon={<DatabaseOutlined />}>Source of truth: Portal DB + УХ</Tag>
            </Space>
          </Space>
        </Card>

        <Tabs
          items={[
            {
              key: 'overview',
              label: 'Обзор',
              children: (
                <Row gutter={[16, 16]}>
                  <Col xs={24} lg={12}>
                    <Card title={<Space><ApartmentOutlined /> Компоненты</Space>} variant="borderless">
                      <Paragraph style={{ marginTop: 0 }}>
                        Пользователь работает только в портале. 1С:УХ остаётся учетным ядром. Все тяжёлые операции (интеграция, НСИ,
                        витрины) — в воркерах.
                      </Paragraph>
                      <ul style={{ margin: 0, paddingLeft: 18 }}>
                        <li>
                          <Text strong>Portal DB (write model)</Text>: документы, версии, файлы, очередь, карточки объектов.
                        </li>
                        <li>
                          <Text strong>Read-model / Search</Text>: быстрые списки/поиск по “большим” данным.
                        </li>
                        <li>
                          <Text strong>Redis</Text>: горячие lookup’и (подписки/НСИ/карточки) + TTL.
                        </li>
                        <li>
                          <Text strong>Workers</Text>: очередь → УХ, sync НСИ, прогрев кэша, обновление индекса.
                        </li>
                      </ul>
                    </Card>
                  </Col>

                  <Col xs={24} lg={12}>
                    <Card title={<Space><CloudSyncOutlined /> Потоки</Space>} variant="borderless">
                      <ul style={{ margin: 0, paddingLeft: 18 }}>
                        <li>
                          <Text strong>Документ → Freeze → Queue → УХ</Text>: идемпотентность, ретраи, статусы.
                        </li>
                        <li>
                          <Text strong>НСИ delta</Text>: bulk upsert + инвалидация кэшей + обновление витрин.
                        </li>
                        <li>
                          <Text strong>Подписки</Text>: ограничивают поля/справочники в формах документов.
                        </li>
                      </ul>
                    </Card>
                  </Col>
                </Row>
              )
            },
            {
              key: 'components',
              label: 'Схема компонентов',
              children: (
                <Card variant="borderless">
                  <ArchitectureComponentsSvg />
                </Card>
              )
            },
            {
              key: 'flows',
              label: 'Потоки',
              children: (
                <Row gutter={[16, 16]}>
                  <Col xs={24} xl={12}>
                    <Card variant="borderless" title="Документ → 1С:УХ">
                      <Typography.Paragraph type="secondary" style={{ marginTop: 0 }}>
                        Для high-load документ в портале “замораживается” и попадает в персистентную очередь. Воркеры отправляют его в УХ,
                        обрабатывают ответы и обновляют статусы.
                      </Typography.Paragraph>
                      <ul style={{ margin: 0, paddingLeft: 18 }}>
                        <li><Text strong>Draft</Text> → <Text strong>Frozen</Text> (версионирование)</li>
                        <li><Text strong>Queue</Text>: idempotency_key + retries</li>
                        <li><Text strong>УХ</Text>: POST /hs/ecof/documents</li>
                        <li><Text strong>Статусы</Text>: Accepted/Posted/Error</li>
                      </ul>
                    </Card>
                  </Col>
                  <Col xs={24} xl={12}>
                    <Card variant="borderless" title="НСИ delta → Портал (кэш/витрины)">
                      <Typography.Paragraph type="secondary" style={{ marginTop: 0 }}>
                        НСИ — мастер в УХ. Портал получает дельту, делает bulk upsert и инвалидацию кэшей/витрин.
                      </Typography.Paragraph>
                      <ul style={{ margin: 0, paddingLeft: 18 }}>
                        <li><Text strong>GET</Text> /hs/ecof/nsi/delta?version=N</li>
                        <li><Text strong>Upsert</Text> в таблицы НСИ (contracts/warehouses/accounts/nomenclature...)</li>
                        <li><Text strong>Redis</Text>: invalidate hot keys</li>
                        <li><Text strong>Read-model/Search</Text>: обновление витрин (опционально)</li>
                      </ul>
                    </Card>
                  </Col>
                </Row>
              )
            },
            {
              key: 'data',
              label: 'Данные и кэш',
              children: (
                <Row gutter={[16, 16]}>
                  <Col xs={24} lg={12}>
                    <Card variant="borderless" title="Write-model (Portal DB)">
                      <Paragraph type="secondary" style={{ marginTop: 0 }}>
                        Источник истины для портальных сущностей и очередей.
                      </Paragraph>
                      <ul style={{ margin: 0, paddingLeft: 18 }}>
                        <li>
                          <Text code>documents</Text>, <Text code>document_versions</Text>, <Text code>document_files</Text>
                        </li>
                        <li>
                          <Text code>uh_integration_queue</Text> (идемпотентность, статусы, ретраи)
                        </li>
                        <li>
                          НСИ-копия: <Text code>contracts</Text>, <Text code>warehouses</Text>, <Text code>accounts</Text>, <Text code>nomenclature</Text>…
                        </li>
                        <li>
                          Объекты учета: <Text code>object_cards</Text> (+ schema + history)
                        </li>
                      </ul>
                    </Card>
                  </Col>
                  <Col xs={24} lg={12}>
                    <Card variant="borderless" title="Read-model + Redis">
                      <Paragraph type="secondary" style={{ marginTop: 0 }}>
                        Ускорение чтения и поиска по “большим” данным без потери надежности.
                      </Paragraph>
                      <ul style={{ margin: 0, paddingLeft: 18 }}>
                        <li>
                          Read replica / отдельная read БД для списков и фильтров.
                        </li>
                        <li>
                          Search (Elastic/OpenSearch) для полнотекстового поиска и сложных фильтров.
                        </li>
                        <li>
                          Redis кэш: подписки/права, горячие lookup’и по НСИ, “директории” карточек.
                        </li>
                      </ul>
                    </Card>
                  </Col>
                </Row>
              )
            }
          ]}
        />
      </Space>
    </div>
  );
}

