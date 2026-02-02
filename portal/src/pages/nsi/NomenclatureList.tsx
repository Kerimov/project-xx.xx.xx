import { useState, useEffect } from 'react';
import { Table, Input, Button, Space, message } from 'antd';
import { SearchOutlined } from '@ant-design/icons';
import { api } from '../../services/api';

interface Nomenclature {
  id: string;
  code: string;
  name: string;
  data?: { unit?: string; nomenclatureType?: string };
}

export function NomenclatureList() {
  const [loading, setLoading] = useState(false);
  const [nomenclature, setNomenclature] = useState<Nomenclature[]>([]);
  const [search, setSearch] = useState('');

  const loadNomenclature = async () => {
    setLoading(true);
    try {
      const response = await api.nsi.nomenclature(search || undefined);
      setNomenclature(response.data || []);
    } catch (error: any) {
      message.error('Ошибка загрузки номенклатуры: ' + (error.message || 'Неизвестная ошибка'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadNomenclature();
  }, []);

  const handleSearch = () => {
    loadNomenclature();
  };

  const columns = [
    {
      title: 'Код',
      dataIndex: 'code',
      key: 'code',
      width: 140,
    },
    {
      title: 'Наименование',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: 'Ед. изм.',
      key: 'unit',
      width: 100,
      render: (_: unknown, record: Nomenclature) => record.data?.unit ?? '—',
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
        dataSource={nomenclature}
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
