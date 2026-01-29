import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Form, Input, DatePicker, Select, Button, Space, Typography, Table, InputNumber, message } from 'antd';
import { ArrowLeftOutlined } from '@ant-design/icons';
import { BaseDocumentForm } from '../../components/forms/BaseDocumentForm';
import { api } from '../../services/api';
import dayjs from 'dayjs';

const { Title } = Typography;
const { Option } = Select;

interface ReportItem {
  id?: string;
  rowNumber?: number;
  nomenclatureName: string;
  quantity: number;
  unit: string;
  price: number;
  amount: number;
  commissionPercent: number;
  commissionAmount: number;
  totalAmount: number;
}

export function ConsignorReportPage() {
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const [items, setItems] = useState<ReportItem[]>([]);
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      const document = {
        ...values,
        date: values.date.format('YYYY-MM-DD'),
        type: 'ConsignorReport',
        items,
        portalStatus: 'Draft',
        totalAmount: items.reduce((sum, item) => sum + item.totalAmount, 0),
        totalCommission: items.reduce((sum, item) => sum + item.commissionAmount, 0)
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
        type: 'ConsignorReport',
        items,
        portalStatus: 'Frozen',
        totalAmount: items.reduce((sum, item) => sum + item.totalAmount, 0),
        totalCommission: items.reduce((sum, item) => sum + item.commissionAmount, 0)
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
    const newItem: ReportItem = {
      nomenclatureName: '',
      quantity: 1,
      unit: 'шт',
      price: 0,
      amount: 0,
      commissionPercent: 0,
      commissionAmount: 0,
      totalAmount: 0
    };
    setItems([...items, newItem]);
  };

  const updateItem = (index: number, field: keyof ReportItem, value: any) => {
    const updated = [...items];
    updated[index] = { ...updated[index], [field]: value };
    
    const item = updated[index];
    item.amount = (item.quantity || 0) * (item.price || 0);
    item.commissionAmount = (item.amount * (item.commissionPercent || 0)) / 100;
    item.totalAmount = item.amount - item.commissionAmount;
    
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
      title: 'Номенклатура',
      dataIndex: 'nomenclatureName',
      key: 'nomenclatureName',
      width: 250,
      render: (_: any, record: ReportItem, index: number) => (
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
      render: (_: any, record: ReportItem, index: number) => (
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
      render: (_: any, record: ReportItem, index: number) => (
        <Input
          value={record.unit}
          onChange={(e) => updateItem(index, 'unit', e.target.value)}
          placeholder="шт"
        />
      )
    },
    {
      title: 'Цена реализации',
      dataIndex: 'price',
      key: 'price',
      width: 120,
      render: (_: any, record: ReportItem, index: number) => (
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
      title: 'Сумма реализации',
      dataIndex: 'amount',
      key: 'amount',
      width: 120,
      align: 'right' as const,
      render: (_: any, record: ReportItem) => record.amount.toFixed(2)
    },
    {
      title: '% комиссии',
      dataIndex: 'commissionPercent',
      key: 'commissionPercent',
      width: 120,
      render: (_: any, record: ReportItem, index: number) => (
        <InputNumber
          value={record.commissionPercent}
          onChange={(value) => updateItem(index, 'commissionPercent', value || 0)}
          min={0}
          max={100}
          precision={2}
          style={{ width: '100%' }}
        />
      )
    },
    {
      title: 'Сумма комиссии',
      dataIndex: 'commissionAmount',
      key: 'commissionAmount',
      width: 120,
      align: 'right' as const,
      render: (_: any, record: ReportItem) => record.commissionAmount.toFixed(2)
    },
    {
      title: 'К перечислению',
      dataIndex: 'totalAmount',
      key: 'totalAmount',
      width: 120,
      align: 'right' as const,
      render: (_: any, record: ReportItem) => record.totalAmount.toFixed(2)
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
  const totalCommission = items.reduce((sum, item) => sum + item.commissionAmount, 0);

  return (
    <div className="page">
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        <Space>
          <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/documents')}>
            Назад
          </Button>
          <Title level={3} style={{ margin: 0 }}>
            Отчеты комитентам (создание)
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
              label="Отчет комитента №"
              name="number"
              rules={[{ required: true, message: 'Введите номер отчета' }]}
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
              label="Комитент"
              name="consignorName"
              rules={[{ required: true, message: 'Выберите комитента' }]}
            >
              <Input placeholder="Введите ИНН или наименование комитента" />
            </Form.Item>

            <Form.Item label="Договор комиссии" name="contractId">
              <Select placeholder="Выберите договор" allowClear>
                {/* TODO: загрузка из API */}
              </Select>
            </Form.Item>

            <Form.Item label="Организация" name="organizationId" rules={[{ required: true }]}>
              <Select placeholder="Выберите организацию">
                <Option value="00000000-0000-0000-0000-000000000001">ЕЦОФ</Option>
                <Option value="00000000-0000-0000-0000-000000000002">Дочка 1</Option>
                <Option value="00000000-0000-0000-0000-000000000003">Дочка 2</Option>
              </Select>
            </Form.Item>

            <Form.Item label="Период отчета:" name="reportPeriod">
              <Input placeholder="Например: январь 2026" />
            </Form.Item>
          </BaseDocumentForm>

          <BaseDocumentForm
            title="Реализованные товары"
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
                      <Table.Summary.Cell index={0} colSpan={6}>
                        <strong>Итого:</strong>
                      </Table.Summary.Cell>
                      <Table.Summary.Cell index={6} />
                      <Table.Summary.Cell index={7} align="right">
                        <strong>Комиссия: {totalCommission.toFixed(2)}</strong>
                      </Table.Summary.Cell>
                      <Table.Summary.Cell index={8} align="right">
                        <strong>К перечислению: {totalAmount.toFixed(2)}</strong>
                      </Table.Summary.Cell>
                      <Table.Summary.Cell index={9} />
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
