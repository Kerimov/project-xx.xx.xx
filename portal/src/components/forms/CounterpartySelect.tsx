import { useState, useEffect, useMemo } from 'react';
import { Select, Spin, message, Input } from 'antd';
import { api } from '../../services/api';
import type { SelectProps } from 'antd';

const { Option } = Select;

interface Counterparty {
  id: string;
  name: string;
  inn: string;
}

interface CounterpartySelectProps extends Omit<SelectProps, 'options' | 'loading'> {
  value?: string;
  onChange?: (value: string, counterparty?: Counterparty) => void;
  onNameChange?: (name: string) => void;
}

export function CounterpartySelect({ value, onChange, onNameChange, ...props }: CounterpartySelectProps) {
  const [loading, setLoading] = useState(false);
  const [counterparties, setCounterparties] = useState<Counterparty[]>([]);
  const [searchValue, setSearchValue] = useState('');

  const loadCounterparties = async (search?: string) => {
    setLoading(true);
    try {
      const response = await api.nsi.counterparties(search);
      setCounterparties(response.data || []);
    } catch (error: any) {
      message.error('Ошибка загрузки контрагентов: ' + (error.message || 'Неизвестная ошибка'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCounterparties();
  }, []);

  const handleSearch = (search: string) => {
    setSearchValue(search);
    if (search.length >= 2 || search.length === 0) {
      loadCounterparties(search || undefined);
    }
  };

  const handleChange = (val: string) => {
    const counterparty = counterparties.find(cp => cp.id === val);
    if (onChange) {
      onChange(val, counterparty);
    }
    if (onNameChange && counterparty) {
      onNameChange(counterparty.name);
    }
  };

  const selectedCounterparty = useMemo(() => {
    return counterparties.find(cp => cp.id === value);
  }, [counterparties, value]);

  return (
    <Select
      {...props}
      value={value}
      onChange={handleChange}
      showSearch
      allowClear
      placeholder="Выберите контрагента"
      loading={loading}
      filterOption={false}
      onSearch={handleSearch}
      notFoundContent={loading ? <Spin size="small" /> : null}
      optionLabelProp="label"
      popupRender={(menu) => (
        <>
          {menu}
          <div style={{ padding: '8px', borderTop: '1px solid #f0f0f0' }}>
            <Input
              placeholder="Или введите название вручную"
              value={searchValue}
              onChange={(e) => {
                const val = e.target.value;
                setSearchValue(val);
                if (onNameChange && !counterparties.find(cp => cp.name === val)) {
                  onNameChange(val);
                }
              }}
              onPressEnter={() => {
                if (onNameChange && searchValue) {
                  onNameChange(searchValue);
                }
              }}
            />
          </div>
        </>
      )}
    >
      {counterparties.map(cp => (
        <Option key={cp.id} value={cp.id} label={cp.name}>
          <div>
            <div style={{ fontWeight: 500 }}>{cp.name}</div>
            {cp.inn && <div style={{ fontSize: '12px', color: '#999' }}>ИНН: {cp.inn}</div>}
          </div>
        </Option>
      ))}
    </Select>
  );
}
