import { useState, useEffect } from 'react';
import { Select, Spin, message, Alert } from 'antd';
import { Link } from 'react-router-dom';
import { InfoCircleOutlined } from '@ant-design/icons';
import { api } from '../../services/api';
import { ReferenceSelectWrapper } from './ReferenceSelectWrapper';
import type { SelectProps } from 'antd';
import { useAnalyticsAccess } from '../../contexts/AnalyticsAccessContext';

const { Option } = Select;

interface AccountingAccount {
  id: string;
  code: string | null;
  name: string;
}

interface AccountingAccountSelectProps extends Omit<SelectProps, 'options' | 'loading'> {
  value?: string;
  onChange?: (value: string) => void;
}

export function AccountingAccountSelect({
  value,
  onChange,
  ...props
}: AccountingAccountSelectProps) {
  const { isEnabled } = useAnalyticsAccess();
  const enabled = isEnabled('ACCOUNTING_ACCOUNT');
  const [loading, setLoading] = useState(false);
  const [accounts, setAccounts] = useState<AccountingAccount[]>([]);

  useEffect(() => {
    if (enabled) return;
    if (!value) return;
    onChange?.('' as any);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled]);

  const loadAccounts = async (search?: string) => {
    setLoading(true);
    try {
      const response = await api.nsi.accountingAccounts(search);
      setAccounts(response.data || []);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Ошибка загрузки';
      message.error('Ошибка загрузки плана счетов: ' + msg);
      setAccounts([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAccounts();
  }, []);

  const handleSearch = (input: string) => {
    if (input.trim()) {
      loadAccounts(input.trim());
    } else {
      loadAccounts();
    }
  };

  const loadItems = async (search?: string) => {
    const response = await api.nsi.accountingAccounts(search);
    return (response.data || []) as AccountingAccount[];
  };

  if (!enabled) {
    return (
      <>
        <Alert
          type="info"
          icon={<InfoCircleOutlined />}
          message={
            <span>
              Аналитика <strong>Счет учета (план счетов)</strong> недоступна. <Link to="/analytics" target="_blank" rel="noopener noreferrer">Подключить подписку →</Link>
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
    <ReferenceSelectWrapper<AccountingAccount>
      directoryTitle="План счетов"
      columns={[
        { title: 'Код', dataIndex: 'code', key: 'code', width: 120 },
        { title: 'Наименование', dataIndex: 'name', key: 'name', ellipsis: true },
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
        placeholder="Выберите счет"
        loading={loading}
        onSearch={handleSearch}
        filterOption={false}
        notFoundContent={loading ? <Spin size="small" /> : 'Счета не найдены'}
        optionLabelProp="label"
        style={{ width: '100%' }}
      >
        {accounts.map((account) => (
          <Option key={account.id} value={account.id} label={account.name}>
            <div>
              <div style={{ fontWeight: 500 }}>{account.name}</div>
              {account.code && (
                <div style={{ fontSize: '12px', color: '#999' }}>Код: {account.code}</div>
              )}
            </div>
          </Option>
        ))}
      </Select>
    </ReferenceSelectWrapper>
  );
}
