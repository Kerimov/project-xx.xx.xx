import { useState, useEffect } from 'react';
import { Table, Input, Button, Space, message } from 'antd';
import { SearchOutlined, EyeOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { api } from '../../services/api';

interface Counterparty {
  id: string;
  name: string;
  inn: string;
  data?: any;
}

export function CounterpartiesList() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [counterparties, setCounterparties] = useState<Counterparty[]>([]);
  const [search, setSearch] = useState('');

  const loadCounterparties = async () => {
    setLoading(true);
    try {
      const response = await api.nsi.counterparties(search || undefined);
      setCounterparties(response.data || []);
    } catch (error: any) {
      message.error('Ошибка загрузки контрагентов: ' + (error.message || 'Неизвестная ошибка'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCounterparties();
  }, []);

  const handleSearch = () => {
    loadCounterparties();
  };

  const columns = [
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
      render: (_: any, record: Counterparty) => (
        <Space>
          <Button
            type="link"
            icon={<EyeOutlined />}
            onClick={() => navigate(`/nsi/counterparties/${record.id}`)}
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
            placeholder="Поиск по названию или ИНН"
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
        dataSource={counterparties}
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
