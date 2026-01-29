import { useState, useEffect } from 'react';
import { Table, Input, Button, Space, message } from 'antd';
import { SearchOutlined, EyeOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { api } from '../../services/api';

interface Warehouse {
  id: string;
  code: string;
  name: string;
  organizationId: string;
  organizationName?: string;
  data?: any;
}

export function WarehousesList() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [organizationId, setOrganizationId] = useState<string | undefined>();
  const [search, setSearch] = useState('');

  const loadWarehouses = async () => {
    setLoading(true);
    try {
      const response = await api.nsi.warehouses(organizationId);
      let data = response.data || [];
      
      // Локальная фильтрация по поиску
      if (search) {
        const searchLower = search.toLowerCase();
        data = data.filter(
          (wh: Warehouse) =>
            wh.name?.toLowerCase().includes(searchLower) ||
            wh.code?.toLowerCase().includes(searchLower)
        );
      }
      
      setWarehouses(data);
    } catch (error: any) {
      message.error('Ошибка загрузки складов: ' + (error.message || 'Неизвестная ошибка'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadWarehouses();
  }, []);

  const handleSearch = () => {
    loadWarehouses();
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
      title: 'Действия',
      key: 'actions',
      width: 100,
      render: (_: any, record: Warehouse) => (
        <Space>
          <Button
            type="link"
            icon={<EyeOutlined />}
            onClick={() => navigate(`/nsi/warehouses/${record.id}`)}
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
        dataSource={warehouses}
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
