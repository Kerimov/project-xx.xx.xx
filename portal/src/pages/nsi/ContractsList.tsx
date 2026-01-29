import { useState, useEffect } from 'react';
import { Table, Input, Button, Space, message, Select } from 'antd';
import { SearchOutlined, EyeOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
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

export function ContractsList() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [organizationId, setOrganizationId] = useState<string | undefined>();
  const [counterpartyName, setCounterpartyName] = useState('');

  const loadContracts = async () => {
    setLoading(true);
    try {
      const response = await api.nsi.contracts(
        organizationId,
        counterpartyName || undefined
      );
      setContracts(response.data || []);
    } catch (error: any) {
      message.error('Ошибка загрузки договоров: ' + (error.message || 'Неизвестная ошибка'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadContracts();
  }, []);

  const handleSearch = () => {
    loadContracts();
  };

  const columns = [
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
      title: 'Контрагент',
      dataIndex: 'counterpartyName',
      key: 'counterpartyName',
      width: 200,
    },
    {
      title: 'Действия',
      key: 'actions',
      width: 100,
      render: (_: any, record: Contract) => (
        <Space>
          <Button
            type="link"
            icon={<EyeOutlined />}
            onClick={() => navigate(`/nsi/contracts/${record.id}`)}
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
            placeholder="Поиск по контрагенту"
            value={counterpartyName}
            onChange={(e) => setCounterpartyName(e.target.value)}
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
        dataSource={contracts}
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
