import { useState, useEffect } from 'react';
import { Table, Input, Button, Space, Tag, message, Card, Typography } from 'antd';
import { SearchOutlined, EyeOutlined, BuildOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

interface ObjectType {
  id: string;
  code: string;
  name: string;
  directionId: string | null;
  icon: string | null;
  description: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export function ObjectTypesPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [objectTypes, setObjectTypes] = useState<ObjectType[]>([]);
  const [search, setSearch] = useState('');

  const isEcofAdmin = user?.role === 'ecof_admin';

  const loadObjectTypes = async () => {
    setLoading(true);
    try {
      const response = await api.objects.types.list({
        search: search || undefined,
        activeOnly: false
      });
      setObjectTypes(response.data || []);
    } catch (error: any) {
      message.error('Ошибка загрузки типов объектов: ' + (error.message || 'Неизвестная ошибка'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadObjectTypes();
  }, []);

  const handleSearch = () => {
    loadObjectTypes();
  };

  const columns = [
    {
      title: 'Код',
      dataIndex: 'code',
      key: 'code',
      width: 150,
      render: (code: string) => <Tag color="blue">{code}</Tag>,
    },
    {
      title: 'Наименование',
      dataIndex: 'name',
      key: 'name',
      render: (name: string, record: ObjectType) => (
        <Space>
          {record.icon && <span>{record.icon}</span>}
          <span>{name || 'Без наименования'}</span>
        </Space>
      ),
    },
    {
      title: 'Описание',
      dataIndex: 'description',
      key: 'description',
      ellipsis: true,
    },
    {
      title: 'Статус',
      dataIndex: 'isActive',
      key: 'isActive',
      width: 100,
      render: (isActive: boolean) => (
        <Tag color={isActive ? 'green' : 'default'}>
          {isActive ? 'Активен' : 'Неактивен'}
        </Tag>
      ),
    },
    {
      title: 'Действия',
      key: 'actions',
      width: 150,
      render: (_: any, record: ObjectType) => (
        <Space>
          <Button
            type="link"
            icon={<EyeOutlined />}
            onClick={() => navigate(`/objects/types/${record.id}`)}
          >
            Открыть
          </Button>
          <Button
            type="link"
            onClick={() => navigate(`/objects/cards?typeId=${record.id}`)}
          >
            Карточки
          </Button>
        </Space>
      ),
    },
  ];

  if (!isEcofAdmin) {
    return (
      <div className="page">
        <Card>
          <Typography.Text>Недостаточно прав. Эта страница доступна только администраторам ЕЦОФ.</Typography.Text>
        </Card>
      </div>
    );
  }

  return (
    <div className="page">
      <Space direction="vertical" style={{ width: '100%' }} size="large">
        <Space style={{ width: '100%', justifyContent: 'space-between' }}>
          <Typography.Title level={2} style={{ margin: 0 }}>
            <BuildOutlined /> Типы объектов учета
          </Typography.Title>
        </Space>

        <Card>
          <Space style={{ marginBottom: 16, width: '100%', justifyContent: 'space-between' }}>
            <Space>
              <Input
                placeholder="Поиск по коду или наименованию"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onPressEnter={handleSearch}
                style={{ width: 300 }}
                prefix={<SearchOutlined />}
              />
              <Button type="primary" onClick={handleSearch}>
                Найти
              </Button>
            </Space>
          </Space>

          <Table
            columns={columns}
            dataSource={objectTypes}
            loading={loading}
            rowKey="id"
            pagination={{
              pageSize: 20,
              showSizeChanger: true,
              showTotal: (total) => `Всего: ${total}`,
            }}
          />
        </Card>
      </Space>
    </div>
  );
}
