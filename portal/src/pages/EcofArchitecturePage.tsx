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
              Простое объяснение “как это работает” для бизнес‑заказчика: где хранятся данные, зачем нужен кэш, и почему интеграция с 1С:УХ
              сделана через очередь при высокой нагрузке.
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
                          <div style={{ marginTop: 4 }}>
                            <Text type="secondary">
                              Это “главная бухгалтерская тетрадь” портала: сюда в первую очередь записываются факты. Это источник правды по данным портала.
                            </Text>
                          </div>
                        </li>
                        <li>
                          <Text strong>Read-model / Search</Text>: быстрые списки/поиск по “большим” данным.
                          <div style={{ marginTop: 4 }}>
                            <Text type="secondary">
                              Это “витрина” для быстрого чтения: чтобы списки и поиск открывались мгновенно, даже если данных очень много.
                            </Text>
                          </div>
                          <div style={{ marginTop: 6 }}>
                            <Text type="secondary">
                              Почему это быстро: мы заранее готовим данные “как для витрины” (простые таблицы/индекс под списки), добавляем правильные индексы
                              под фильтры и при необходимости читаем из отдельного контура “только для чтения”, чтобы чтение не мешало сохранению документов.
                            </Text>
                          </div>
                          <div style={{ marginTop: 6 }}>
                            <Text type="secondary">
                              Как мы понимаем, что готовить: мы не угадываем — смотрим, какие экраны и списки есть в портале (документы, номенклатура, карточки объектов),
                              какие фильтры и поля там используются, и под эти запросы делаем витрину. Когда появляются новые списки или фильтры — витрину дорабатываем.
                            </Text>
                          </div>
                        </li>
                        <li>
                          <Text strong>Redis</Text>: горячие lookup’и (подписки/НСИ/карточки) + TTL.
                          <div style={{ marginTop: 4 }}>
                            <Text type="secondary">
                              Это “быстрая память”: хранит часто используемые результаты на короткое время (TTL), чтобы не нагружать базу одинаковыми запросами.
                            </Text>
                          </div>
                        </li>
                        <li>
                          <Text strong>Workers</Text>: очередь → УХ, sync НСИ, прогрев кэша, обновление индекса.
                          <div style={{ marginTop: 4 }}>
                            <Text type="secondary">
                              Это “фоновые исполнители”: делают долгие задачи без ожидания пользователя (отправка в 1С, обновление справочников, подготовка витрин).
                            </Text>
                          </div>
                        </li>
                      </ul>
                    </Card>
                  </Col>

                  <Col xs={24} lg={12}>
                    <Card title={<Space><CloudSyncOutlined /> Потоки</Space>} variant="borderless">
                      <ul style={{ margin: 0, paddingLeft: 18 }}>
                        <li>
                          <Text strong>Документ → Freeze → Queue → УХ</Text>: идемпотентность, ретраи, статусы.
                          <div style={{ marginTop: 4 }}>
                            <Text type="secondary">
                              Документ “фиксируется” (Freeze), затем попадает в надежную очередь (Queue). Это нужно, чтобы при нагрузке или сбоях документ
                              не потерялся и был доставлен в 1С с понятным статусом.
                            </Text>
                          </div>
                        </li>
                        <li>
                          <Text strong>НСИ delta</Text>: bulk upsert + инвалидация кэшей + обновление витрин.
                          <div style={{ marginTop: 4 }}>
                            <Text type="secondary">
                              Справочники (контрагенты, договоры, склады и т.д.) приходят из 1С порциями “что изменилось”. Портал обновляет свою копию и сбрасывает
                              устаревший кэш, чтобы пользователи сразу видели актуальные данные.
                            </Text>
                          </div>
                        </li>
                        <li>
                          <Text strong>Подписки</Text>: ограничивают поля/справочники в формах документов.
                          <div style={{ marginTop: 4 }}>
                            <Text type="secondary">
                              Подписки — это правила доступа: организация видит в формах только “свои” аналитики/карточки, чтобы исключить ошибки выбора и лишние данные.
                            </Text>
                          </div>
                        </li>
                      </ul>
                    </Card>
                  </Col>

                  <Col xs={24}>
                    <Card variant="borderless" title="Термины (по‑человечески)">
                      <Row gutter={[16, 16]}>
                        <Col xs={24} md={12}>
                          <ul style={{ margin: 0, paddingLeft: 18 }}>
                            <li>
                              <Text strong>Write‑model</Text>
                              <div style={{ marginTop: 4 }}>
                                <Text type="secondary">Операционная запись фактов. Сюда мы “пишем” то, что произошло (документ создан, заморожен, отправлен).</Text>
                              </div>
                            </li>
                            <li>
                              <Text strong>Read‑model</Text>
                              <div style={{ marginTop: 4 }}>
                                <Text type="secondary">Витрина для чтения. Делается специально, чтобы списки/поиск были быстрыми и не тормозили основную базу.</Text>
                              </div>
                            </li>
                            <li>
                              <Text strong>Кэш (Redis)</Text>
                              <div style={{ marginTop: 4 }}>
                                <Text type="secondary">Временная “быстрая память” с ограниченным сроком жизни (TTL). Ускоряет повторяющиеся запросы.</Text>
                              </div>
                            </li>
                          </ul>
                        </Col>
                        <Col xs={24} md={12}>
                          <ul style={{ margin: 0, paddingLeft: 18 }}>
                            <li>
                              <Text strong>Очередь</Text>
                              <div style={{ marginTop: 4 }}>
                                <Text type="secondary">Надежный список задач “на отправку/обработку”. Даже если что‑то упало — задача не пропадает.</Text>
                              </div>
                            </li>
                            <li>
                              <Text strong>Идемпотентность</Text>
                              <div style={{ marginTop: 4 }}>
                                <Text type="secondary">Защита от дублей: повторная отправка той же операции не создаст второй документ/проводку.</Text>
                              </div>
                            </li>
                            <li>
                              <Text strong>Ретраи</Text>
                              <div style={{ marginTop: 4 }}>
                                <Text type="secondary">Автоповторы при временных ошибках (например, сеть/недоступность 1С) — без участия пользователя.</Text>
                              </div>
                            </li>
                          </ul>
                        </Col>
                      </Row>
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
                  <Paragraph type="secondary" style={{ marginTop: 12, marginBottom: 0 }}>
                    Как читать схему: пользователь работает в портале. Портал сохраняет данные в свою базу. Дальше “фоновые исполнители” отправляют документы в 1С и
                    обновляют справочники. Кэш и read‑model нужны только для скорости.
                  </Paragraph>
                  <ul style={{ margin: '12px 0 0', paddingLeft: 18 }}>
                    <li>
                      <Text strong>Portal DB</Text>
                      <div style={{ marginTop: 4 }}>
                        <Text type="secondary">Надежное хранение: если кэш очистится или воркер перезапустится — данные не потеряются.</Text>
                      </div>
                    </li>
                    <li>
                      <Text strong>Workers</Text>
                      <div style={{ marginTop: 4 }}>
                        <Text type="secondary">Делают работу “в фоне”: пользователю не нужно ждать долгие операции и ловить ошибки интеграции вручную.</Text>
                      </div>
                    </li>
                    <li>
                      <Text strong>Redis + Read‑model/Search</Text>
                      <div style={{ marginTop: 4 }}>
                        <Text type="secondary">Это ускорители: помогают быстро показывать списки/поиск по большим справочникам и карточкам.</Text>
                      </div>
                    </li>
                    <li>
                      <Text strong>1С:УХ</Text>
                      <div style={{ marginTop: 4 }}>
                        <Text type="secondary">Учетное ядро: проведение. Портал “доставляет” в 1С корректные данные.</Text>
                      </div>
                    </li>
                  </ul>
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
                        <li>
                          <Text strong>Draft</Text> → <Text strong>Frozen</Text> (версионирование)
                          <div style={{ marginTop: 4 }}>
                            <Text type="secondary">
                              “Frozen” значит: зафиксировали версию документа для отправки. После этого данные не меняются “втихаря”, поэтому интеграция надежная и проверяемая.
                            </Text>
                          </div>
                        </li>
                        <li>
                          <Text strong>Queue</Text>: idempotency_key + retries
                          <div style={{ marginTop: 4 }}>
                            <Text type="secondary">
                              Очередь гарантирует доставку. Если случился сбой — система попробует снова. А защита от дублей не даст создать “вторую копию”.
                            </Text>
                          </div>
                        </li>
                        <li>
                          <Text strong>УХ</Text>: POST /hs/ecof/documents
                          <div style={{ marginTop: 4 }}>
                            <Text type="secondary">
                              Передача данных в 1С идет через HTTP‑сервис: это формальный канал обмена между системами (как “электронная почта”, только с контролем статусов).
                            </Text>
                          </div>
                        </li>
                        <li>
                          <Text strong>Статусы</Text>: Accepted/Posted/Error
                          <div style={{ marginTop: 4 }}>
                            <Text type="secondary">
                              Пользователь видит понятный результат: “принято”, “проведено”, или “ошибка” (с причиной). Это важно для контроля и SLA.
                            </Text>
                          </div>
                        </li>
                      </ul>
                    </Card>
                  </Col>
                  <Col xs={24} xl={12}>
                    <Card variant="borderless" title="НСИ delta → Портал (кэш/витрины)">
                      <Typography.Paragraph type="secondary" style={{ marginTop: 0 }}>
                        НСИ — мастер в УХ. Портал получает дельту, делает bulk upsert и инвалидацию кэшей/витрин.
                      </Typography.Paragraph>
                      <ul style={{ margin: 0, paddingLeft: 18 }}>
                        <li>
                          <Text strong>GET</Text> /hs/ecof/nsi/delta?version=N
                          <div style={{ marginTop: 4 }}>
                            <Text type="secondary">Портал спрашивает у 1С “что изменилось с прошлого раза”, чтобы не гонять весь справочник целиком.</Text>
                          </div>
                        </li>
                        <li>
                          <Text strong>Upsert</Text> в таблицы НСИ (contracts/warehouses/accounts/nomenclature...)
                          <div style={{ marginTop: 4 }}>
                            <Text type="secondary">Обновляем свою копию справочников: новые записи добавляем, измененные — обновляем. Это нужно для быстрых форм и автозаполнения.</Text>
                          </div>
                        </li>
                        <li>
                          <Text strong>Redis</Text>: invalidate hot keys
                          <div style={{ marginTop: 4 }}>
                            <Text type="secondary">Сбрасываем “устаревшие подсказки” в кэше, чтобы пользователи не видели старые названия/коды.</Text>
                          </div>
                        </li>
                        <li>
                          <Text strong>Read-model/Search</Text>: обновление витрин (опционально)
                          <div style={{ marginTop: 4 }}>
                            <Text type="secondary">Если данных очень много — обновляем витрину/поиск, чтобы фильтры и поиск были быстрыми даже на миллионах строк.</Text>
                          </div>
                        </li>
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
                          <div style={{ marginTop: 4 }}>
                            <Text type="secondary">Документы и их версии: можно восстановить историю, понять кто/когда/что отправлял.</Text>
                          </div>
                        </li>
                        <li>
                          <Text code>uh_integration_queue</Text> (идемпотентность, статусы, ретраи)
                          <div style={{ marginTop: 4 }}>
                            <Text type="secondary">Очередь отправки в 1С: фиксирует статус, ошибки и повторы. Это основа надежной интеграции.</Text>
                          </div>
                        </li>
                        <li>
                          НСИ-копия: <Text code>contracts</Text>, <Text code>warehouses</Text>, <Text code>accounts</Text>, <Text code>nomenclature</Text>…
                          <div style={{ marginTop: 4 }}>
                            <Text type="secondary">Локальная копия справочников из 1С: нужна для быстрых выпадающих списков и поиска прямо в портале.</Text>
                          </div>
                        </li>
                        <li>
                          Объекты учета: <Text code>object_cards</Text> (+ schema + history)
                          <div style={{ marginTop: 4 }}>
                            <Text type="secondary">Карточки объектов учета (например, “Автомобиль”, “Ноутбук”): храним структуру, значения и историю изменений.</Text>
                          </div>
                        </li>
                      </ul>
                    </Card>
                  </Col>
                  <Col xs={24} lg={12}>
                    <Card variant="borderless" title="Read-model + Redis">
                      <Paragraph type="secondary" style={{ marginTop: 0 }}>
                        Ускорение чтения и поиска по “большим” данным без потери надежности.
                      </Paragraph>
                      <Paragraph type="secondary" style={{ marginTop: 0 }}>
                        Простыми словами: чтобы портал не “перелопачивал” миллионы строк каждый раз, мы делаем быстрый слой для чтения (витрины/индекс),
                        а обновляем его в фоне.
                      </Paragraph>
                      <ul style={{ margin: 0, paddingLeft: 18 }}>
                        <li>
                          Read replica / отдельная read БД для списков и фильтров.
                          <div style={{ marginTop: 4 }}>
                            <Text type="secondary">
                              Отдельный контур “только для чтения”: чтобы массовые списки/фильтры не замедляли сохранение документов и интеграцию.
                            </Text>
                          </div>
                        </li>
                        <li>
                          Search (Elastic/OpenSearch) для полнотекстового поиска и сложных фильтров.
                          <div style={{ marginTop: 4 }}>
                            <Text type="secondary">
                              Поиск “как в интернете”: быстро находит по фразам и сочетаниям полей. Особенно полезно для больших справочников и карточек.
                            </Text>
                          </div>
                          <div style={{ marginTop: 6 }}>
                            <Text type="secondary">
                              Технически это отдельный индекс (каталог), куда данные “раскладываются” заранее. Поэтому поиск не делает тяжёлые запросы к основной базе.
                            </Text>
                          </div>
                        </li>
                        <li>
                          Redis кэш: подписки/права, горячие lookup’и по НСИ, “директории” карточек.
                          <div style={{ marginTop: 4 }}>
                            <Text type="secondary">
                              Убирает задержки на повторяющихся запросах (например, когда многие пользователи одновременно открывают одну и ту же форму).
                            </Text>
                          </div>
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

