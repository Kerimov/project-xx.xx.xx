import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, Descriptions, Button, Spin, message } from 'antd';
import { ArrowLeftOutlined } from '@ant-design/icons';
import { api } from '../../services/api';

interface Contract {
  id: string;
  name: string;
  organizationId?: string | null;
  organizationName?: string;
  counterpartyId?: string | null;
  counterpartyName?: string;
  data?: Record<string, unknown>;
}

const DATA_LABELS: Record<string, string> = {
  code: 'Код',
  number: 'Номер',
  contractType: 'Вид договора',
  counterpartyTaxation: 'Налогообложение контрагента',
  validFrom: 'Действует с',
  validTo: 'Действует по',
  currency: 'Валюта взаиморасчетов',
  amount: 'Сумма договора',
  amountFixed: 'Сумма договора фиксирована',
  vatIncluded: 'НДС в сумме',
  vatPercent: '% НДС',
  total: 'Всего',
  versionNumber: 'Порядковый номер версии',
  versionValidFrom: 'Версия действует с',
  versionName: 'Наименование версии',
  contractStatus: 'Состояние договора',
  agreementType: 'Вид соглашения',
  functionalDirection: 'Функциональное направление',
  responsible: 'Ответственный',
  governmentContract: 'Государственный контракт',
};

// Порядок полей по секциям — все поля договора выводятся на форму (пустые как «—»).
const SECTION_MAIN_KEYS: string[] = ['code', 'number'];
const SECTION_TERMS_KEYS: string[] = [
  'contractType',
  'validFrom',
  'validTo',
  'currency',
  'amount',
  'amountFixed',
  'vatIncluded',
  'vatPercent',
  'total',
];
const SECTION_OTHER_KEYS: string[] = [
  'counterpartyTaxation',
  'versionNumber',
  'versionValidFrom',
  'versionName',
  'contractStatus',
  'agreementType',
  'functionalDirection',
  'responsible',
  'governmentContract',
];

function formatDataValue(value: unknown): React.ReactNode {
  if (value === null || value === undefined) return '—';
  if (typeof value === 'boolean') return value ? 'Да' : 'Нет';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

export function ContractDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [contract, setContract] = useState<Contract | null>(null);

  useEffect(() => {
    const loadContract = async () => {
      if (!id) return;

      setLoading(true);
      try {
        const response = await api.nsi.getContract(id);
        if (response.data) {
          setContract(response.data);
        } else {
          message.error('Договор не найден');
          navigate('/nsi');
        }
      } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : 'Неизвестная ошибка';
        message.error('Ошибка загрузки договора: ' + msg);
      } finally {
        setLoading(false);
      }
    };

    loadContract();
  }, [id, navigate]);

  if (loading) {
    return (
      <div style={{ padding: '24px', textAlign: 'center' }}>
        <Spin size="large" />
      </div>
    );
  }

  if (!contract) {
    return null;
  }

  const data = contract.data && typeof contract.data === 'object' ? contract.data : {};
  const systemDataKeys = ['organizationId', 'counterpartyId'];
  const allOrderedKeys = [...SECTION_MAIN_KEYS, ...SECTION_TERMS_KEYS, ...SECTION_OTHER_KEYS];
  const extraKeys = Object.keys(data).filter(
    (k) => !systemDataKeys.includes(k) && !allOrderedKeys.includes(k)
  );

  const renderDataRow = (key: string) => (
    <Descriptions.Item key={key} label={DATA_LABELS[key] || key}>
      {formatDataValue(data[key])}
    </Descriptions.Item>
  );

  return (
    <div style={{ padding: '24px' }}>
      <Button
        type="link"
        icon={<ArrowLeftOutlined />}
        onClick={() => navigate('/nsi')}
        style={{ marginBottom: 16 }}
      >
        Назад к списку
      </Button>

      <Card title="Основное" style={{ marginBottom: 16 }}>
        <Descriptions column={1} bordered size="small">
          <Descriptions.Item label="Наименование">{contract.name || '—'}</Descriptions.Item>
          {SECTION_MAIN_KEYS.map((key) => renderDataRow(key))}
        </Descriptions>
      </Card>

      <Card title="Стороны" style={{ marginBottom: 16 }}>
        <Descriptions column={1} bordered size="small">
          <Descriptions.Item label="Организация">
            {contract.organizationId ? (
              <Button
                type="link"
                onClick={() => navigate(`/nsi/organizations/${contract.organizationId}`)}
                style={{ padding: 0 }}
              >
                {contract.organizationName || contract.organizationId}
              </Button>
            ) : (
              contract.organizationName || '—'
            )}
          </Descriptions.Item>
          <Descriptions.Item label="Контрагент">
            {contract.counterpartyId ? (
              <Button
                type="link"
                onClick={() => navigate(`/nsi/counterparties/${contract.counterpartyId}`)}
                style={{ padding: 0 }}
              >
                {contract.counterpartyName || contract.counterpartyId}
              </Button>
            ) : (
              contract.counterpartyName || '—'
            )}
          </Descriptions.Item>
        </Descriptions>
      </Card>

      <Card title="Сроки и суммы" style={{ marginBottom: 16 }}>
        <Descriptions column={1} bordered size="small">
          {SECTION_TERMS_KEYS.map((key) => renderDataRow(key))}
        </Descriptions>
      </Card>

      <Card title="Дополнительные реквизиты" style={{ marginBottom: 16 }}>
        <Descriptions column={1} bordered size="small">
          {SECTION_OTHER_KEYS.map((key) => renderDataRow(key))}
          {extraKeys.map((key) => renderDataRow(key))}
        </Descriptions>
      </Card>
    </div>
  );
}
