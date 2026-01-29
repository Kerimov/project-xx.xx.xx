import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, Descriptions, Button, Spin, message } from 'antd';
import { ArrowLeftOutlined } from '@ant-design/icons';
import { api } from '../../services/api';

interface Warehouse {
  id: string;
  code: string;
  name: string;
  organizationId: string;
  organizationName?: string;
  data?: any;
}

export function WarehouseDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [warehouse, setWarehouse] = useState<Warehouse | null>(null);

  useEffect(() => {
    const loadWarehouse = async () => {
      if (!id) return;
      
      setLoading(true);
      try {
        const response = await api.nsi.warehouses();
        const wh = response.data?.find((w: Warehouse) => w.id === id);
        if (wh) {
          setWarehouse(wh);
        } else {
          message.error('Склад не найден');
          navigate('/nsi');
        }
      } catch (error: any) {
        message.error('Ошибка загрузки склада: ' + (error.message || 'Неизвестная ошибка'));
      } finally {
        setLoading(false);
      }
    };

    loadWarehouse();
  }, [id, navigate]);

  if (loading) {
    return (
      <div style={{ padding: '24px', textAlign: 'center' }}>
        <Spin size="large" />
      </div>
    );
  }

  if (!warehouse) {
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

      <Card title="Карточка склада">
        <Descriptions column={1} bordered>
          <Descriptions.Item label="Код">{warehouse.code || '-'}</Descriptions.Item>
          <Descriptions.Item label="Наименование">{warehouse.name}</Descriptions.Item>
          <Descriptions.Item label="Организация">{warehouse.organizationName || '-'}</Descriptions.Item>
          {warehouse.data && (
            <Descriptions.Item label="Дополнительные данные">
              <pre style={{ margin: 0, whiteSpace: 'pre-wrap' }}>
                {JSON.stringify(warehouse.data, null, 2)}
              </pre>
            </Descriptions.Item>
          )}
        </Descriptions>
      </Card>
    </div>
  );
}
