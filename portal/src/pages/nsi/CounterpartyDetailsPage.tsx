import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, Descriptions, Button, Spin, message } from 'antd';
import { ArrowLeftOutlined } from '@ant-design/icons';
import { api } from '../../services/api';

interface Counterparty {
  id: string;
  name: string;
  inn: string;
  data?: any;
}

export function CounterpartyDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [counterparty, setCounterparty] = useState<Counterparty | null>(null);

  useEffect(() => {
    const loadCounterparty = async () => {
      if (!id) return;
      
      setLoading(true);
      try {
        const response = await api.nsi.counterparties();
        const cp = response.data?.find((c: Counterparty) => c.id === id);
        if (cp) {
          setCounterparty(cp);
        } else {
          message.error('Контрагент не найден');
          navigate('/nsi');
        }
      } catch (error: any) {
        message.error('Ошибка загрузки контрагента: ' + (error.message || 'Неизвестная ошибка'));
      } finally {
        setLoading(false);
      }
    };

    loadCounterparty();
  }, [id, navigate]);

  if (loading) {
    return (
      <div style={{ padding: '24px', textAlign: 'center' }}>
        <Spin size="large" />
      </div>
    );
  }

  if (!counterparty) {
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

      <Card title="Карточка контрагента">
        <Descriptions column={1} bordered>
          <Descriptions.Item label="Наименование">{counterparty.name}</Descriptions.Item>
          <Descriptions.Item label="ИНН">{counterparty.inn || '-'}</Descriptions.Item>
          {counterparty.data && (
            <Descriptions.Item label="Дополнительные данные">
              <pre style={{ margin: 0, whiteSpace: 'pre-wrap' }}>
                {JSON.stringify(counterparty.data, null, 2)}
              </pre>
            </Descriptions.Item>
          )}
        </Descriptions>
      </Card>
    </div>
  );
}
