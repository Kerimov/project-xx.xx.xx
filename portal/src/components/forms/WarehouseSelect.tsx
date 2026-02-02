import { useState, useEffect, useCallback } from 'react';
import { Select, Spin, message } from 'antd';
import { api } from '../../services/api';
import { ReferenceSelectWrapper } from './ReferenceSelectWrapper';
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
      const response = await api.nsi.warehouses(organizationId, undefined);
      setWarehouses(response.data || []);
    } catch (error: any) {
      message.error('Ошибка загрузки складов: ' + (error.message || 'Неизвестная ошибка'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadWarehouses();
  }, [organizationId]);

  const loadItems = useCallback(async (search?: string): Promise<Warehouse[]> => {
    try {
      const response = await api.nsi.warehouses(organizationId, search);
      const list = response?.data;
      return Array.isArray(list) ? list : [];
    } catch {
      return [];
    }
  }, [organizationId]);

  return (
    <ReferenceSelectWrapper<Warehouse>
      directoryTitle="Справочник складов"
      columns={[
        { title: 'Наименование', dataIndex: 'name', key: 'name', ellipsis: true },
        { title: 'Код', dataIndex: 'code', key: 'code', width: 120 },
        { title: 'Организация', dataIndex: 'organizationName', key: 'organizationName', width: 180 },
      ]}
      loadItems={loadItems}
      onSelect={(id) => onChange?.(id)}
    >
      <Select
        {...props}
        value={value}
        onChange={onChange}
        showSearch
        allowClear
        placeholder="Выберите склад"
        loading={loading}
        filterOption={(input, option) => {
          const label = (option?.label ?? option?.value ?? '')?.toString?.() ?? '';
          return label.toLowerCase().includes((input ?? '').toLowerCase());
        }}
        notFoundContent={loading ? <Spin size="small" /> : 'Склады не найдены. Запустите синхронизацию НСИ на странице «Интеграция с УХ».'}
        optionLabelProp="label"
        style={{ width: '100%' }}
      >
        {warehouses.map(warehouse => (
          <Option key={warehouse.id} value={warehouse.id} label={warehouse.name}>
            <div>
              <div style={{ fontWeight: 500 }}>{warehouse.name}</div>
              {warehouse.code && (
                <div style={{ fontSize: '12px', color: '#999' }}>Код: {warehouse.code}</div>
              )}
              {warehouse.organizationName && (
                <div style={{ fontSize: '12px', color: '#999' }}>Орг: {warehouse.organizationName}</div>
              )}
            </div>
          </Option>
        ))}
      </Select>
    </ReferenceSelectWrapper>
  );
}
