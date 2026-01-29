import { useState, useEffect } from 'react';
import { Select, Spin, message } from 'antd';
import { api } from '../../services/api';
import type { SelectProps } from 'antd';

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
  const [loading, setLoading] = useState(false);
  const [contracts, setContracts] = useState<Contract[]>([]);

  const loadContracts = async () => {
    setLoading(true);
    try {
      const response = await api.nsi.contracts(
        organizationId,
        undefined // counterpartyName - можно добавить позже
      );
      let data = response.data || [];
      
      // Фильтруем по контрагенту, если указан
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

  return (
    <Select
      {...props}
      value={value}
      onChange={onChange}
      showSearch
      allowClear
      placeholder="Выберите договор"
      loading={loading}
      filterOption={(input, option) =>
        (option?.children as string)?.toLowerCase().includes(input.toLowerCase())
      }
      notFoundContent={loading ? <Spin size="small" /> : organizationId ? 'Договоры не найдены' : 'Сначала выберите организацию'}
      optionLabelProp="label"
    >
      {contracts.map(contract => (
        <Option key={contract.id} value={contract.id} label={contract.name}>
          <div>
            <div style={{ fontWeight: 500 }}>{contract.name}</div>
            {contract.organizationName && (
              <div style={{ fontSize: '12px', color: '#999' }}>
                Орг: {contract.organizationName}
              </div>
            )}
            {contract.counterpartyName && (
              <div style={{ fontSize: '12px', color: '#999' }}>
                Контрагент: {contract.counterpartyName}
              </div>
            )}
          </div>
        </Option>
      ))}
    </Select>
  );
}
