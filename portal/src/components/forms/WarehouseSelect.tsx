import { useState, useEffect, useCallback } from 'react';
import { Select, Spin, message, Alert } from 'antd';
import { Link } from 'react-router-dom';
import { InfoCircleOutlined } from '@ant-design/icons';
import { api } from '../../services/api';
import { ReferenceSelectWrapper } from './ReferenceSelectWrapper';
import type { SelectProps } from 'antd';
import { useAnalyticsAccess } from '../../contexts/AnalyticsAccessContext';

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
  /** @deprecated Не используется, склады не фильтруются по организации */
  organizationId?: string;
}

export function WarehouseSelect({ 
  value, 
  onChange,
  organizationId: _organizationId, // деструктурируем, чтобы не передавать в DOM
  ...props 
}: WarehouseSelectProps) {
  const { isEnabled } = useAnalyticsAccess();
  const enabled = isEnabled('WAREHOUSE');
  const [loading, setLoading] = useState(false);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);

  useEffect(() => {
    if (enabled) return;
    if (!value) return;
    onChange?.('' as any);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled]);

  const loadWarehouses = async () => {
    setLoading(true);
    try {
      // Всегда загружаем все склады без фильтра по организации
      const response = await api.nsi.warehouses(undefined, undefined);
      setWarehouses(response.data || []);
    } catch (error: any) {
      message.error('Ошибка загрузки складов: ' + (error.message || 'Неизвестная ошибка'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadWarehouses();
  }, []);

  const loadItems = useCallback(async (search?: string): Promise<Warehouse[]> => {
    try {
      // Всегда загружаем все склады без фильтра по организации
      const response = await api.nsi.warehouses(undefined, search);
      const list = response?.data;
      return Array.isArray(list) ? list : [];
    } catch {
      return [];
    }
  }, []);

  if (!enabled) {
    return (
      <>
        <Alert
          type="info"
          icon={<InfoCircleOutlined />}
          message={
            <span>
              Аналитика <strong>Склад</strong> недоступна. <Link to="/analytics" target="_blank" rel="noopener noreferrer">Подключить подписку →</Link>
            </span>
          }
          style={{ marginBottom: 8 }}
        />
        <Select
          {...props}
          value={value}
          onChange={onChange}
          disabled
          placeholder="Недоступно (нет подписки на аналитику)"
          style={{ width: '100%' }}
        />
      </>
    );
  }

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
        notFoundContent={
          loading ? <Spin size="small" /> :
          'Склады не найдены. Запустите синхронизацию НСИ на странице «Интеграция с УХ».'
        }
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
