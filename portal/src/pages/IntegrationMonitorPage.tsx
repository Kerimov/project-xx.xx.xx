import { useState, useEffect } from 'react';
import { Card, Table, Tag, Typography, Statistic, Row, Col, Button, Space, message, Spin, Alert, Tooltip, Input, Modal } from 'antd';
import { ReloadOutlined, SyncOutlined, RedoOutlined, SendOutlined, CopyOutlined } from '@ant-design/icons';
import { api } from '../services/api';
import dayjs from 'dayjs';

const { Title } = Typography;

const statusColorMap: Record<string, string> = {
  Pending: 'processing',
  Processing: 'warning',
  Completed: 'success',
  Failed: 'error'
};

const statusLabelMap: Record<string, string> = {
  Pending: 'В очереди',
  Processing: 'Обрабатывается',
  Completed: 'Завершено',
  Failed: 'Ошибка'
};

const operationTypeMap: Record<string, string> = {
  UpsertDocument: 'Создание/обновление',
  PostDocument: 'Проведение',
  CancelDocument: 'Отмена'
};

export function IntegrationMonitorPage() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ pending: 0, processing: 0, completed: 0, failed: 0 });
  const [items, setItems] = useState<any[]>([]);
  const [authDebugLoading, setAuthDebugLoading] = useState(false);
  const [authDebugResult, setAuthDebugResult] = useState<any | null>(null);
  const [authDebugError, setAuthDebugError] = useState<string | null>(null);
  const [authDebugBaseUrl, setAuthDebugBaseUrl] = useState('');
  const [authDebugUsername, setAuthDebugUsername] = useState('');
  const [authDebugPassword, setAuthDebugPassword] = useState('');
  const [authInfo, setAuthInfo] = useState<{ baseUrl: string; username: string; passwordSet: boolean; insecureTls: boolean } | null>(null);
  const [lastResponse, setLastResponse] = useState<any | null>(null);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [nsiSyncLoading, setNsiSyncLoading] = useState(false);
  const [nsiClearLoading, setNsiClearLoading] = useState(false);
  const [nsiSyncResult, setNsiSyncResult] = useState<{
    success: boolean;
    synced: number;
    total: number;
    failed: number;
    errors: Array<{ type: string; id: string; name?: string; message: string }>;
    version?: number;
    message?: string;
  } | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      const [statsRes, itemsRes] = await Promise.all([
        api.admin.queue.stats(),
        api.admin.queue.items(undefined, 50)
      ]);
      setStats(statsRes.data);
      setItems(itemsRes.data);
    } catch (error: any) {
      message.error('Ошибка загрузки данных: ' + (error.message || 'Неизвестная ошибка'));
    } finally {
      setLoading(false);
    }
  };

  const handleSyncNSI = async () => {
    try {
      setNsiSyncLoading(true);
      setNsiSyncResult(null);
      const res = await api.admin.nsi.sync();
      const data = res.data;
      setNsiSyncResult(data);
      if (data.errors?.length) {
        message.warning(
          `Синхронизация НСИ: ${data.synced} из ${data.total} записей; ошибок: ${data.failed}`
        );
      } else if (data.total === 0 && data.message) {
        message.info(data.message);
      } else {
        message.success(
          data.total > 0
            ? `Синхронизация НСИ завершена: ${data.synced} из ${data.total} записей`
            : 'Синхронизация НСИ выполнена'
        );
      }
    } catch (error: any) {
      const errData = (error as any)?.response?.data?.error?.data;
      if (errData) {
        setNsiSyncResult({
          success: false,
          synced: 0,
          total: 0,
          failed: errData.errors?.length ?? 1,
          errors: errData.errors ?? [{ type: 'System', id: '', message: error.message }]
        });
      } else {
        setNsiSyncResult({
          success: false,
          synced: 0,
          total: 0,
          failed: 1,
          errors: [{ type: 'System', id: '', message: error.message || 'Неизвестная ошибка' }]
        });
      }
      message.error('Ошибка синхронизации НСИ: ' + (error.message || 'Неизвестная ошибка'));
    } finally {
      setNsiSyncLoading(false);
    }
  };

  const handleClearNSI = () => {
    Modal.confirm({
      title: 'Очистить данные НСИ?',
      content: 'Будут удалены все синхронизированные договоры, счета, склады, контрагенты и организации (организации, на которые ссылаются документы, пакеты или пользователи, останутся). После очистки запустите синхронизацию заново.',
      okText: 'Очистить',
      okType: 'danger',
      cancelText: 'Отмена',
      onOk: async () => {
        try {
          setNsiClearLoading(true);
          setNsiSyncResult(null);
          const res = await api.admin.nsi.clear();
          const { cleared, keptOrganizations } = res.data;
          message.success(
            `Очищено: договоров ${cleared.contracts}, счетов ${cleared.accounts}, складов ${cleared.warehouses}, контрагентов ${cleared.counterparties}, организаций ${cleared.organizations}. Оставлено организаций: ${keptOrganizations}. Запустите синхронизацию НСИ.`
          );
        } catch (error: any) {
          message.error('Ошибка очистки НСИ: ' + (error.message || 'Неизвестная ошибка'));
        } finally {
          setNsiClearLoading(false);
        }
      }
    });
  };

  const runAuthDebug = async (endpoint: string, method: string, payload?: Record<string, unknown>) => {
    try {
      setAuthDebugLoading(true);
      setAuthDebugError(null);
      const res = await api.uh.db.authDebug({
        baseUrl: authDebugBaseUrl || undefined,
        username: authDebugUsername || undefined,
        password: authDebugPassword || undefined,
        endpoint,
        method,
        payload
      });
      setAuthDebugResult(res.data);
      message.success(`Проверка авторизации выполнена (${res.data.statusCode})`);
    } catch (error: any) {
      setAuthDebugResult(null);
      setAuthDebugError(error.message || 'Ошибка проверки авторизации');
      message.error(error.message || 'Ошибка проверки авторизации');
    } finally {
      setAuthDebugLoading(false);
    }
  };

  const loadAuthInfo = async () => {
    try {
      const res = await api.uh.db.authInfo();
      setAuthInfo(res.data);
    } catch {
      setAuthInfo(null);
    }
  };

  const applyAuthOverride = async () => {
    if (!authDebugUsername || !authDebugPassword) {
      message.error('Укажите логин и пароль 1С');
      return;
    }
    try {
      setAuthDebugLoading(true);
      const res = await api.uh.db.authOverride({ username: authDebugUsername, password: authDebugPassword });
      setAuthInfo(res.data.auth);
      message.success('Учётные данные применены в backend (без перезапуска)');
    } catch (error: any) {
      message.error(error.message || 'Не удалось применить учётные данные');
    } finally {
      setAuthDebugLoading(false);
    }
  };

  const loadLastResponse = async () => {
    try {
      const res = await api.uh.db.lastResponse();
      setLastResponse(res.data);
    } catch {
      setLastResponse(null);
    }
  };

  const copyNSIErrors = () => {
    if (!nsiSyncResult?.errors?.length) {
      message.warning('Нет ошибок НСИ для копирования.');
      return;
    }
    const lines = nsiSyncResult.errors.map(
      (e: { type: string; id: string; name?: string; message: string }) =>
        `[${e.type}] ${e.id}${e.name ? ' "' + e.name + '"' : ''}: ${e.message}`
    );
    const textToCopy = lines.join('\n');
    navigator.clipboard.writeText(textToCopy).then(
      () => message.success('Ошибки НСИ скопированы'),
      () => message.error('Не удалось скопировать')
    );
  };

  const copyErrorText = () => {
    if (!lastResponse) {
      message.warning('Нет данных для копирования. Нажмите «Обновить».');
      return;
    }
    let textToCopy: string;
    const body = lastResponse.bodyPreview ?? lastResponse.body;
    if (body) {
      try {
        const parsed = typeof body === 'string' ? JSON.parse(body) : body;
        if (parsed && typeof parsed.errorMessage === 'string') {
          textToCopy = parsed.errorMessage;
        } else {
          textToCopy = typeof body === 'string' ? body : JSON.stringify(parsed, null, 2);
        }
      } catch {
        textToCopy = typeof body === 'string' ? body : JSON.stringify(lastResponse, null, 2);
      }
    } else {
      textToCopy = JSON.stringify(lastResponse, null, 2);
    }
    navigator.clipboard.writeText(textToCopy).then(
      () => message.success('Текст ошибки скопирован'),
      () => message.error('Не удалось скопировать')
    );
  };

  const handleRetry = async (queueItemId: string) => {
    try {
      setActionLoadingId(queueItemId);
      await api.admin.queue.retryItem(queueItemId);
      message.success('Задача поставлена в очередь повторно');
      await loadData();
    } catch (error: any) {
      message.error(error.message || 'Ошибка повтора');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleResend = async (documentId: string, queueItemId: string) => {
    try {
      setActionLoadingId(queueItemId);
      await api.admin.queue.resendDocument(documentId);
      message.success('Документ добавлен в очередь');
      await loadData();
    } catch (error: any) {
      message.error(error.message || 'Ошибка переотправки');
    } finally {
      setActionLoadingId(null);
    }
  };

  useEffect(() => {
    loadData();
    loadAuthInfo();
    const interval = setInterval(loadData, 10000); // Обновление каждые 10 секунд
    return () => clearInterval(interval);
  }, []);

  const columns = [
    {
      title: 'Документ',
      key: 'document',
      render: (record: any) => (
        <div>
          <div>{record.documentNumber || record.documentId.substring(0, 8)}</div>
          <div style={{ fontSize: '12px', color: '#999' }}>{record.documentType}</div>
        </div>
      )
    },
    {
      title: 'Операция',
      dataIndex: 'operationType',
      key: 'operationType',
      render: (type: string) => operationTypeMap[type] || type
    },
    {
      title: 'Статус',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => {
        const color = statusColorMap[status] || 'default';
        const label = statusLabelMap[status] || status;
        return <Tag color={color}>{label}</Tag>;
      }
    },
    {
      title: 'Попытки',
      dataIndex: 'attempts',
      key: 'attempts',
      render: (attempts: number) => `${attempts}/3`
    },
    {
      title: 'Создано',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (date: string) => dayjs(date).format('DD.MM.YYYY HH:mm:ss')
    },
    {
      title: 'Обработано',
      dataIndex: 'completedAt',
      key: 'completedAt',
      render: (date: string | null) => date ? dayjs(date).format('DD.MM.YYYY HH:mm:ss') : '-'
    },
    {
      title: 'Действия',
      key: 'actions',
      width: 180,
      render: (_: unknown, record: any) => (
        <Space size="small">
          {(record.status === 'Failed' || record.status === 'Completed') && (
            <Button
              type="link"
              size="small"
              icon={<RedoOutlined />}
              loading={actionLoadingId === record.id}
              onClick={() => handleRetry(record.id)}
            >
              Повторить
            </Button>
          )}
          <Button
            type="link"
            size="small"
            icon={<SendOutlined />}
            loading={actionLoadingId === record.id}
            onClick={() => handleResend(record.documentId, record.id)}
          >
            Переотправить
          </Button>
        </Space>
      )
    },
    {
      title: 'Ошибка',
      dataIndex: 'lastError',
      key: 'lastError',
      render: (error: string | null) => {
        if (!error) return '—';
        const isConnRefused = error.includes('ECONNREFUSED') || error.includes('fetch failed');
        const is401 = error.includes('401');
        const is500 = error.includes('500');
        const shortMsg = isConnRefused
          ? 'Сервер 1С недоступен (ECONNREFUSED)'
          : error.length > 200 ? `${error.substring(0, 200)}…` : error;
        return (
          <Tooltip title={<span style={{ whiteSpace: 'pre-wrap', maxWidth: 400, display: 'block' }}>{error}</span>}>
            <span>
              <Tag color="red">{shortMsg}</Tag>
              {isConnRefused && (
                <Typography.Text type="secondary" style={{ fontSize: 11, display: 'block', marginTop: 4 }}>
                  UH_API_URL — базовый URL (без /documents). Backend вызывает .../ecof/documents, .../ecof/health. Проверьте, что 1С запущена.
                </Typography.Text>
              )}
              {is401 && (
                <Typography.Text type="secondary" style={{ fontSize: 11, display: 'block', marginTop: 4 }}>
                  401 Unauthorized — 1С отклонила авторизацию. Задайте UH_API_USER и UH_API_PASSWORD в backend/.env (логин/пароль пользователя 1С), затем перезапустите backend.
                </Typography.Text>
              )}
              {is500 && (
                <Typography.Text type="secondary" style={{ fontSize: 11, display: 'block', marginTop: 4 }}>
                  Код 500 от 1С — ошибка при обработке документа в УХ (данные, проведение), авторизация при этом прошла успешно.
                </Typography.Text>
              )}
            </span>
          </Tooltip>
        );
      }
    }
  ];

  return (
    <div className="page">
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        <Space>
          <Title level={3} style={{ margin: 0 }}>Интеграция с УХ</Title>
          <Button icon={<ReloadOutlined />} onClick={loadData} loading={loading}>
            Обновить
          </Button>
          <Button icon={<SyncOutlined />} onClick={handleSyncNSI} loading={nsiSyncLoading}>
            Синхронизировать НСИ
          </Button>
          <Button danger onClick={handleClearNSI} loading={nsiClearLoading}>
            Очистить НСИ
          </Button>
        </Space>

        {nsiSyncResult && (
          <Card title="Результат синхронизации НСИ">
            <Space direction="vertical" style={{ width: '100%' }}>
              <Row gutter={16}>
                <Col span={6}>
                  <Statistic title="Всего записей" value={nsiSyncResult.total} />
                </Col>
                <Col span={6}>
                  <Statistic title="Синхронизировано" value={nsiSyncResult.synced} valueStyle={{ color: '#3f8600' }} />
                </Col>
                <Col span={6}>
                  <Statistic title="Ошибок" value={nsiSyncResult.failed} valueStyle={{ color: nsiSyncResult.failed ? '#cf1322' : undefined }} />
                </Col>
              </Row>
            </Space>
          </Card>
        )}

        {nsiSyncResult?.errors && nsiSyncResult.errors.length > 0 && (
          <Card
            title="Ошибки синхронизации НСИ"
            extra={
              <Space>
                <Button
                  icon={<ReloadOutlined />}
                  onClick={handleSyncNSI}
                  loading={nsiSyncLoading}
                >
                  Обновить
                </Button>
                <Button
                  icon={<CopyOutlined />}
                  onClick={copyNSIErrors}
                >
                  Копировать ошибку
                </Button>
              </Space>
            }
          >
            <Table
              size="small"
              dataSource={nsiSyncResult.errors.map((e, i) => ({ ...e, key: i }))}
              columns={[
                { title: 'Тип', dataIndex: 'type', width: 120 },
                { title: 'ID', dataIndex: 'id', ellipsis: true, width: 120 },
                { title: 'Наименование', dataIndex: 'name', ellipsis: true },
                { title: 'Сообщение', dataIndex: 'message', ellipsis: true }
              ]}
              pagination={nsiSyncResult.errors.length > 10 ? { pageSize: 10 } : false}
            />
          </Card>
        )}

        <Row gutter={16}>
          <Col span={6}>
            <Card>
              <Statistic title="В очереди" value={stats.pending} valueStyle={{ color: '#1890ff' }} />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic title="Обрабатывается" value={stats.processing} valueStyle={{ color: '#faad14' }} />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic title="Завершено" value={stats.completed} valueStyle={{ color: '#3f8600' }} />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic title="Ошибки" value={stats.failed} valueStyle={{ color: '#cf1322' }} />
            </Card>
          </Col>
        </Row>

        {items.some((i: any) => i.lastError && (i.lastError.includes('ECONNREFUSED') || i.lastError.includes('fetch failed'))) && (
          <Alert
            type="warning"
            showIcon
            message="Сервер 1С недоступен"
            description="Backend не может подключиться к HTTP API 1С (ECONNREFUSED). UH_API_URL в backend/.env — базовый URL сервиса ecof (без /documents), например https://localhost:8035/kk_test/hs/ecof. Backend сам обращается к .../documents, .../health. Проверьте, что HTTP-сервис 1С запущен; при HTTPS с самоподписанным сертификатом задайте UH_API_INSECURE=true."
            style={{ marginBottom: 16 }}
          />
        )}
        {items.some((i: any) => i.lastError && i.lastError.includes('401')) && (
          <Alert
            type="error"
            showIcon
            message="Ошибка 401 — 1С отклонила авторизацию"
            description="При передаче документа 1С вернула 401 Unauthorized. Задайте в backend/.env переменные UH_API_USER и UH_API_PASSWORD (логин и пароль пользователя 1С УХ), затем перезапустите backend. Учётные данные должны совпадать с теми, с которыми вы успешно входите в 1С из браузера."
            style={{ marginBottom: 16 }}
          />
        )}
        {items.some((i: any) => i.lastError && i.lastError.includes('500')) && (
          <Alert
            type="info"
            showIcon
            message="Ошибка 500 от 1С при передаче документа"
            description="Авторизация (логин/пароль) прошла успешно — иначе 1С вернула бы 401. Код 500 означает, что 1С приняла запрос, но упала при обработке документа: проверьте полный текст ошибки в колонке «Ошибка» (подсказка при наведении). Часто это «Превышено допустимое количество ошибок проведения» — исправьте данные документа в 1С или в портале (обязательные реквизиты, НСИ, правила проведения)."
            style={{ marginBottom: 16 }}
          />
        )}

        <Card title="Диагностика авторизации 1С">
          <Space direction="vertical" style={{ width: '100%' }}>
            <Space wrap>
              <Input
                style={{ minWidth: 320 }}
                placeholder="Base URL 1С (например https://127.0.0.1:8035/kk_test/hs/ecof)"
                value={authDebugBaseUrl}
                onChange={(e) => setAuthDebugBaseUrl(e.target.value)}
              />
              <Input
                style={{ minWidth: 200 }}
                placeholder="Логин 1С"
                value={authDebugUsername}
                onChange={(e) => setAuthDebugUsername(e.target.value)}
              />
              <Input.Password
                style={{ minWidth: 200 }}
                placeholder="Пароль 1С"
                value={authDebugPassword}
                onChange={(e) => setAuthDebugPassword(e.target.value)}
              />
            </Space>
            <Button
              onClick={() => runAuthDebug('/health', 'GET')}
              loading={authDebugLoading}
            >
              Проверить /health
            </Button>
            <Button
              onClick={() => runAuthDebug('/documents', 'POST', { payload: { type: 'GoodsReceipt', number: 'TEST', date: dayjs().format('YYYY-MM-DD') } })}
              loading={authDebugLoading}
            >
              Проверить /documents
            </Button>
            <Button
              onClick={applyAuthOverride}
              loading={authDebugLoading}
            >
              Применить логин/пароль в backend
            </Button>
            <Button
              onClick={() => { setAuthDebugResult(null); setAuthDebugError(null); }}
              disabled={!authDebugResult && !authDebugError}
            >
              Очистить
            </Button>
          </Space>
          {authInfo && (
            <Alert
              type="info"
              showIcon
              message="Текущие учётные данные backend"
              description={`URL: ${authInfo.baseUrl} | user: ${authInfo.username} | passwordSet: ${authInfo.passwordSet ? 'yes' : 'no'} | insecureTLS: ${authInfo.insecureTls ? 'true' : 'false'}`}
              style={{ marginTop: 12 }}
            />
          )}
          {authDebugError && (
            <Alert type="error" showIcon message="Ошибка проверки авторизации" description={authDebugError} style={{ marginTop: 12 }} />
          )}
          {authDebugResult && (
            <pre style={{ marginTop: 12, whiteSpace: 'pre-wrap' }}>
              {JSON.stringify(authDebugResult, null, 2)}
            </pre>
          )}
        </Card>
        <Card title="Последний ответ 1С">
          <Space wrap>
            <Button onClick={loadLastResponse}>Обновить</Button>
            <Button onClick={copyErrorText} disabled={!lastResponse}>
              Копировать текст ошибки
            </Button>
          </Space>
          {lastResponse ? (
            <pre style={{ marginTop: 12, whiteSpace: 'pre-wrap' }}>
              {JSON.stringify(lastResponse, null, 2)}
            </pre>
          ) : (
            <Typography.Text type="secondary" style={{ display: 'block', marginTop: 12 }}>
              Пока нет данных. Нажмите «Обновить» после попытки отправки документа.
            </Typography.Text>
          )}
        </Card>
        <Card title="Задачи очереди">
          <Spin spinning={loading}>
            <Table
              columns={columns}
              dataSource={items.map(item => ({ ...item, key: item.id }))}
              size="middle"
              pagination={{ pageSize: 20 }}
            />
          </Spin>
        </Card>
      </Space>
    </div>
  );
}

