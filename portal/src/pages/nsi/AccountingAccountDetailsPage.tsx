import { useState, useEffect } from 'react';
import { Card, Descriptions, Spin, message, Button } from 'antd';
import { ArrowLeftOutlined } from '@ant-design/icons';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../../services/api';

interface AccountingAccount {
  id: string;
  code: string | null;
  name: string;
  data?: Record<string, unknown>;
}

export function AccountingAccountDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [account, setAccount] = useState<AccountingAccount | null>(null);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await api.nsi.getAccountingAccount(id);
        if (!cancelled) setAccount(res.data);
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : 'Ошибка загрузки';
        message.error(msg);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [id]);

  if (loading) {
    return (
      <div style={{ padding: 24, textAlign: 'center' }}>
        <Spin size="large" />
      </div>
    );
  }

  if (!account) {
    return (
      <div style={{ padding: 24 }}>
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/nsi')}>
          К справочникам
        </Button>
        <Card style={{ marginTop: 16 }}>Счёт учета не найден.</Card>
      </div>
    );
  }

  return (
    <div style={{ padding: 24 }}>
      <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/nsi')} style={{ marginBottom: 16 }}>
        К справочникам
      </Button>
      <Card title="Счёт учета">
        <Descriptions column={1} bordered size="small">
          <Descriptions.Item label="Код">{account.code ?? '—'}</Descriptions.Item>
          <Descriptions.Item label="Наименование">{account.name}</Descriptions.Item>
          <Descriptions.Item label="Идентификатор">{account.id}</Descriptions.Item>
        </Descriptions>
      </Card>
    </div>
  );
}
