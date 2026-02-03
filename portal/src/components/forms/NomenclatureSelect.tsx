import { useState, useEffect, useCallback } from 'react';
import { Select, Spin, message, Alert } from 'antd';
import { Link } from 'react-router-dom';
import { InfoCircleOutlined } from '@ant-design/icons';
import { api } from '../../services/api';
import { ReferenceSelectWrapper } from './ReferenceSelectWrapper';
import type { SelectProps } from 'antd';
import { useAnalyticsAccess } from '../../contexts/AnalyticsAccessContext';

const { Option } = Select;

interface NomenclatureItem {
  id: string;
  code: string;
  name: string;
  data?: { unit?: string; nomenclatureType?: string };
}

interface NomenclatureSelectProps extends Omit<SelectProps, 'options' | 'loading'> {
  value?: string;
  onChange?: (id: string, name: string) => void;
}

export function NomenclatureSelect({
  value,
  onChange,
  ...props
}: NomenclatureSelectProps) {
  const { isEnabled } = useAnalyticsAccess();
  const enabled = isEnabled('NOMENCLATURE') || isEnabled('ITEM');
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<NomenclatureItem[]>([]);

  useEffect(() => {
    if (enabled) return;
    if (!value) return;
    onChange?.('' as any, '' as any);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled]);

  const loadItems = useCallback(async (search?: string): Promise<NomenclatureItem[]> => {
    try {
      const response = await api.nsi.nomenclature(search);
      const list = response?.data;
      return Array.isArray(list) ? list : [];
    } catch {
      return [];
    }
  }, []);

  const loadInitial = async () => {
    setLoading(true);
    try {
      const list = await loadItems(undefined);
      setItems(list);
    } catch (error: any) {
      message.error('Ошибка загрузки номенклатуры: ' + (error.message || 'Неизвестная ошибка'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInitial();
  }, [loadItems]);

  const handleChange = (id: string | undefined) => {
    if (id === undefined) {
      onChange?.('', '');
      return;
    }
    const found = items.find((i) => i.id === id);
    onChange?.(id, found?.name ?? '');
  };

  const handleSelectFromDirectory = (id: string, record?: NomenclatureItem) => {
    onChange?.(id, record?.name ?? '');
  };

  if (!enabled) {
    return (
      <>
        <Alert
          type="info"
          icon={<InfoCircleOutlined />}
          message={
            <span>
              Аналитика <strong>Номенклатура</strong> недоступна. <Link to="/analytics" target="_blank" rel="noopener noreferrer">Подключить подписку →</Link>
            </span>
          }
          style={{ marginBottom: 8 }}
        />
        <Select
          {...props}
          value={value || undefined}
          onChange={handleChange}
          disabled
          placeholder="Недоступно (нет подписки на аналитику)"
          style={{ width: '100%' }}
        />
      </>
    );
  }

  return (
    <ReferenceSelectWrapper<NomenclatureItem>
      directoryTitle="Справочник номенклатуры"
      columns={[
        { title: 'Наименование', dataIndex: 'name', key: 'name', ellipsis: true },
        { title: 'Код', dataIndex: 'code', key: 'code', width: 120 },
      ]}
      loadItems={loadItems}
      onSelect={handleSelectFromDirectory}
    >
      <Select
        {...props}
        value={value || undefined}
        onChange={handleChange}
        showSearch
        allowClear
        placeholder="Наименование"
        loading={loading}
        filterOption={(input, option) => {
          const label = (option?.label ?? option?.value ?? '')?.toString?.() ?? '';
          return label.toLowerCase().includes((input ?? '').toLowerCase());
        }}
        notFoundContent={
          loading ? <Spin size="small" /> :
          'Номенклатура не найдена. Запустите синхронизацию НСИ на странице «Интеграция с УХ».'
        }
        optionLabelProp="label"
        style={{ width: '100%' }}
      >
        {items.map((item) => (
          <Option key={item.id} value={item.id} label={item.name}>
            <div>
              <div style={{ fontWeight: 500 }}>{item.name}</div>
              {item.code && (
                <div style={{ fontSize: '12px', color: '#999' }}>Код: {item.code}</div>
              )}
            </div>
          </Option>
        ))}
      </Select>
    </ReferenceSelectWrapper>
  );
}
