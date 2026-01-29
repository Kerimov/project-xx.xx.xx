import { useState, useEffect } from 'react';
import { Select, Spin, message } from 'antd';
import { api } from '../../services/api';
import type { SelectProps } from 'antd';

const { Option } = Select;

interface Warehouse {
  id: string;
  code: string;
  name: string;
  organizationId?: string;
  organizationName?: string;
}

interface WarehouseSelectProps extends Omit<SelectProps, 'options' | 'loading'> {
  value?: string;
  onChange?: (value: string) => void;
  organizationId?: string;
}

export function WarehouseSelect({ 
  value, 
  onChange, 
  organizationId,
  ...props 
}: WarehouseSelectProps) {
  const [loading, setLoading] = useState(false);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);

  const loadWarehouses = async () => {
    setLoading(true);
    try {
      const response = await api.nsi.warehouses(organizationId);
      setWarehouses(response.data || []);
    } catch (error: any) {
      message.error('Ошибка загрузки складов: ' + (error.message || 'Неизвестная ошибка'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (organizationId) {
      loadWarehouses();
    } else {
      setWarehouses([]);
    }
  }, [organizationId]);

  return (
    <Select
      {...props}
      value={value}
      onChange={onChange}
      showSearch
      allowClear
      placeholder="Выберите склад"
      loading={loading}
      filterOption={(input, option) =>
        (option?.children as string)?.toLowerCase().includes(input.toLowerCase())
      }
      notFoundContent={loading ? <Spin size="small" /> : organizationId ? 'Склады не найдены' : 'Сначала выберите организацию'}
      optionLabelProp="label"
    >
      {warehouses.map(warehouse => (
        <Option key={warehouse.id} value={warehouse.id} label={warehouse.name}>
          <div>
            <div style={{ fontWeight: 500 }}>{warehouse.name}</div>
            {warehouse.code && (
              <div style={{ fontSize: '12px', color: '#999' }}>Код: {warehouse.code}</div>
            )}
            {warehouse.organizationName && (
              <div style={{ fontSize: '12px', color: '#999' }}>
                Орг: {warehouse.organizationName}
              </div>
            )}
          </div>
        </Option>
      ))}
    </Select>
  );
}
