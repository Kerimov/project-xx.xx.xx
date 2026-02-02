import { useState, useEffect } from 'react';
import { Select, Spin, message } from 'antd';
import { api } from '../../services/api';
import type { SelectProps } from 'antd';

const { Option } = Select;

interface PackageItem {
  id: string;
  name: string;
  company: string;
  period: string;
  type: string;
  documentCount: number;
  status: string;
}

interface PackageSelectProps extends Omit<SelectProps, 'options' | 'loading'> {
  value?: string;
  onChange?: (value: string) => void;
  organizationId?: string;
}

export function PackageSelect({ value, onChange, organizationId, ...props }: PackageSelectProps) {
  const [loading, setLoading] = useState(false);
  const [packages, setPackages] = useState<PackageItem[]>([]);

  const loadPackages = async () => {
    setLoading(true);
    try {
      const response = await api.packages.list({
        organizationId: organizationId || undefined,
        limit: 200
      });
      setPackages(response.data || []);
    } catch (error: any) {
      message.error('Ошибка загрузки пакетов: ' + (error?.message || 'Неизвестная ошибка'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPackages();
  }, [organizationId]);

  useEffect(() => {
    if (!value) return;
    if (packages.some((p) => p.id === value)) return;
    api.packages
      .getById(value)
      .then((res) => {
        if (res?.data && !packages.some((p) => p.id === res.data.id)) {
          setPackages((prev) => [res.data, ...prev]);
        }
      })
      .catch(() => {});
  }, [value]);

  return (
    <Select
      {...props}
      value={value}
      onChange={onChange}
      showSearch
      allowClear
      placeholder="Выберите пакет"
      loading={loading}
      filterOption={(input, opt) =>
        (opt?.label ?? '').toString().toLowerCase().includes(input.toLowerCase())
      }
      optionFilterProp="label"
      style={{ width: '100%' }}
      options={packages.map((p) => ({
        value: p.id,
        label: `${p.name}${p.period ? ` (${p.period})` : ''}`,
        title: `${p.name} | ${p.company || '—'} | ${p.period || '—'} | ${p.type || '—'}`
      }))}
    >
      {packages.map((p) => (
        <Option key={p.id} value={p.id} label={`${p.name} (${p.period})`}>
          <div>
            <div style={{ fontWeight: 500 }}>{p.name}</div>
            <div style={{ fontSize: '12px', color: '#999' }}>
              {p.period} | {p.company || '—'} | {p.type || '—'} | док: {p.documentCount ?? 0}
            </div>
          </div>
        </Option>
      ))}
    </Select>
  );
}
