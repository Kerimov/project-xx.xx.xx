import { useState, useEffect } from 'react';
import { Select, Spin, message } from 'antd';
import { api } from '../../services/api';
import { ReferenceSelectWrapper } from './ReferenceSelectWrapper';
import type { SelectProps } from 'antd';
import { useAnalyticsAccess } from '../../contexts/AnalyticsAccessContext';

const { Option } = Select;

interface Contract {
  id: string;
  name: string;
  organizationId?: string;
  organizationName?: string;
  counterpartyId?: string;
  counterpartyName?: string;
}

interface ContractSelectProps extends Omit<SelectProps, 'options' | 'loading'> {
  value?: string;
  onChange?: (value: string) => void;
  organizationId?: string;
  counterpartyId?: string;
}

export function ContractSelect({ 
  value, 
  onChange, 
  organizationId,
  counterpartyId,
  ...props 
}: ContractSelectProps) {
  const { isEnabled } = useAnalyticsAccess();
  const enabled = isEnabled('CONTRACT');
  const [loading, setLoading] = useState(false);
  const [contracts, setContracts] = useState<Contract[]>([]);

  useEffect(() => {
    if (enabled) return;
    if (!value) return;
    onChange?.('' as any);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled]);

  const loadContracts = async () => {
    setLoading(true);
    try {
      const response = await api.nsi.contracts(organizationId, undefined);
      let data = response.data || [];
      if (counterpartyId) {
        data = data.filter((c: Contract) => c.counterpartyId === counterpartyId);
      }
      setContracts(data);
    } catch (error: any) {
      message.error('Ошибка загрузки договоров: ' + (error.message || 'Неизвестная ошибка'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (organizationId) {
      loadContracts();
    } else {
      setContracts([]);
    }
  }, [organizationId, counterpartyId]);

  const loadItems = async () => {
    const response = await api.nsi.contracts(organizationId, undefined, counterpartyId);
    return (response.data || []) as Contract[];
  };

  return (
    <ReferenceSelectWrapper<Contract>
      directoryTitle="Справочник договоров"
      columns={[
        { title: 'Наименование', dataIndex: 'name', key: 'name', ellipsis: true },
        { title: 'Организация', dataIndex: 'organizationName', key: 'organizationName', width: 180 },
        { title: 'Контрагент', dataIndex: 'counterpartyName', key: 'counterpartyName', width: 180 },
      ]}
      loadItems={loadItems}
      onSelect={(id) => onChange?.(id)}
      disabled={!enabled || !organizationId}
      disabledHint={!enabled ? 'Нет подписки на аналитику' : 'Сначала выберите организацию'}
    >
      <Select
        {...props}
        value={value}
        onChange={onChange}
        showSearch
        allowClear
        placeholder={enabled ? 'Выберите договор' : 'Недоступно (нет подписки на аналитику)'}
        loading={loading}
        disabled={!enabled || !organizationId}
        filterOption={(input, option) =>
          (option?.children as string)?.toLowerCase().includes(input.toLowerCase())
        }
        notFoundContent={
          loading ? <Spin size="small" /> :
          !enabled ? 'Недоступно (нет подписки на аналитику)' :
          organizationId ? 'Договоры не найдены' : 'Сначала выберите организацию'
        }
        optionLabelProp="label"
        style={{ width: '100%' }}
      >
        {contracts.map(contract => (
          <Option key={contract.id} value={contract.id} label={contract.name}>
            <div>
              <div style={{ fontWeight: 500 }}>{contract.name}</div>
              {contract.organizationName && (
                <div style={{ fontSize: '12px', color: '#999' }}>Орг: {contract.organizationName}</div>
              )}
              {contract.counterpartyName && (
                <div style={{ fontSize: '12px', color: '#999' }}>Контрагент: {contract.counterpartyName}</div>
              )}
            </div>
          </Option>
        ))}
      </Select>
    </ReferenceSelectWrapper>
  );
}
