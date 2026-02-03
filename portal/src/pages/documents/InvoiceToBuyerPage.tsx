import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Form, Input, DatePicker, Select, Button, Space, Typography, Table, InputNumber, message } from 'antd';
import { ArrowLeftOutlined } from '@ant-design/icons';
import { BaseDocumentForm } from '../../components/forms/BaseDocumentForm';
import { OrganizationSelect, CounterpartySelect, ContractSelect } from '../../components/forms';
import { api } from '../../services/api';
import { useDocumentEdit } from './useDocumentEdit';
import { useAutoFillOrganization } from '../../hooks/useAutoFillOrganization';
import dayjs from 'dayjs';

const { Title } = Typography;
const { Option } = Select;

interface InvoiceItem {
  id?: string;
  name: string;
  quantity: number;
  price: number;
  amount: number;
}

interface InvoiceToBuyerPageProps {
  documentId?: string;
}

export function InvoiceToBuyerPage({ documentId }: InvoiceToBuyerPageProps = {}) {
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const [items, setItems] = useState<InvoiceItem[]>([]);
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

  // Автоматическое заполнение организации при создании нового документа
  useAutoFillOrganization(form, isEditMode, setSelectedOrganizationId);

  const handleSave = async () => {
    try {
      setLoading(true);
      const values = await form.validateFields();
      const document = {
        ...values,
        date: values.date.format('YYYY-MM-DD'),
        dueDate: values.dueDate?.format('YYYY-MM-DD'),
        type: 'InvoiceToBuyer',
        items,
        portalStatus: 'Draft',
        totalAmount: items.reduce((sum, item) => sum + item.amount, 0)
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
        dueDate: values.dueDate?.format('YYYY-MM-DD'),
        type: 'InvoiceToBuyer',
        items,
        portalStatus: 'Frozen',
        totalAmount: items.reduce((sum, item) => sum + item.amount, 0)
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
    setItems([...items, { name: '', quantity: 1, price: 0, amount: 0 }]);
  };

  const itemColumns = [
    { title: 'N', key: 'index', width: 50, render: (_: any, __: any, index: number) => index + 1 },
    {
      title: 'Наименование',
      dataIndex: 'name',
      key: 'name',
      render: (_: any, record: InvoiceItem, index: number) => (
        <Input
          value={record.name}
          onChange={(e) => {
            const updated = [...items];
            updated[index].name = e.target.value;
            setItems(updated);
          }}
          placeholder="Введите наименование"
        />
      )
    },
    {
      title: 'Количество',
      dataIndex: 'quantity',
      key: 'quantity',
      width: 120,
      render: (_: any, record: InvoiceItem, index: number) => (
        <InputNumber
          value={record.quantity}
          onChange={(value) => {
            const updated = [...items];
            updated[index].quantity = value || 0;
            updated[index].amount = updated[index].quantity * updated[index].price;
            setItems(updated);
          }}
          min={0}
          style={{ width: '100%' }}
        />
      )
    },
    {
      title: 'Цена',
      dataIndex: 'price',
      key: 'price',
      width: 120,
      render: (_: any, record: InvoiceItem, index: number) => (
        <InputNumber
          value={record.price}
          onChange={(value) => {
            const updated = [...items];
            updated[index].price = value || 0;
            updated[index].amount = updated[index].quantity * updated[index].price;
            setItems(updated);
          }}
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
      render: (_: any, record: InvoiceItem) => record.amount.toFixed(2)
    },
    {
      title: 'Действия',
      key: 'actions',
      width: 100,
      render: (_: any, __: any, index: number) => (
        <Button type="link" danger onClick={() => setItems(items.filter((_, i) => i !== index))}>
          Удалить
        </Button>
      )
    }
  ];

  return (
    <div className="page">
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        <Space>
          <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/documents')}>
            Назад
          </Button>
          <Title level={3} style={{ margin: 0 }}>
            Счет покупателю (создание)
          </Title>
        </Space>

        <Form
          form={form}
          layout="vertical"
          initialValues={{
            date: dayjs(),
            currency: 'RUB'
          }}
        >
          <BaseDocumentForm
            title="Основные реквизиты"
            onSave={handleSave}
            onFreeze={handleFreeze}
            loading={loading}
          >
            <Form.Item
              label="Счет №"
              name="number"
              rules={[{ required: true, message: 'Введите номер счета' }]}
            >
              <Input placeholder="Введите номер" />
            </Form.Item>

            <Form.Item
              label="от:"
              name="date"
              rules={[{ required: true, message: 'Выберите дату' }]}
            >
              <DatePicker style={{ width: '100%' }} format="DD.MM.YYYY" />
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

            <Form.Item label="Срок оплаты:" name="dueDate">
              <DatePicker style={{ width: '100%' }} format="DD.MM.YYYY" />
            </Form.Item>

            <Form.Item label="Валюта:" name="currency">
              <Select>
                <Option value="RUB">RUB</Option>
                <Option value="USD">USD</Option>
                <Option value="EUR">EUR</Option>
              </Select>
            </Form.Item>
          </BaseDocumentForm>

          <BaseDocumentForm
            title="Товары и услуги"
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
              />
            </Space>
          </BaseDocumentForm>
        </Form>
      </Space>
    </div>
  );
}
