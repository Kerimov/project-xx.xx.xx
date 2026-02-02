import { useEffect, useMemo, useState } from 'react';
import { Card, Button, Space, InputNumber, Typography, message } from 'antd';
import { ReloadOutlined, CopyOutlined } from '@ant-design/icons';
import { api } from '../services/api';

const { Title, Text } = Typography;

export function LogsPage() {
  const [loading, setLoading] = useState(false);
  const [tail, setTail] = useState(200);
  const [lines, setLines] = useState<string[]>([]);
  const [filePath, setFilePath] = useState<string>('');

  const content = useMemo(() => lines.join('\n'), [lines]);

  const loadLogs = async () => {
    try {
      setLoading(true);
      const res = await api.admin.logs.get(tail);
      setLines(res.data?.lines || []);
      setFilePath(res.data?.filePath || '');
    } catch (error: any) {
      message.error('Ошибка загрузки логов: ' + (error.message || 'Неизвестная ошибка'));
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    if (!content) return;
    try {
      await navigator.clipboard.writeText(content);
      message.success('Логи скопированы');
    } catch (error: any) {
      message.error('Не удалось скопировать логи');
    }
  };

  useEffect(() => {
    loadLogs();
  }, []);

  return (
    <div>
      <Title level={3}>Логи backend</Title>
      <Card>
        <Space style={{ marginBottom: 12, width: '100%', justifyContent: 'space-between' }}>
          <Space>
            <Text>Последние строк:</Text>
            <InputNumber
              min={20}
              max={2000}
              value={tail}
              onChange={(value) => setTail(typeof value === 'number' ? value : 200)}
            />
            <Button icon={<ReloadOutlined />} onClick={loadLogs} loading={loading}>
              Обновить
            </Button>
            <Button icon={<CopyOutlined />} onClick={handleCopy} disabled={!content}>
              Копировать
            </Button>
          </Space>
          {filePath ? <Text type="secondary">{filePath}</Text> : null}
        </Space>

        <pre
          style={{
            maxHeight: 520,
            overflow: 'auto',
            background: '#0f172a',
            color: '#e2e8f0',
            padding: 12,
            borderRadius: 8,
            fontSize: 12,
            lineHeight: 1.4
          }}
        >
          {content || 'Логи пустые.'}
        </pre>
      </Card>
    </div>
  );
}

