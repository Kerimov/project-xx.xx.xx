import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Form, Input, DatePicker, Select, Button, Space, Typography, Table, InputNumber, message } from 'antd';
import { ArrowLeftOutlined } from '@ant-design/icons';
import { BaseDocumentForm } from '../../components/forms/BaseDocumentForm';
import { OrganizationSelect, WarehouseSelect, NomenclatureSelect } from '../../components/forms';
import { api } from '../../services/api';
import { useDocumentEdit } from './useDocumentEdit';
import { useAutoFillOrganization } from '../../hooks/useAutoFillOrganization';
import dayjs from 'dayjs';

const { Title } = Typography;
const { Option } = Select;

interface InventoryItem {
  id?: string;
  rowNumber?: number;
  nomenclatureId?: string;
  nomenclatureName: string;
  accountingQuantity: number;
  actualQuantity: number;
  discrepancyQuantity: number;
  unit: string;
  price: number;
  amount: number;
}

interface InventoryPageProps {
  documentId?: string;
}

export function InventoryPage({ documentId }: InventoryPageProps = {}) {
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [selectedOrganizationId, setSelectedOrganizationId] = useState<string | undefined>();
  const { id, isEditMode, loading, setLoading } = useDocumentEdit({
    documentId,
    form,
    navigate,
    setItems,
    setSelectedOrganizationId
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
        type: 'Inventory',
        items,
        portalStatus: 'Draft'
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
        type: 'Inventory',
        items,
        portalStatus: 'Frozen'
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
    const newItem: InventoryItem = {
      nomenclatureId: undefined,
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

  const updateItemNomenclature = (index: number, nomenclatureId: string, nomenclatureName: string) => {
    const updated = [...items];
    updated[index] = { ...updated[index], nomenclatureId, nomenclatureName };
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
      width: 280,
      render: (_: any, record: InventoryItem, index: number) => (
        <NomenclatureSelect
          value={record.nomenclatureId}
          onChange={(id, name) => updateItemNomenclature(index, id, name)}
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

            <Form.Item 
              label="Организация" 
              name="organizationId" 
              rules={[{ required: true, message: 'Выберите организацию' }]}
            >
              <OrganizationSelect 
                onChange={(value) => {
                  setSelectedOrganizationId(value);
                  form.setFieldsValue({ warehouseId: undefined });
                }}
              />
            </Form.Item>

            <Form.Item label="Склад" name="warehouseId" rules={[{ required: true, message: 'Выберите склад' }]}>
              <WarehouseSelect organizationId={selectedOrganizationId} />
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
