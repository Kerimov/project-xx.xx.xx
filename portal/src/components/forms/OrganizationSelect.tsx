import { useState, useEffect, useMemo } from 'react';
import { Select, Spin, message } from 'antd';
import { api } from '../../services/api';
import type { SelectProps } from 'antd';

const { Option } = Select;

interface Organization {
  id: string;
  code: string;
  name: string;
  inn: string;
}

interface OrganizationSelectProps extends Omit<SelectProps, 'options' | 'loading'> {
  value?: string;
  onChange?: (value: string) => void;
}

export function OrganizationSelect({ value, onChange, ...props }: OrganizationSelectProps) {
  const [loading, setLoading] = useState(false);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [searchValue, setSearchValue] = useState('');

  const loadOrganizations = async (search?: string) => {
    setLoading(true);
    try {
      const response = await api.nsi.organizations(search);
      setOrganizations(response.data || []);
    } catch (error: any) {
      message.error('Ошибка загрузки организаций: ' + (error.message || 'Неизвестная ошибка'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrganizations();
  }, []);

  const handleSearch = (search: string) => {
    setSearchValue(search);
    if (search.length >= 2 || search.length === 0) {
      loadOrganizations(search || undefined);
    }
  };

  const selectedOrganization = useMemo(() => {
    return organizations.find(org => org.id === value);
  }, [organizations, value]);

  return (
    <Select
      {...props}
      value={value}
      onChange={onChange}
      showSearch
      allowClear
      placeholder="Выберите организацию"
      loading={loading}
      filterOption={false}
      onSearch={handleSearch}
      notFoundContent={loading ? <Spin size="small" /> : null}
      optionLabelProp="label"
    >
      {organizations.map(org => (
        <Option key={org.id} value={org.id} label={org.name}>
          <div>
            <div style={{ fontWeight: 500 }}>{org.name}</div>
            {org.code && <div style={{ fontSize: '12px', color: '#999' }}>Код: {org.code}</div>}
            {org.inn && <div style={{ fontSize: '12px', color: '#999' }}>ИНН: {org.inn}</div>}
          </div>
        </Option>
      ))}
    </Select>
  );
}
