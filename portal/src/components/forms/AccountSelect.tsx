import { useState, useEffect } from 'react';
import { Select, Spin, message, Alert } from 'antd';
import { Link } from 'react-router-dom';
import { InfoCircleOutlined } from '@ant-design/icons';
import { api } from '../../services/api';
import { ReferenceSelectWrapper } from './ReferenceSelectWrapper';
import type { SelectProps } from 'antd';
import { useAnalyticsAccess } from '../../contexts/AnalyticsAccessContext';

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
  const { isEnabled } = useAnalyticsAccess();
  // В старых настройках может быть BANK_ACCOUNT вместо ACCOUNT
  const enabled = isEnabled('ACCOUNT') || isEnabled('BANK_ACCOUNT');
  const [loading, setLoading] = useState(false);
  const [accounts, setAccounts] = useState<Account[]>([]);

  useEffect(() => {
    if (enabled) return;
    if (!value) return;
    onChange?.('' as any);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled]);

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

  if (!enabled) {
    return (
      <>
        <Alert
          type="info"
          icon={<InfoCircleOutlined />}
          message={
            <span>
              Аналитика <strong>Счёт (банк/касса)</strong> недоступна. <Link to="/analytics" target="_blank" rel="noopener noreferrer">Подключить подписку →</Link>
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
        disabled={!organizationId}
        notFoundContent={
          loading ? <Spin size="small" /> :
          organizationId ? 'Счета не найдены' : 'Сначала выберите организацию'
        }
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
