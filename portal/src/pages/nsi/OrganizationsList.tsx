import { useState, useEffect } from 'react';
import { Table, Input, Button, Space, Tag, message } from 'antd';
import { SearchOutlined, EyeOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { api } from '../../services/api';

interface Organization {
  id: string;
  code: string;
  name: string;
  inn: string;
}

export function OrganizationsList() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [search, setSearch] = useState('');

  const loadOrganizations = async () => {
    setLoading(true);
    try {
      const response = await api.nsi.organizations(search || undefined);
      setOrganizations(response.data || []);
    } catch (error: any) {
      message.error('Ошибка загрузки организаций: ' + (error.message || 'Неизвестная ошибка'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrganizations();
  }, []);

  const handleSearch = () => {
    loadOrganizations();
  };

  const columns = [
    {
      title: 'Код',
      dataIndex: 'code',
      key: 'code',
      width: 100,
    },
    {
      title: 'Наименование',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: 'ИНН',
      dataIndex: 'inn',
      key: 'inn',
      width: 150,
    },
    {
      title: 'Действия',
      key: 'actions',
      width: 100,
      render: (_: any, record: Organization) => (
        <Space>
          <Button
            type="link"
            icon={<EyeOutlined />}
            onClick={() => navigate(`/nsi/organizations/${record.id}`)}
          >
            Открыть
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <Space style={{ marginBottom: 16, width: '100%', justifyContent: 'space-between' }}>
        <Space>
          <Input
            placeholder="Поиск по названию, коду или ИНН"
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
        dataSource={organizations}
        loading={loading}
        rowKey="id"
        pagination={{
          pageSize: 20,
          showSizeChanger: true,
          showTotal: (total) => `Всего: ${total}`,
        }}
      />
    </div>
  );
}
