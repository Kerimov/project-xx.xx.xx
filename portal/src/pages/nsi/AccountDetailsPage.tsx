import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, Descriptions, Button, Spin, message } from 'antd';
import { ArrowLeftOutlined } from '@ant-design/icons';
import { api } from '../../services/api';

interface Account {
  id: string;
  code: string;
  name: string;
  organizationId: string;
  organizationName?: string;
  type?: string;
  data?: any;
}

export function AccountDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [account, setAccount] = useState<Account | null>(null);

  useEffect(() => {
    const loadAccount = async () => {
      if (!id) return;
      
      setLoading(true);
      try {
        const response = await api.nsi.accounts();
        const acc = response.data?.find((a: Account) => a.id === id);
        if (acc) {
          setAccount(acc);
        } else {
          message.error('Счет не найден');
          navigate('/nsi');
        }
      } catch (error: any) {
        message.error('Ошибка загрузки счета: ' + (error.message || 'Неизвестная ошибка'));
      } finally {
        setLoading(false);
      }
    };

    loadAccount();
  }, [id, navigate]);

  if (loading) {
    return (
      <div style={{ padding: '24px', textAlign: 'center' }}>
        <Spin size="large" />
      </div>
    );
  }

  if (!account) {
    return null;
  }

  return (
    <div style={{ padding: '24px' }}>
      <Button
        type="link"
        icon={<ArrowLeftOutlined />}
        onClick={() => navigate('/nsi')}
        style={{ marginBottom: 16 }}
      >
        Назад к списку
      </Button>

      <Card title="Карточка счета">
        <Descriptions column={1} bordered>
          <Descriptions.Item label="Код">{account.code || '-'}</Descriptions.Item>
          <Descriptions.Item label="Наименование">{account.name}</Descriptions.Item>
          <Descriptions.Item label="Организация">{account.organizationName || '-'}</Descriptions.Item>
          <Descriptions.Item label="Тип">{account.type || '-'}</Descriptions.Item>
          {account.data && (
            <Descriptions.Item label="Дополнительные данные">
              <pre style={{ margin: 0, whiteSpace: 'pre-wrap' }}>
                {JSON.stringify(account.data, null, 2)}
              </pre>
            </Descriptions.Item>
          )}
        </Descriptions>
      </Card>
    </div>
  );
}
