import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, Descriptions, Button, Spin, message } from 'antd';
import { ArrowLeftOutlined } from '@ant-design/icons';
import { api } from '../../services/api';

interface Organization {
  id: string;
  code: string;
  name: string;
  inn: string;
  contractsCount?: number;
  accountsCount?: number;
  warehousesCount?: number;
}

export function OrganizationDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [organization, setOrganization] = useState<Organization | null>(null);

  useEffect(() => {
    const loadOrganization = async () => {
      if (!id) return;
      
      setLoading(true);
      try {
        const response = await api.nsi.getOrganization(id);
        if (response.data) {
          setOrganization(response.data);
        } else {
          message.error('Организация не найдена');
          navigate('/nsi');
        }
      } catch (error: any) {
        message.error('Ошибка загрузки организации: ' + (error.message || 'Неизвестная ошибка'));
      } finally {
        setLoading(false);
      }
    };

    loadOrganization();
  }, [id, navigate]);

  if (loading) {
    return (
      <div style={{ padding: '24px', textAlign: 'center' }}>
        <Spin size="large" />
      </div>
    );
  }

  if (!organization) {
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

      <Card title="Карточка организации">
        <Descriptions column={1} bordered>
          <Descriptions.Item label="Код">{organization.code || '-'}</Descriptions.Item>
          <Descriptions.Item label="Наименование">{organization.name || 'Без наименования'}</Descriptions.Item>
          <Descriptions.Item label="ИНН">{organization.inn || '-'}</Descriptions.Item>
          {organization.contractsCount !== undefined && (
            <Descriptions.Item label="Договоров">
              <Button 
                type="link" 
                onClick={() => navigate(`/nsi?tab=contracts&organizationId=${organization.id}`)}
              >
                {organization.contractsCount}
              </Button>
            </Descriptions.Item>
          )}
          {organization.accountsCount !== undefined && (
            <Descriptions.Item label="Счетов">
              <Button 
                type="link" 
                onClick={() => navigate(`/nsi?tab=accounts&organizationId=${organization.id}`)}
              >
                {organization.accountsCount}
              </Button>
            </Descriptions.Item>
          )}
          {organization.warehousesCount !== undefined && (
            <Descriptions.Item label="Складов">
              <Button 
                type="link" 
                onClick={() => navigate(`/nsi?tab=warehouses&organizationId=${organization.id}`)}
              >
                {organization.warehousesCount}
              </Button>
            </Descriptions.Item>
          )}
        </Descriptions>
      </Card>
    </div>
  );
}
