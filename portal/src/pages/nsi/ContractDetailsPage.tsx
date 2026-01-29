import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, Descriptions, Button, Spin, message } from 'antd';
import { ArrowLeftOutlined } from '@ant-design/icons';
import { api } from '../../services/api';

interface Contract {
  id: string;
  name: string;
  organizationId: string;
  organizationName?: string;
  counterpartyId: string;
  counterpartyName?: string;
  data?: any;
}

export function ContractDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [contract, setContract] = useState<Contract | null>(null);

  useEffect(() => {
    const loadContract = async () => {
      if (!id) return;
      
      setLoading(true);
      try {
        const response = await api.nsi.contracts();
        const cnt = response.data?.find((c: Contract) => c.id === id);
        if (cnt) {
          setContract(cnt);
        } else {
          message.error('Договор не найден');
          navigate('/nsi');
        }
      } catch (error: any) {
        message.error('Ошибка загрузки договора: ' + (error.message || 'Неизвестная ошибка'));
      } finally {
        setLoading(false);
      }
    };

    loadContract();
  }, [id, navigate]);

  if (loading) {
    return (
      <div style={{ padding: '24px', textAlign: 'center' }}>
        <Spin size="large" />
      </div>
    );
  }

  if (!contract) {
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

      <Card title="Карточка договора">
        <Descriptions column={1} bordered>
          <Descriptions.Item label="Наименование">{contract.name}</Descriptions.Item>
          <Descriptions.Item label="Организация">{contract.organizationName || '-'}</Descriptions.Item>
          <Descriptions.Item label="Контрагент">{contract.counterpartyName || '-'}</Descriptions.Item>
          {contract.data && (
            <Descriptions.Item label="Дополнительные данные">
              <pre style={{ margin: 0, whiteSpace: 'pre-wrap' }}>
                {JSON.stringify(contract.data, null, 2)}
              </pre>
            </Descriptions.Item>
          )}
        </Descriptions>
      </Card>
    </div>
  );
}
