import { useState, useEffect, useCallback } from 'react';
import { Select, Spin, message } from 'antd';
import { api } from '../../services/api';
import { ReferenceSelectWrapper } from './ReferenceSelectWrapper';
import type { SelectProps } from 'antd';

const { Option } = Select;

interface Department {
  id: string;
  code: string;
  name: string;
  organizationId?: string;
  organizationName?: string;
}

interface DepartmentSelectProps extends Omit<SelectProps, 'options' | 'loading'> {
  value?: string;
  onChange?: (value: string) => void;
  /** Подразделения фильтруются по организации */
  organizationId?: string;
}

export function DepartmentSelect({
  value,
  onChange,
  organizationId,
  ...props
}: DepartmentSelectProps) {
  const [loading, setLoading] = useState(false);
  const [departments, setDepartments] = useState<Department[]>([]);

  const loadDepartments = async () => {
    setLoading(true);
    try {
      const response = await api.nsi.departments(organizationId, undefined);
      setDepartments(response.data || []);
    } catch (error: unknown) {
      const err = error as Error;
      message.error('Ошибка загрузки подразделений: ' + (err.message || 'Неизвестная ошибка'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDepartments();
  }, [organizationId]);

  const loadItems = useCallback(async (search?: string): Promise<Department[]> => {
    try {
      const response = await api.nsi.departments(organizationId, search);
      const list = response?.data;
      return Array.isArray(list) ? list : [];
    } catch {
      return [];
    }
  }, [organizationId]);

  return (
    <ReferenceSelectWrapper<Department>
      directoryTitle="Справочник подразделений"
      columns={[
        { title: 'Наименование', dataIndex: 'name', key: 'name', ellipsis: true },
        { title: 'Код', dataIndex: 'code', key: 'code', width: 120 },
        { title: 'Организация', dataIndex: 'organizationName', key: 'organizationName', width: 180 },
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
        placeholder={organizationId ? 'Выберите подразделение' : 'Сначала выберите организацию'}
        loading={loading}
        disabled={!organizationId}
        filterOption={(input, option) => {
          const label = (option?.label ?? option?.value ?? '')?.toString?.() ?? '';
          return label.toLowerCase().includes((input ?? '').toLowerCase());
        }}
        notFoundContent={
          loading ? (
            <Spin size="small" />
          ) : !organizationId ? (
            'Сначала выберите организацию'
          ) : (
            'Подразделения не найдены. Запустите синхронизацию НСИ на странице «Интеграция с УХ».'
          )
        }
        optionLabelProp="label"
        style={{ width: '100%' }}
      >
        {departments.map((dept) => (
          <Option key={dept.id} value={dept.id} label={dept.name}>
            <div>
              <div style={{ fontWeight: 500 }}>{dept.name}</div>
              {dept.code && (
                <div style={{ fontSize: '12px', color: '#999' }}>Код: {dept.code}</div>
              )}
              {dept.organizationName && (
                <div style={{ fontSize: '12px', color: '#999' }}>Орг: {dept.organizationName}</div>
              )}
            </div>
          </Option>
        ))}
      </Select>
    </ReferenceSelectWrapper>
  );
}
