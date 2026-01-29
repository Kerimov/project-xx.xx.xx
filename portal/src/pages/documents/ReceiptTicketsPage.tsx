import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Form, Input, DatePicker, Select, Button, Space, Typography, Table, InputNumber, message } from 'antd';
import { ArrowLeftOutlined } from '@ant-design/icons';
import { BaseDocumentForm } from '../../components/forms/BaseDocumentForm';
import { OrganizationSelect, CounterpartySelect, ContractSelect } from '../../components/forms';
import { api } from '../../services/api';
import { useDocumentEdit } from './useDocumentEdit';
import dayjs from 'dayjs';

const { Title } = Typography;
const { Option } = Select;

interface TicketItem {
  id?: string;
  ticketType: string;
  ticketNumber: string;
  passengerName: string;
  route: string;
  departureDate: string;
  arrivalDate: string;
  amount: number;
  vatPercent: number;
  vatAmount: number;
  totalAmount: number;
}

interface ReceiptTicketsPageProps {
  documentId?: string;
}

export function ReceiptTicketsPage({ documentId }: ReceiptTicketsPageProps = {}) {
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const [items, setItems] = useState<TicketItem[]>([]);
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
        type: 'ReceiptTickets',
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
        type: 'ReceiptTickets',
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
    const newItem: TicketItem = {
      ticketType: 'airline',
      ticketNumber: '',
      passengerName: '',
      route: '',
      departureDate: '',
      arrivalDate: '',
      amount: 0,
      vatPercent: 0,
      vatAmount: 0,
      totalAmount: 0
    };
    setItems([...items, newItem]);
  };

  const updateItem = (index: number, field: keyof TicketItem, value: any) => {
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
      title: 'Тип билета',
      dataIndex: 'ticketType',
      key: 'ticketType',
      width: 120,
      render: (_: any, record: TicketItem, index: number) => (
        <Select
          value={record.ticketType}
          onChange={(value) => updateItem(index, 'ticketType', value)}
          style={{ width: '100%' }}
        >
          <Option value="airline">Авиа</Option>
          <Option value="railway">Ж/Д</Option>
          <Option value="bus">Автобус</Option>
        </Select>
      )
    },
    {
      title: 'Номер билета',
      dataIndex: 'ticketNumber',
      key: 'ticketNumber',
      width: 150,
      render: (_: any, record: TicketItem, index: number) => (
        <Input
          value={record.ticketNumber}
          onChange={(e) => updateItem(index, 'ticketNumber', e.target.value)}
          placeholder="Номер билета"
        />
      )
    },
    {
      title: 'Пассажир',
      dataIndex: 'passengerName',
      key: 'passengerName',
      width: 200,
      render: (_: any, record: TicketItem, index: number) => (
        <Input
          value={record.passengerName}
          onChange={(e) => updateItem(index, 'passengerName', e.target.value)}
          placeholder="ФИО пассажира"
        />
      )
    },
    {
      title: 'Маршрут',
      dataIndex: 'route',
      key: 'route',
      width: 200,
      render: (_: any, record: TicketItem, index: number) => (
        <Input
          value={record.route}
          onChange={(e) => updateItem(index, 'route', e.target.value)}
          placeholder="Откуда - Куда"
        />
      )
    },
    {
      title: 'Дата отправления',
      dataIndex: 'departureDate',
      key: 'departureDate',
      width: 150,
      render: (_: any, record: TicketItem, index: number) => (
        <DatePicker
          value={record.departureDate ? dayjs(record.departureDate) : null}
          onChange={(date) => updateItem(index, 'departureDate', date?.format('YYYY-MM-DD') || '')}
          style={{ width: '100%' }}
          format="DD.MM.YYYY"
        />
      )
    },
    {
      title: 'Дата прибытия',
      dataIndex: 'arrivalDate',
      key: 'arrivalDate',
      width: 150,
      render: (_: any, record: TicketItem, index: number) => (
        <DatePicker
          value={record.arrivalDate ? dayjs(record.arrivalDate) : null}
          onChange={(date) => updateItem(index, 'arrivalDate', date?.format('YYYY-MM-DD') || '')}
          style={{ width: '100%' }}
          format="DD.MM.YYYY"
        />
      )
    },
    {
      title: 'Сумма',
      dataIndex: 'amount',
      key: 'amount',
      width: 120,
      render: (_: any, record: TicketItem, index: number) => (
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
      render: (_: any, record: TicketItem, index: number) => (
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
      title: 'Всего',
      dataIndex: 'totalAmount',
      key: 'totalAmount',
      width: 120,
      align: 'right' as const,
      render: (_: any, record: TicketItem) => record.totalAmount.toFixed(2)
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
            Поступление билетов (создание)
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
          </BaseDocumentForm>

          <BaseDocumentForm
            title="Билеты"
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
                      <Table.Summary.Cell index={0} colSpan={8}>
                        <strong>Итого:</strong>
                      </Table.Summary.Cell>
                      <Table.Summary.Cell index={8} align="right">
                        <strong>{totalAmount.toFixed(2)}</strong>
                      </Table.Summary.Cell>
                      <Table.Summary.Cell index={9} />
                      <Table.Summary.Cell index={10} />
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
