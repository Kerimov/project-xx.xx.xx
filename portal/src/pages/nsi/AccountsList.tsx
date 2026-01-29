import { useState, useEffect } from 'react';
import { Table, Input, Button, Space, message, Select } from 'antd';
import { SearchOutlined, EyeOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
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

export function AccountsList() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [organizationId, setOrganizationId] = useState<string | undefined>();
  const [type, setType] = useState<string | undefined>();
  const [search, setSearch] = useState('');

  const loadAccounts = async () => {
    setLoading(true);
    try {
      const response = await api.nsi.accounts(organizationId, type);
      let data = response.data || [];
      
      // Локальная фильтрация по поиску
      if (search) {
        const searchLower = search.toLowerCase();
        data = data.filter(
          (acc: Account) =>
            acc.name?.toLowerCase().includes(searchLower) ||
            acc.code?.toLowerCase().includes(searchLower)
        );
      }
      
      setAccounts(data);
    } catch (error: any) {
      message.error('Ошибка загрузки счетов: ' + (error.message || 'Неизвестная ошибка'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAccounts();
  }, []);

  const handleSearch = () => {
    loadAccounts();
  };

  const columns = [
    {
      title: 'Код',
      dataIndex: 'code',
      key: 'code',
      width: 120,
    },
    {
      title: 'Наименование',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: 'Организация',
      dataIndex: 'organizationName',
      key: 'organizationName',
      width: 200,
    },
    {
      title: 'Тип',
      dataIndex: 'type',
      key: 'type',
      width: 120,
    },
    {
      title: 'Действия',
      key: 'actions',
      width: 100,
      render: (_: any, record: Account) => (
        <Space>
          <Button
            type="link"
            icon={<EyeOutlined />}
            onClick={() => navigate(`/nsi/accounts/${record.id}`)}
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
            placeholder="Поиск по названию или коду"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onPressEnter={handleSearch}
            style={{ width: 250 }}
            prefix={<SearchOutlined />}
          />
          <Button type="primary" onClick={handleSearch}>
            Найти
          </Button>
        </Space>
      </Space>

      <Table
        columns={columns}
        dataSource={accounts}
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
