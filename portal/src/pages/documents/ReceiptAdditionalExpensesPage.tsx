import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Form, Input, DatePicker, Select, Button, Space, Typography, Table, InputNumber, message } from 'antd';
import { ArrowLeftOutlined } from '@ant-design/icons';
import { BaseDocumentForm } from '../../components/forms/BaseDocumentForm';
import { OrganizationSelect, CounterpartySelect, ContractSelect, AccountingAccountSelect } from '../../components/forms';
import { api } from '../../services/api';
import { useDocumentEdit } from './useDocumentEdit';
import dayjs from 'dayjs';

const { Title } = Typography;
const { Option } = Select;

interface ExpenseItem {
  id?: string;
  expenseType: string;
  amount: number;
  vatPercent: number;
  vatAmount: number;
  totalAmount: number;
  accountId?: string;
}

interface ReceiptAdditionalExpensesPageProps {
  documentId?: string;
}

export function ReceiptAdditionalExpensesPage({ documentId }: ReceiptAdditionalExpensesPageProps = {}) {
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const [items, setItems] = useState<ExpenseItem[]>([]);
  const [selectedOrganizationId, setSelectedOrganizationId] = useState<string | undefined>();
  const [selectedCounterpartyId, setSelectedCounterpartyId] = useState<string | undefined>();
  const { id, isEditMode, loading, setLoading } = useDocumentEdit({
    documentId,
    form,
    navigate,
    setItems,
    setSelectedOrganizationId,
    setSelectedCounterpartyId
  });

  const handleSave = async () => {
    try {
      setLoading(true);
      const values = await form.validateFields();
      const document = {
        ...values,
        date: values.date.format('YYYY-MM-DD'),
        type: 'ReceiptAdditionalExpenses',
        items,
        portalStatus: 'Draft',
        totalAmount: items.reduce((sum, item) => sum + item.totalAmount, 0),
        totalVAT: items.reduce((sum, item) => sum + item.vatAmount, 0)
      };

      if (isEditMode && id) {
        await api.documents.update(id, document);
        message.success('Документ обновлён');
        navigate(`/documents/${id}`);
      } else {
        const response = await api.documents.create(document);
        message.success('Документ сохранён');
        navigate(`/documents/${response.data.id}`);
      }
    } catch (error) {
      message.error('Ошибка при сохранении документа');
    } finally {
      setLoading(false);
    }
  };

  const handleFreeze = async () => {
    try {
      setLoading(true);
      const values = await form.validateFields();
      const document = {
        ...values,
        date: values.date.format('YYYY-MM-DD'),
        type: 'ReceiptAdditionalExpenses',
        items,
        portalStatus: 'Frozen',
        totalAmount: items.reduce((sum, item) => sum + item.totalAmount, 0),
        totalVAT: items.reduce((sum, item) => sum + item.vatAmount, 0)
      };

      if (isEditMode && id) {
        await api.documents.update(id, document);
        await api.documents.freeze(id);
        message.success('Документ заморожен');
        navigate(`/documents/${id}`);
      } else {
        const response = await api.documents.create(document);
        await api.documents.freeze(response.data.id);
        message.success('Документ заморожен');
        navigate(`/documents/${response.data.id}`);
      }
    } catch (error) {
      message.error('Ошибка при заморозке документа');
    } finally {
      setLoading(false);
    }
  };

  const addItem = () => {
    const newItem: ExpenseItem = {
      expenseType: '',
      amount: 0,
      vatPercent: 20,
      vatAmount: 0,
      totalAmount: 0
    };
    setItems([...items, newItem]);
  };

  const updateItem = (index: number, field: keyof ExpenseItem, value: any) => {
    const updated = [...items];
    updated[index] = { ...updated[index], [field]: value };
    
    const item = updated[index];
    item.vatAmount = ((item.amount || 0) * (item.vatPercent || 0)) / 100;
    item.totalAmount = (item.amount || 0) + item.vatAmount;
    
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
      title: 'Вид расхода',
      dataIndex: 'expenseType',
      key: 'expenseType',
      width: 300,
      render: (_: any, record: ExpenseItem, index: number) => (
        <Input
          value={record.expenseType}
          onChange={(e) => updateItem(index, 'expenseType', e.target.value)}
          placeholder="Введите вид расхода"
        />
      )
    },
    {
      title: 'Сумма',
      dataIndex: 'amount',
      key: 'amount',
      width: 120,
      render: (_: any, record: ExpenseItem, index: number) => (
        <InputNumber
          value={record.amount}
          onChange={(value) => updateItem(index, 'amount', value || 0)}
          min={0}
          precision={2}
          style={{ width: '100%' }}
        />
      )
    },
    {
      title: '% НДС',
      dataIndex: 'vatPercent',
      key: 'vatPercent',
      width: 100,
      render: (_: any, record: ExpenseItem, index: number) => (
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
      render: (_: any, record: ExpenseItem) => record.vatAmount.toFixed(2)
    },
    {
      title: 'Всего',
      dataIndex: 'totalAmount',
      key: 'totalAmount',
      width: 120,
      align: 'right' as const,
      render: (_: any, record: ExpenseItem) => record.totalAmount.toFixed(2)
    },
    {
      title: 'Счет учета',
      dataIndex: 'accountId',
      key: 'accountId',
      width: 150,
      render: (_: any, record: ExpenseItem, index: number) => (
        <AccountingAccountSelect
          value={record.accountId}
          onChange={(value) => updateItem(index, 'accountId', value)}
          placeholder="Выберите счет"
          style={{ width: '100%' }}
        />
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
            Поступление доп. расходов (создание)
          </Title>
        </Space>

        <Form
          form={form}
          layout="vertical"
          initialValues={{
            date: dayjs()
          }}
        >
          <BaseDocumentForm
            title="Основные реквизиты"
            onSave={handleSave}
            onFreeze={handleFreeze}
            loading={loading}
          >
            <Form.Item
              label="Документ №"
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
              label="Контрагент"
              name="counterpartyId"
              rules={[{ required: true, message: 'Выберите контрагента' }]}
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

            <Form.Item label="Основание:" name="basis">
              <Input placeholder="Ссылка на документ поступления" />
            </Form.Item>
          </BaseDocumentForm>

          <BaseDocumentForm
            title="Дополнительные расходы"
            onSave={handleSave}
            onFreeze={handleFreeze}
            loading={loading}
            showFreeze={false}
          >
            <Space direction="vertical" style={{ width: '100%' }}>
              <Button onClick={addItem}>Добавить</Button>
              <Table
                columns={itemColumns}
                dataSource={items}
                rowKey={(record) => record.id || `item-${Math.random()}`}
                pagination={false}
                size="small"
                summary={() => (
                  <Table.Summary fixed>
                    <Table.Summary.Row>
                      <Table.Summary.Cell index={0} colSpan={3}>
                        <strong>Итого:</strong>
                      </Table.Summary.Cell>
                      <Table.Summary.Cell index={3} />
                      <Table.Summary.Cell index={4} align="right">
                        <strong>{totalVAT.toFixed(2)}</strong>
                      </Table.Summary.Cell>
                      <Table.Summary.Cell index={5} align="right">
                        <strong>{totalAmount.toFixed(2)}</strong>
                      </Table.Summary.Cell>
                      <Table.Summary.Cell index={6} colSpan={2} />
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
