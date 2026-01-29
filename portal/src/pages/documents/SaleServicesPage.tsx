import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Form, Input, DatePicker, Select, Button, Space, Typography, Table, InputNumber, Checkbox, message } from 'antd';
import { ArrowLeftOutlined } from '@ant-design/icons';
import { BaseDocumentForm } from '../../components/forms/BaseDocumentForm';
import { OrganizationSelect, CounterpartySelect, ContractSelect } from '../../components/forms';
import { api } from '../../services/api';
import dayjs from 'dayjs';

const { Title } = Typography;
const { Option } = Select;

interface SaleServicesItem {
  id?: string;
  rowNumber?: number;
  serviceName: string;
  quantity: number;
  unit: string;
  price: number;
  amount: number;
  vatPercent: number;
  vatAmount: number;
  totalAmount: number;
  accountId?: string;
}

export function SaleServicesPage() {
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const [items, setItems] = useState<SaleServicesItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedOrganizationId, setSelectedOrganizationId] = useState<string | undefined>();
  const [selectedCounterpartyId, setSelectedCounterpartyId] = useState<string | undefined>();

  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      const document = {
        ...values,
        date: values.date.format('YYYY-MM-DD'),
        type: 'SaleServices',
        items,
        portalStatus: 'Draft',
        totalAmount: items.reduce((sum, item) => sum + item.totalAmount, 0),
        totalVAT: items.reduce((sum, item) => sum + item.vatAmount, 0)
      };

      const response = await api.documents.create(document);
      message.success('Документ сохранён');
      navigate(`/documents/${response.data.id}`);
    } catch (error) {
      message.error('Ошибка при сохранении документа');
    }
  };

  const handleFreeze = async () => {
    try {
      const values = await form.validateFields();
      const document = {
        ...values,
        date: values.date.format('YYYY-MM-DD'),
        type: 'SaleServices',
        items,
        portalStatus: 'Frozen',
        totalAmount: items.reduce((sum, item) => sum + item.totalAmount, 0),
        totalVAT: items.reduce((sum, item) => sum + item.vatAmount, 0)
      };

      const response = await api.documents.create(document);
      await api.documents.freeze(response.data.id);
      message.success('Документ заморожен');
      navigate(`/documents/${response.data.id}`);
    } catch (error) {
      message.error('Ошибка при заморозке документа');
    }
  };

  const addItem = () => {
    const newItem: SaleServicesItem = {
      serviceName: '',
      quantity: 1,
      unit: 'усл',
      price: 0,
      amount: 0,
      vatPercent: 20,
      vatAmount: 0,
      totalAmount: 0
    };
    setItems([...items, newItem]);
  };

  const updateItem = (index: number, field: keyof SaleServicesItem, value: any) => {
    const updated = [...items];
    updated[index] = { ...updated[index], [field]: value };
    
    const item = updated[index];
    item.amount = (item.quantity || 0) * (item.price || 0);
    item.vatAmount = (item.amount * (item.vatPercent || 0)) / 100;
    item.totalAmount = item.amount + item.vatAmount;
    
    setItems(updated);
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const itemColumns = [
    {
      title: 'N',
      key: 'index',
      width: 50,
      render: (_: any, __: any, index: number) => index + 1
    },
    {
      title: 'Услуга',
      dataIndex: 'serviceName',
      key: 'serviceName',
      width: 300,
      render: (_: any, record: SaleServicesItem, index: number) => (
        <Input
          value={record.serviceName}
          onChange={(e) => updateItem(index, 'serviceName', e.target.value)}
          placeholder="Введите наименование услуги"
        />
      )
    },
    {
      title: 'Количество',
      dataIndex: 'quantity',
      key: 'quantity',
      width: 120,
      render: (_: any, record: SaleServicesItem, index: number) => (
        <InputNumber
          value={record.quantity}
          onChange={(value) => updateItem(index, 'quantity', value || 0)}
          min={0}
          precision={3}
          style={{ width: '100%' }}
        />
      )
    },
    {
      title: 'Ед.',
      dataIndex: 'unit',
      key: 'unit',
      width: 80,
      render: (_: any, record: SaleServicesItem, index: number) => (
        <Input
          value={record.unit}
          onChange={(e) => updateItem(index, 'unit', e.target.value)}
          placeholder="усл"
        />
      )
    },
    {
      title: 'Цена',
      dataIndex: 'price',
      key: 'price',
      width: 120,
      render: (_: any, record: SaleServicesItem, index: number) => (
        <InputNumber
          value={record.price}
          onChange={(value) => updateItem(index, 'price', value || 0)}
          min={0}
          precision={2}
          style={{ width: '100%' }}
        />
      )
    },
    {
      title: 'Сумма',
      dataIndex: 'amount',
      key: 'amount',
      width: 120,
      align: 'right' as const,
      render: (_: any, record: SaleServicesItem) => record.amount.toFixed(2)
    },
    {
      title: '% НДС',
      dataIndex: 'vatPercent',
      key: 'vatPercent',
      width: 100,
      render: (_: any, record: SaleServicesItem, index: number) => (
        <Select
          value={record.vatPercent}
          onChange={(value) => updateItem(index, 'vatPercent', value)}
          style={{ width: '100%' }}
        >
          <Option value={0}>Без НДС</Option>
          <Option value={10}>10%</Option>
          <Option value={20}>20%</Option>
        </Select>
      )
    },
    {
      title: 'НДС',
      dataIndex: 'vatAmount',
      key: 'vatAmount',
      width: 120,
      align: 'right' as const,
      render: (_: any, record: SaleServicesItem) => record.vatAmount.toFixed(2)
    },
    {
      title: 'Всего',
      dataIndex: 'totalAmount',
      key: 'totalAmount',
      width: 120,
      align: 'right' as const,
      render: (_: any, record: SaleServicesItem) => record.totalAmount.toFixed(2)
    },
    {
      title: 'Счет учета',
      dataIndex: 'accountId',
      key: 'accountId',
      width: 150,
      render: (_: any, record: SaleServicesItem, index: number) => (
        <Select
          value={record.accountId}
          onChange={(value) => updateItem(index, 'accountId', value)}
          placeholder="Выберите счет"
          allowClear
          style={{ width: '100%' }}
        >
          {/* TODO: загрузка счетов из API */}
        </Select>
      )
    },
    {
      title: 'Действия',
      key: 'actions',
      width: 100,
      render: (_: any, __: any, index: number) => (
        <Button type="link" danger onClick={() => removeItem(index)}>
          Удалить
        </Button>
      )
    }
  ];

  const totalAmount = items.reduce((sum, item) => sum + item.totalAmount, 0);
  const totalVAT = items.reduce((sum, item) => sum + item.vatAmount, 0);

  return (
    <div className="page">
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        <Space>
          <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/documents')}>
            Назад
          </Button>
          <Title level={3} style={{ margin: 0 }}>
            Реализация услуг: Акт, УПД (создание)
          </Title>
        </Space>

        <Form
          form={form}
          layout="vertical"
          initialValues={{
            date: dayjs(),
            isUPD: false,
            invoiceRequired: 'notRequired'
          }}
        >
          <BaseDocumentForm
            title="Основные реквизиты"
            onSave={handleSave}
            onFreeze={handleFreeze}
            loading={loading}
          >
            <Form.Item
              label="Акт, УПД №"
              name="number"
              rules={[{ required: true, message: 'Введите номер документа' }]}
            >
              <Input placeholder="Введите номер" />
            </Form.Item>

            <Form.Item
              label="от:"
              name="date"
              rules={[{ required: true, message: 'Выберите дату' }]}
            >
              <DatePicker style={{ width: '100%' }} format="DD.MM.YYYY" showTime />
            </Form.Item>

            <Form.Item label="Номер:" name="documentNumber">
              <Input placeholder="Введите номер" />
            </Form.Item>

            <Form.Item 
              label="Организация" 
              name="organizationId" 
              rules={[{ required: true, message: 'Выберите организацию' }]}
            >
              <OrganizationSelect 
                onChange={(value) => {
                  setSelectedOrganizationId(value);
                  form.setFieldsValue({ contractId: undefined });
                }}
              />
            </Form.Item>

            <Form.Item
              label="Покупатель"
              name="counterpartyId"
              rules={[{ required: true, message: 'Выберите покупателя' }]}
            >
              <CounterpartySelect
                onChange={(value, counterparty) => {
                  setSelectedCounterpartyId(value);
                  if (counterparty) {
                    form.setFieldsValue({ 
                      counterpartyName: counterparty.name,
                      counterpartyInn: counterparty.inn 
                    });
                  }
                }}
                onNameChange={(name) => {
                  form.setFieldsValue({ counterpartyName: name });
                }}
              />
            </Form.Item>

            <Form.Item name="counterpartyName" hidden>
              <Input />
            </Form.Item>

            <Form.Item name="counterpartyInn" hidden>
              <Input />
            </Form.Item>

            <Form.Item label="Договор" name="contractId">
              <ContractSelect
                organizationId={selectedOrganizationId}
                counterpartyId={selectedCounterpartyId}
              />
            </Form.Item>

            <Form.Item label="Период оказания услуг:" name="servicePeriod">
              <Input placeholder="Например: январь 2026" />
            </Form.Item>

            <Form.Item label="Дата начала:" name="serviceStartDate">
              <DatePicker style={{ width: '100%' }} format="DD.MM.YYYY" />
            </Form.Item>

            <Form.Item label="Дата окончания:" name="serviceEndDate">
              <DatePicker style={{ width: '100%' }} format="DD.MM.YYYY" />
            </Form.Item>

            <Form.Item name="isUPD" valuePropName="checked">
              <Checkbox>УПД</Checkbox>
            </Form.Item>

            <Form.Item label="Счет-фактура" name="invoiceRequired">
              <Select>
                <Option value="notRequired">Не требуется</Option>
                <Option value="required">Требуется</Option>
              </Select>
            </Form.Item>
          </BaseDocumentForm>

          <BaseDocumentForm
            title="Услуги"
            onSave={handleSave}
            onFreeze={handleFreeze}
            loading={loading}
            showFreeze={false}
          >
            <Space direction="vertical" style={{ width: '100%' }}>
              <Space>
                <Button onClick={addItem}>Добавить</Button>
                <Button>Подбор</Button>
                <Button>Изменить</Button>
              </Space>
              <Table
                columns={itemColumns}
                dataSource={items}
                rowKey={(record) => record.id || `item-${Math.random()}`}
                pagination={false}
                size="small"
                summary={() => (
                  <Table.Summary fixed>
                    <Table.Summary.Row>
                      <Table.Summary.Cell index={0} colSpan={6}>
                        <Space>
                          <Checkbox>УПД</Checkbox>
                          <span>Счет-фактура:</span>
                          <Select style={{ width: 150 }}>
                            <Option value="notRequired">Не требуется</Option>
                            <Option value="required">Требуется</Option>
                          </Select>
                        </Space>
                      </Table.Summary.Cell>
                      <Table.Summary.Cell index={6} align="right">
                        <strong>Всего: {totalAmount.toFixed(2)}</strong>
                      </Table.Summary.Cell>
                      <Table.Summary.Cell index={7} />
                      <Table.Summary.Cell index={8} align="right">
                        <strong>НДС (в т.ч.): {totalVAT.toFixed(2)}</strong>
                      </Table.Summary.Cell>
                      <Table.Summary.Cell index={9} colSpan={2} />
                    </Table.Summary.Row>
                  </Table.Summary>
                )}
              />
            </Space>
          </BaseDocumentForm>
        </Form>
      </Space>
    </div>
  );
}
