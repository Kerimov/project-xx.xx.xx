import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Card,
  Form,
  Input,
  DatePicker,
  Select,
  Button,
  Space,
  Typography,
  Table,
  InputNumber,
  Checkbox,
  message
} from 'antd';
import { SaveOutlined, CheckOutlined, ArrowLeftOutlined } from '@ant-design/icons';
import type { ReceiptServicesDocument, ReceiptServicesItem } from '../types/documents';
import { api } from '../services/api';
import dayjs from 'dayjs';

const { Title } = Typography;
const { Option } = Select;

export function CreateReceiptServicesPage() {
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const [items, setItems] = useState<ReceiptServicesItem[]>([]);
  const [loading, setLoading] = useState(false);

  const handleSave = async (values: any) => {
    setLoading(true);
    try {
      const document: ReceiptServicesDocument = {
        ...values,
        date: values.date.format('YYYY-MM-DD'),
        type: 'ReceiptServices',
        items,
        portalStatus: 'Draft',
        totalAmount: items.reduce((sum, item) => sum + (item.totalAmount || 0), 0),
        totalVAT: items.reduce((sum, item) => sum + (item.vatAmount || 0), 0)
      };

      const response = await api.documents.create(document);
      message.success('Документ сохранён');
      navigate(`/documents/${response.data.id}`);
    } catch (error) {
      message.error('Ошибка при сохранении документа');
    } finally {
      setLoading(false);
    }
  };

  const handleFreeze = async () => {
    setLoading(true);
    try {
      const values = await form.validateFields();
      const document: ReceiptServicesDocument = {
        ...values,
        date: values.date.format('YYYY-MM-DD'),
        type: 'ReceiptServices',
        items,
        portalStatus: 'Frozen',
        totalAmount: items.reduce((sum, item) => sum + (item.totalAmount || 0), 0),
        totalVAT: items.reduce((sum, item) => sum + (item.vatAmount || 0), 0)
      };

      const response = await api.documents.create(document);
      const frozenResponse = await api.documents.freeze(response.data.id);
      message.success('Документ заморожен');
      navigate(`/documents/${response.data.id}`);
    } catch (error) {
      message.error('Ошибка при заморозке документа');
    } finally {
      setLoading(false);
    }
  };

  const addItem = () => {
    const newItem: ReceiptServicesItem = {
      serviceName: '',
      quantity: 1,
      unit: 'усл',
      price: 0,
      amount: 0,
      vatPercent: 20,
      vatAmount: 0,
      totalAmount: 0,
      accountId: undefined
    };
    setItems([...items, newItem]);
  };

  const updateItem = (index: number, field: keyof ReceiptServicesItem, value: any) => {
    const updated = [...items];
    updated[index] = { ...updated[index], [field]: value };
    
    // Пересчет суммы и НДС
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
      dataIndex: 'rowNumber',
      key: 'rowNumber',
      width: 50,
      align: 'center' as const,
      render: (_: any, record: ReceiptServicesItem, index: number) => index + 1
    },
    {
      title: 'Услуга',
      dataIndex: 'serviceName',
      key: 'serviceName',
      width: 300,
      render: (_: any, record: ReceiptServicesItem, index: number) => (
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
      render: (_: any, record: ReceiptServicesItem, index: number) => (
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
      render: (_: any, record: ReceiptServicesItem, index: number) => (
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
      render: (_: any, record: ReceiptServicesItem, index: number) => (
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
      render: (_: any, record: ReceiptServicesItem) => record.amount.toFixed(2)
    },
    {
      title: '% НДС',
      dataIndex: 'vatPercent',
      key: 'vatPercent',
      width: 100,
      render: (_: any, record: ReceiptServicesItem, index: number) => (
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
      render: (_: any, record: ReceiptServicesItem) => record.vatAmount.toFixed(2)
    },
    {
      title: 'Всего',
      dataIndex: 'totalAmount',
      key: 'totalAmount',
      width: 120,
      align: 'right' as const,
      render: (_: any, record: ReceiptServicesItem) => record.totalAmount.toFixed(2)
    },
    {
      title: 'Счет учета',
      dataIndex: 'accountId',
      key: 'accountId',
      width: 150,
      render: (_: any, record: ReceiptServicesItem, index: number) => {
        const organizationId = form.getFieldValue('organizationId');
        return (
          <AccountSelect
            value={record.accountId}
            onChange={(value) => updateItem(index, 'accountId', value)}
            organizationId={organizationId}
            placeholder="Выберите счет"
            style={{ width: '100%' }}
          />
        );
      }
    },
    {
      title: 'Действия',
      key: 'actions',
      width: 100,
      render: (_: any, record: ReceiptServicesItem, index: number) => (
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
            Поступление услуг: Акт, УПД (создание)
          </Title>
        </Space>

        <Form
          form={form}
          layout="vertical"
          onFinish={handleSave}
          initialValues={{
            date: dayjs(),
            vatPercent: 20,
            isUPD: false,
            invoiceRequired: false
          }}
        >
          <Card
            title="Основные реквизиты"
            extra={
              <Space>
                <Button
                  type="primary"
                  icon={<SaveOutlined />}
                  onClick={() => form.submit()}
                  loading={loading}
                >
                  Записать
                </Button>
                <Button
                  type="primary"
                  icon={<CheckOutlined />}
                  onClick={handleFreeze}
                  loading={loading}
                >
                  Заморозить
                </Button>
              </Space>
            }
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
              label="Контрагент"
              name="counterpartyName"
              rules={[{ required: true, message: 'Выберите контрагента' }]}
            >
              <Input placeholder="Введите ИНН или наименование" />
            </Form.Item>

            <Form.Item label="Договор" name="contractId">
              <Select placeholder="Выберите договор" allowClear>
                {/* TODO: загрузка из API */}
              </Select>
            </Form.Item>

            <Form.Item label="Счет на оплату" name="paymentAccountId">
              <Select placeholder="Выберите счет" allowClear>
                {/* TODO: загрузка из API */}
              </Select>
            </Form.Item>

            <Form.Item label="Организация" name="organizationId" rules={[{ required: true }]}>
              <Select placeholder="Выберите организацию">
                {/* TODO: загрузка из API */}
                <Option value="00000000-0000-0000-0000-000000000001">ЕЦОФ</Option>
                <Option value="00000000-0000-0000-0000-000000000002">Дочка 1</Option>
                <Option value="00000000-0000-0000-0000-000000000003">Дочка 2</Option>
              </Select>
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

            <Form.Item label="Расчеты:" name="paymentTerms">
              <Input.TextArea
                rows={2}
                placeholder="Срок, счета расчетов"
                readOnly
              />
            </Form.Item>

            <Form.Item name="originalReceived" valuePropName="checked">
              <Checkbox>Оригинал: получен</Checkbox>
            </Form.Item>
          </Card>

          <Card
            title="Услуги"
            extra={
              <Space>
                <Button onClick={addItem}>Добавить</Button>
                <Button>Подбор</Button>
                <Button>Изменить</Button>
              </Space>
            }
          >
            <Table
              columns={itemColumns}
              dataSource={items}
              rowKey={(record) => record.id || `item-${Math.random()}`}
              pagination={false}
              size="small"
              summary={() => (
                <Table.Summary fixed>
                  <Table.Summary.Row>
                    <Table.Summary.Cell index={0} colSpan={5}>
                      <Space>
                        <Checkbox>УПД</Checkbox>
                        <span>Счет-фактура:</span>
                        <Select style={{ width: 150 }}>
                          <Option value="notRequired">Не требуется</Option>
                          <Option value="required">Требуется</Option>
                        </Select>
                      </Space>
                    </Table.Summary.Cell>
                    <Table.Summary.Cell index={5} align="right">
                      <strong>Всего: {totalAmount.toFixed(2)}</strong>
                    </Table.Summary.Cell>
                    <Table.Summary.Cell index={6} />
                    <Table.Summary.Cell index={7} align="right">
                      <strong>НДС (в т.ч.): {totalVAT.toFixed(2)}</strong>
                    </Table.Summary.Cell>
                    <Table.Summary.Cell index={8} />
                  </Table.Summary.Row>
                </Table.Summary>
              )}
            />
          </Card>
        </Form>
      </Space>
    </div>
  );
}
