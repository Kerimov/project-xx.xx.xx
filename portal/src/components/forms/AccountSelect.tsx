import { useState, useEffect } from 'react';
import { Select, Spin, message } from 'antd';
import { api } from '../../services/api';
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

  return (
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
              <div style={{ fontSize: '12px', color: '#999' }}>
                Орг: {account.organizationName}
              </div>
            )}
          </div>
        </Option>
      ))}
    </Select>
  );
}
