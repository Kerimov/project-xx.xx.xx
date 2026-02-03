import { useState, useEffect, useCallback } from 'react';
import { Select, Spin, message, Alert } from 'antd';
import { Link } from 'react-router-dom';
import { InfoCircleOutlined } from '@ant-design/icons';
import { api } from '../../services/api';
import { ReferenceSelectWrapper } from './ReferenceSelectWrapper';
import type { SelectProps } from 'antd';
import { useObjectAccess } from '../../contexts/ObjectAccessContext';

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
  // Номенклатура для строк документов должна уважать подписки "Объекты учета" (v2),
  // чтобы организация могла ограничить список до выбранных карточек (SELECTED).
  const { isEnabled } = useObjectAccess();
  const enabled = isEnabled('ITEM');
  const typeCode = 'ITEM';
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
      const res = await api.objects.subscribedCards.list({
        typeCode,
        search,
        status: 'Active',
        limit: 200
      });
      const list = res?.data?.cards || [];
      return list.map((c) => ({
        id: c.id,
        code: c.code || '',
        name: c.name || '',
        data: (c.attrs as any) || undefined
      })) as any;
    } catch {
      return [];
    }
  }, [typeCode]);

  const loadInitial = async () => {
    setLoading(true);
    try {
      const list = await loadItems(undefined);
      setItems(list);
      // Если задан value и его нет в списке — подгружаем по id (для редактирования).
      // value может быть ID карточки объекта (object_cards) или ID номенклатуры НСИ (nomenclature).
      if (value && !list.some((x) => x.id === value)) {
        try {
          const resolved = await api.objects.cards.resolve(value);
          const data: any = resolved?.data ?? null;
          if (data?.kind === 'object_card' && data?.id) {
            setItems((prev) => [{ id: data.id, code: data.code || '', name: data.name || '', data: data.attrs }, ...prev]);
          } else if (data?.kind === 'nsi_nomenclature' && data?.id) {
            setItems((prev) => [{ id: data.id, code: data.code || '', name: data.name || '', data: data.data }, ...prev]);
          }
        } catch {
          // ignore
        }
      }
    } catch (error: any) {
      message.error('Ошибка загрузки номенклатуры: ' + (error.message || 'Неизвестная ошибка'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInitial();
  }, [loadItems, value]);

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
              Номенклатура недоступна. <Link to="/analytics" target="_blank" rel="noopener noreferrer">Подключить подписку в «Объекты учета» →</Link>
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
          'Ничего не найдено. Создайте карточки номенклатуры во вкладке «Объекты учета» или расширьте подписку.'
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
