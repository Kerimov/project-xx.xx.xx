import { Card, Descriptions, Button, Alert, Spin, Typography, Table } from 'antd';
import { DatabaseOutlined, CheckCircleOutlined, CloseCircleOutlined, TableOutlined } from '@ant-design/icons';
import { useState, useEffect } from 'react';
import { api } from '../services/api';

type Config = {
  type: string;
  server: string;
  database: string;
  port: number;
  authType?: string;
};

export function UHDbConnectionPage() {
  const [config, setConfig] = useState<Config | null>(null);
  const [configMessage, setConfigMessage] = useState<string | null>(null);
  const [loadingConfig, setLoadingConfig] = useState(true);
  const [checking, setChecking] = useState(false);
  const [health, setHealth] = useState<{ ok: boolean; error?: string } | null>(null);
  const [sampleData, setSampleData] = useState<{
    rows: Record<string, unknown>[];
    columns: string[];
    source: string;
  } | null>(null);
  const [loadingSample, setLoadingSample] = useState(false);
  const [sampleError, setSampleError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoadingConfig(true);
      try {
        const res = await api.uh.db.config();
        if (!cancelled) {
          setConfig(res.data ?? null);
          setConfigMessage(res.message ?? null);
        }
      } catch (e: any) {
        if (!cancelled) {
          setConfig(null);
          const msg = e?.message || '';
          setConfigMessage(
            msg.includes('Connection refused') || msg.includes('Failed to fetch') || msg.includes('NetworkError')
              ? 'Сервер недоступен. Запустите backend: в папке backend выполните npm run dev'
              : msg || 'Не удалось загрузить настройки'
          );
        }
      } finally {
        if (!cancelled) setLoadingConfig(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const runCheck = async () => {
    setChecking(true);
    setHealth(null);
    try {
      const result = await api.uh.db.health();
      setHealth(result);
    } catch (e: any) {
      setHealth({ ok: false, error: e?.message || 'Ошибка запроса' });
    } finally {
      setChecking(false);
    }
  };

  const loadSample = async () => {
    setLoadingSample(true);
    setSampleError(null);
    setSampleData(null);
    try {
      const res = await api.uh.db.sample();
      setSampleData(res.data);
    } catch (e: any) {
      setSampleError(e?.message || 'Ошибка загрузки');
    } finally {
      setLoadingSample(false);
    }
  };

  return (
    <div className="page">
      <Typography.Title level={3}>
        <DatabaseOutlined /> Подключение к БД 1С:УХ
      </Typography.Title>
      <Card title="Параметры подключения" style={{ marginBottom: 16 }}>
        <Spin spinning={loadingConfig} tip="Загрузка настроек...">
          <div style={{ minHeight: 60 }}>
            {config ? (
              <Descriptions column={1} size="small">
                <Descriptions.Item label="Тип БД">{config.type}</Descriptions.Item>
                <Descriptions.Item label="Сервер">{config.server}</Descriptions.Item>
                <Descriptions.Item label="База данных">{config.database}</Descriptions.Item>
                <Descriptions.Item label="Порт">{config.port}</Descriptions.Item>
                {config.authType && (
                  <Descriptions.Item label="Аутентификация">{config.authType}</Descriptions.Item>
                )}
              </Descriptions>
            ) : !loadingConfig ? (
              <Alert
                type="info"
                message={configMessage ? 'Ошибка загрузки' : 'Подключение не настроено'}
                description={
                  configMessage ||
                  'Задайте переменные UH_DB_TYPE, UH_MSSQL_* или UH_DB_* в backend/.env'
                }
              />
            ) : null}
          </div>
        </Spin>
      </Card>

      <Card title="Проверка подключения">
        <Button
          type="primary"
          onClick={runCheck}
          loading={checking}
          disabled={!config}
          icon={<DatabaseOutlined />}
        >
          Проверить подключение
        </Button>

        {health !== null && (
          <div style={{ marginTop: 16 }}>
            {health.ok ? (
              <Alert
                type="success"
                showIcon
                icon={<CheckCircleOutlined />}
                message="Подключение успешно"
                description="Соединение с БД 1С:УХ установлено."
              />
            ) : (
              <Alert
                type="error"
                showIcon
                icon={<CloseCircleOutlined />}
                message="Ошибка подключения"
                description={health.error}
              />
            )}
          </div>
        )}
      </Card>

      <Card
        title={
          <span>
            <TableOutlined /> Пример данных из таблицы
          </span>
        }
      >
        <Button
          type="default"
          onClick={loadSample}
          loading={loadingSample}
          disabled={!config}
          icon={<TableOutlined />}
        >
          Загрузить пример данных
        </Button>
        {sampleError && (
          <Alert type="error" message={sampleError} style={{ marginTop: 12 }} />
        )}
        {sampleData && (
          <div style={{ marginTop: 16 }}>
            <Typography.Text type="secondary">
              Источник: {sampleData.source} (первые 10 записей)
            </Typography.Text>
            <Table
              size="small"
              dataSource={sampleData.rows.map((r, i) => ({ ...r, key: i }))}
              columns={sampleData.columns.map((col) => ({
                title: col,
                dataIndex: col,
                key: col,
                render: (val: unknown) =>
                  val instanceof Date ? val.toISOString() : String(val ?? '—')
              }))}
              pagination={false}
              style={{ marginTop: 8 }}
            />
          </div>
        )}
      </Card>
    </div>
  );
}
