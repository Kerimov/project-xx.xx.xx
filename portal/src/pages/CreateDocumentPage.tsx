import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { CreateReceiptServicesPage } from './CreateReceiptServicesPage';
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
import type { ReceiptGoodsDocument, ReceiptGoodsItem } from '../types/documents';
import { api } from '../services/api';
import dayjs from 'dayjs';
import 'dayjs/locale/ru';

const { Title } = Typography;
const { Option } = Select;

export function CreateDocumentPage() {
  const navigate = useNavigate();
  const { type } = useParams<{ type: string }>();

  // Роутинг по типу документа
  if (type === 'ReceiptServices') {
    return <CreateReceiptServicesPage />;
  }

  // По умолчанию показываем форму "Поступление товаров" (ReceiptGoods)
  const [form] = Form.useForm();
  const [items, setItems] = useState<ReceiptGoodsItem[]>([]);
  const [loading, setLoading] = useState(false);

  const handleSave = async (values: any) => {
    setLoading(true);
    try {
      const document: ReceiptGoodsDocument = {
        ...values,
        date: values.date.format('YYYY-MM-DD'),
        type: 'ReceiptGoods',
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
      const document: ReceiptGoodsDocument = {
        ...values,
        date: values.date.format('YYYY-MM-DD'),
        type: 'ReceiptGoods',
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
    const newItem: ReceiptGoodsItem = {
      rowNumber: items.length + 1,
      nomenclatureName: '',
      quantity: 1,
      unit: 'шт',
      price: 0,
      amount: 0,
      vatPercent: 20,
      vatAmount: 0,
      totalAmount: 0,
      accountId: undefined,
      countryOfOrigin: undefined
    };
    setItems([...items, newItem]);
  };

  const updateItem = (index: number, field: keyof ReceiptGoodsItem, value: any) => {
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
      render: (_: any, record: ReceiptGoodsItem, index: number) => index + 1
    },
    {
      title: 'Номенклатура',
      dataIndex: 'nomenclatureName',
      key: 'nomenclatureName',
      width: 250,
      render: (_: any, record: ReceiptGoodsItem, index: number) => (
        <Input
          value={record.nomenclatureName}
          onChange={(e) => updateItem(index, 'nomenclatureName', e.target.value)}
          placeholder="Введите наименование"
        />
      )
    },
    {
      title: 'Количество',
      dataIndex: 'quantity',
      key: 'quantity',
      width: 120,
      render: (_: any, record: ReceiptGoodsItem, index: number) => (
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
      render: (_: any, record: ReceiptGoodsItem, index: number) => (
        <Input
          value={record.unit}
          onChange={(e) => updateItem(index, 'unit', e.target.value)}
          placeholder="шт"
        />
      )
    },
    {
      title: 'Цена',
      dataIndex: 'price',
      key: 'price',
      width: 120,
      render: (_: any, record: ReceiptGoodsItem, index: number) => (
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
      render: (_: any, record: ReceiptGoodsItem) => record.amount.toFixed(2)
    },
    {
      title: '% НДС',
      dataIndex: 'vatPercent',
      key: 'vatPercent',
      width: 100,
      render: (_: any, record: ReceiptGoodsItem, index: number) => (
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
      render: (_: any, record: ReceiptGoodsItem) => record.vatAmount.toFixed(2)
    },
    {
      title: 'Всего',
      dataIndex: 'totalAmount',
      key: 'totalAmount',
      width: 120,
      align: 'right' as const,
      render: (_: any, record: ReceiptGoodsItem) => record.totalAmount.toFixed(2)
    },
    {
      title: 'Счет учета',
      dataIndex: 'accountId',
      key: 'accountId',
      width: 150,
      render: (_: any, record: ReceiptGoodsItem, index: number) => (
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
      title: 'Страна происхождения',
      dataIndex: 'countryOfOrigin',
      key: 'countryOfOrigin',
      width: 180,
      render: (_: any, record: ReceiptGoodsItem, index: number) => (
        <Input
          value={record.countryOfOrigin}
          onChange={(e) => updateItem(index, 'countryOfOrigin', e.target.value)}
          placeholder="РОССИЯ"
        />
      )
    },
    {
      title: 'Действия',
      key: 'actions',
      width: 100,
      render: (_: any, record: ReceiptGoodsItem, index: number) => (
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
            Поступление товаров: Накладная, УПД (создание)
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
              label="Накладная, УПД №"
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

            <Form.Item name="hasDiscrepancies" valuePropName="checked">
              <Checkbox>Есть расхождения</Checkbox>
            </Form.Item>

            <Form.Item label="Организация" name="organizationId" rules={[{ required: true }]}>
              <Select placeholder="Выберите организацию">
                {/* TODO: загрузка из API */}
                <Option value="org1">ШАР ООО</Option>
              </Select>
            </Form.Item>

            <Form.Item label="Организация" name="organizationId" rules={[{ required: true }]}>
              <Select placeholder="Выберите организацию">
                {/* TODO: загрузка из API */}
                <Option value="org1">ШАР ООО</Option>
              </Select>
            </Form.Item>


            <Form.Item label="Расчеты:" name="paymentTerms">
              <Input.TextArea
                rows={2}
                placeholder="Срок 23.01.2026, 60.01, 60.02, зачет аванса автоматически"
                readOnly
              />
            </Form.Item>

            <Space>
              <Button type="link" onClick={() => message.info('Открыть форму грузоотправителя и грузополучателя')}>
                Грузоотправитель и грузополучатель
              </Button>
              <Button type="link" onClick={() => message.info('Настройки НДС')}>
                НДС сверху. НДС включен в стоимость
              </Button>
            </Space>

            <Form.Item name="originalReceived" valuePropName="checked">
              <Checkbox>Оригинал: получен</Checkbox>
            </Form.Item>
          </Card>

          <Card
            title="Товары"
            extra={
              <Space>
                <Button onClick={addItem}>Добавить</Button>
                <Button>Подбор</Button>
                <Button>Изменить</Button>
                <Button>Добавить по штрихкоду</Button>
              </Space>
            }
          >
            <Table
              columns={itemColumns}
              dataSource={items}
              rowKey={(record, index) => record.id || `item-${index}`}
              pagination={false}
              size="small"
              summary={() => (
                <Table.Summary fixed>
                  <Table.Summary.Row>
                    <Table.Summary.Cell index={0} colSpan={6}>
                      <Space>
                        <Checkbox>УПД</Checkbox>
                        <span>Счет-фактура:</span>
                        <Select defaultValue="notRequired" style={{ width: 150 }}>
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
                    <Table.Summary.Cell index={9} colSpan={3} />
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
