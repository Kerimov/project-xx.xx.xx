import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Select, Spin, message } from 'antd';
import { InfoCircleOutlined } from '@ant-design/icons';
import { Link } from 'react-router-dom';
import type { SelectProps } from 'antd';
import { api } from '../../services/api';
import { useAnalyticsAccess } from '../../contexts/AnalyticsAccessContext';
import { ReferenceSelectWrapper } from './ReferenceSelectWrapper';

const { Option } = Select;

export type AnalyticsValue = {
  id: string;
  code: string;
  name: string;
  attrs: Record<string, unknown>;
};

export interface AnalyticsValueSelectProps extends Omit<SelectProps, 'options' | 'loading'> {
  typeCode: string;
  value?: string;
  onChange?: (value: string) => void;
  organizationId?: string;
  counterpartyId?: string;
  /** Доп. фильтр (например, тип счета) */
  filterType?: string;
  directoryTitle?: string;
}

export function AnalyticsValueSelect({
  typeCode,
  value,
  onChange,
  organizationId,
  counterpartyId,
  filterType,
  directoryTitle,
  ...props
}: AnalyticsValueSelectProps) {
  const { isEnabled } = useAnalyticsAccess();
  const enabled = isEnabled(typeCode);
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<AnalyticsValue[]>([]);

  useEffect(() => {
    if (enabled) return;
    if (!value) return;
    onChange?.('' as any);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled]);

  const needOrg = useMemo(() => ['CONTRACT', 'WAREHOUSE', 'ACCOUNT', 'BANK_ACCOUNT', 'DEPARTMENT'].includes(typeCode.toUpperCase()), [typeCode]);
  const orgRequired = needOrg && !organizationId;

  const load = useCallback(async (search?: string) => {
    if (!enabled) return;
    if (orgRequired) {
      setItems([]);
      return;
    }

    setLoading(true);
    try {
      const res = await api.analytics.listValues({
        typeCode,
        search,
        organizationId,
        counterpartyId,
        type: filterType,
        limit: 500
      });
      const list = (res.data || []).map((v) => ({
        id: v.id,
        code: v.code,
        name: v.name,
        attrs: v.attrs ?? {}
      })) as AnalyticsValue[];
      setItems(list);
    } catch (e: any) {
      message.error(e?.message || 'Ошибка загрузки значений аналитики');
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [enabled, orgRequired, typeCode, organizationId, counterpartyId, filterType]);

  useEffect(() => {
    load(undefined);
  }, [load]);

  const loadItems = useCallback(async (search?: string): Promise<Array<{ id: string } & AnalyticsValue>> => {
    if (!enabled || orgRequired) return [];
    const res = await api.analytics.listValues({
      typeCode,
      search,
      organizationId,
      counterpartyId,
      type: filterType,
      limit: 500
    });
    return (res.data || []).map((v) => ({
      id: v.id,
      code: v.code,
      name: v.name,
      attrs: v.attrs ?? {}
    })) as Array<{ id: string } & AnalyticsValue>;
  }, [enabled, orgRequired, typeCode, organizationId, counterpartyId, filterType]);

  if (!enabled) {
    return (
      <>
        <Alert
          type="info"
          icon={<InfoCircleOutlined />}
          message={
            <span>
              Аналитика <strong>{typeCode}</strong> недоступна.{' '}
              <Link to="/analytics" target="_blank" rel="noopener noreferrer">Подключить подписку →</Link>
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

  const columns = [
    { title: 'Наименование', dataIndex: 'name', key: 'name', ellipsis: true },
    { title: 'Код', dataIndex: 'code', key: 'code', width: 140 },
    { title: 'Организация', dataIndex: ['attrs', 'organizationName'], key: 'organizationName', width: 180 } as any,
    { title: 'Контрагент', dataIndex: ['attrs', 'counterpartyName'], key: 'counterpartyName', width: 180 } as any,
  ];

  return (
    <ReferenceSelectWrapper<any>
      directoryTitle={directoryTitle || `Справочник: ${typeCode}`}
      columns={columns as any}
      loadItems={loadItems as any}
      onSelect={(id) => onChange?.(id)}
      disabled={orgRequired}
      disabledHint={orgRequired ? 'Сначала выберите организацию' : undefined}
    >
      <Select
        {...props}
        value={value}
        onChange={onChange}
        showSearch
        allowClear
        placeholder={props.placeholder ?? 'Выберите значение'}
        loading={loading}
        disabled={orgRequired}
        filterOption={false}
        onSearch={(s) => {
          if (s.length >= 2 || s.length === 0) load(s || undefined);
        }}
        notFoundContent={
          loading ? <Spin size="small" /> :
          orgRequired ? 'Сначала выберите организацию' :
          'Значения не найдены'
        }
        optionLabelProp="label"
        style={{ width: '100%' }}
      >
        {items.map((it) => (
          <Option key={it.id} value={it.id} label={it.name}>
            <div>
              <div style={{ fontWeight: 500 }}>{it.name}</div>
              {it.code && <div style={{ fontSize: 12, color: '#999' }}>Код: {it.code}</div>}
              {(it.attrs?.organizationName as string | undefined) && (
                <div style={{ fontSize: 12, color: '#999' }}>Орг: {String(it.attrs.organizationName)}</div>
              )}
              {(it.attrs?.counterpartyName as string | undefined) && (
                <div style={{ fontSize: 12, color: '#999' }}>Контрагент: {String(it.attrs.counterpartyName)}</div>
              )}
            </div>
          </Option>
        ))}
      </Select>
    </ReferenceSelectWrapper>
  );
}

