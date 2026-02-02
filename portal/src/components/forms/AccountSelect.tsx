import { useState, useEffect } from 'react';
import { Select, Spin, message } from 'antd';
import { api } from '../../services/api';
import { ReferenceSelectWrapper } from './ReferenceSelectWrapper';
import type { SelectProps } from 'antd';

const { Option } = Select;

interface Account {
  id: string;
  code: string;
  name: string;
  organizationId?: string;
  organizationName?: string;
  type?: string;
}

interface AccountSelectProps extends Omit<SelectProps, 'options' | 'loading'> {
  value?: string;
  onChange?: (value: string) => void;
  organizationId?: string;
  type?: string;
}

export function AccountSelect({ 
  value, 
  onChange, 
  organizationId,
  type,
  ...props 
}: AccountSelectProps) {
  const [loading, setLoading] = useState(false);
  const [accounts, setAccounts] = useState<Account[]>([]);

  const loadAccounts = async () => {
    setLoading(true);
    try {
      const response = await api.nsi.accounts(organizationId, type);
      setAccounts(response.data || []);
    } catch (error: any) {
      message.error('Ошибка загрузки счетов: ' + (error.message || 'Неизвестная ошибка'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (organizationId) {
      loadAccounts();
    } else {
      setAccounts([]);
    }
  }, [organizationId, type]);

  const loadItems = async () => {
    const response = await api.nsi.accounts(organizationId, type);
    return (response.data || []) as Account[];
  };

  return (
    <ReferenceSelectWrapper<Account>
      directoryTitle="Справочник счетов"
      columns={[
        { title: 'Наименование', dataIndex: 'name', key: 'name', ellipsis: true },
        { title: 'Код', dataIndex: 'code', key: 'code', width: 120 },
        { title: 'Тип', dataIndex: 'type', key: 'type', width: 100 },
        { title: 'Организация', dataIndex: 'organizationName', key: 'organizationName', width: 180 },
      ]}
      loadItems={loadItems}
      onSelect={(id) => onChange?.(id)}
      disabled={!organizationId}
      disabledHint="Сначала выберите организацию"
    >
      <Select
        {...props}
        value={value}
        onChange={onChange}
        showSearch
        allowClear
        placeholder="Выберите счет"
        loading={loading}
        filterOption={(input, option) =>
          (option?.children as string)?.toLowerCase().includes(input.toLowerCase())
        }
        notFoundContent={loading ? <Spin size="small" /> : organizationId ? 'Счета не найдены' : 'Сначала выберите организацию'}
        optionLabelProp="label"
        style={{ width: '100%' }}
      >
        {accounts.map(account => (
          <Option key={account.id} value={account.id} label={account.name}>
            <div>
              <div style={{ fontWeight: 500 }}>{account.name}</div>
              {account.code && (
                <div style={{ fontSize: '12px', color: '#999' }}>Код: {account.code}</div>
              )}
              {account.type && (
                <div style={{ fontSize: '12px', color: '#999' }}>Тип: {account.type}</div>
              )}
              {account.organizationName && (
                <div style={{ fontSize: '12px', color: '#999' }}>Орг: {account.organizationName}</div>
              )}
            </div>
          </Option>
        ))}
      </Select>
    </ReferenceSelectWrapper>
  );
}
