import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Form, Input, DatePicker, Select, Button, Space, Typography, Table, InputNumber, message } from 'antd';
import { ArrowLeftOutlined } from '@ant-design/icons';
import { BaseDocumentForm } from '../../components/forms/BaseDocumentForm';
import { api } from '../../services/api';
import dayjs from 'dayjs';

const { Title } = Typography;
const { Option } = Select;

interface InventoryItem {
  id?: string;
  rowNumber?: number;
  nomenclatureName: string;
  accountingQuantity: number;
  actualQuantity: number;
  discrepancyQuantity: number;
  unit: string;
  price: number;
  amount: number;
}

export function InventoryPage() {
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      const document = {
        ...values,
        date: values.date.format('YYYY-MM-DD'),
        type: 'Inventory',
        items,
        portalStatus: 'Draft'
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
        type: 'Inventory',
        items,
        portalStatus: 'Frozen'
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
    const newItem: InventoryItem = {
      nomenclatureName: '',
      accountingQuantity: 0,
      actualQuantity: 0,
      discrepancyQuantity: 0,
      unit: 'шт',
      price: 0,
      amount: 0
    };
    setItems([...items, newItem]);
  };

  const updateItem = (index: number, field: keyof InventoryItem, value: any) => {
    const updated = [...items];
    updated[index] = { ...updated[index], [field]: value };
    
    const item = updated[index];
    item.discrepancyQuantity = (item.actualQuantity || 0) - (item.accountingQuantity || 0);
    item.amount = Math.abs(item.discrepancyQuantity) * (item.price || 0);
    
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
      render: (_: any, record: InventoryItem, index: number) => (
        <Input
          value={record.nomenclatureName}
          onChange={(e) => updateItem(index, 'nomenclatureName', e.target.value)}
          placeholder="Введите наименование"
        />
      )
    },
    {
      title: 'По учету',
      dataIndex: 'accountingQuantity',
      key: 'accountingQuantity',
      width: 120,
      render: (_: any, record: InventoryItem, index: number) => (
        <InputNumber
          value={record.accountingQuantity}
          onChange={(value) => updateItem(index, 'accountingQuantity', value || 0)}
          min={0}
          precision={3}
          style={{ width: '100%' }}
        />
      )
    },
    {
      title: 'Фактически',
      dataIndex: 'actualQuantity',
      key: 'actualQuantity',
      width: 120,
      render: (_: any, record: InventoryItem, index: number) => (
        <InputNumber
          value={record.actualQuantity}
          onChange={(value) => updateItem(index, 'actualQuantity', value || 0)}
          min={0}
          precision={3}
          style={{ width: '100%' }}
        />
      )
    },
    {
      title: 'Отклонение',
      dataIndex: 'discrepancyQuantity',
      key: 'discrepancyQuantity',
      width: 120,
      align: 'right' as const,
      render: (_: any, record: InventoryItem) => record.discrepancyQuantity.toFixed(3)
    },
    {
      title: 'Ед.',
      dataIndex: 'unit',
      key: 'unit',
      width: 80,
      render: (_: any, record: InventoryItem, index: number) => (
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
      render: (_: any, record: InventoryItem, index: number) => (
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
      title: 'Сумма отклонения',
      dataIndex: 'amount',
      key: 'amount',
      width: 120,
      align: 'right' as const,
      render: (_: any, record: InventoryItem) => record.amount.toFixed(2)
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

  return (
    <div className="page">
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        <Space>
          <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/documents')}>
            Назад
          </Button>
          <Title level={3} style={{ margin: 0 }}>
            Инвентаризация (создание)
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
              label="Инвентаризация №"
              name="number"
              rules={[{ required: true, message: 'Введите номер инвентаризации' }]}
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

            <Form.Item label="Организация" name="organizationId" rules={[{ required: true }]}>
              <Select placeholder="Выберите организацию">
                <Option value="00000000-0000-0000-0000-000000000001">ЕЦОФ</Option>
                <Option value="00000000-0000-0000-0000-000000000002">Дочка 1</Option>
                <Option value="00000000-0000-0000-0000-000000000003">Дочка 2</Option>
              </Select>
            </Form.Item>

            <Form.Item label="Склад" name="warehouseId" rules={[{ required: true }]}>
              <Select placeholder="Выберите склад">
                {/* TODO: загрузка из API */}
              </Select>
            </Form.Item>

            <Form.Item label="Комиссия:" name="commission">
              <Input.TextArea rows={2} placeholder="Состав комиссии" />
            </Form.Item>
          </BaseDocumentForm>

          <BaseDocumentForm
            title="Результаты инвентаризации"
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
