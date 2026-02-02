import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Form, Input, DatePicker, Select, Button, Space, Typography, Table, InputNumber, message } from 'antd';
import { ArrowLeftOutlined } from '@ant-design/icons';
import { BaseDocumentForm } from '../../components/forms/BaseDocumentForm';
import { OrganizationSelect, CounterpartySelect, WarehouseSelect, NomenclatureSelect } from '../../components/forms';
import { api } from '../../services/api';
import { useDocumentEdit } from './useDocumentEdit';
import dayjs from 'dayjs';

const { Title } = Typography;
const { Option } = Select;
const { TextArea } = Input;

interface DiscrepancyItem {
  id?: string;
  rowNumber?: number;
  nomenclatureName: string;
  expectedQuantity: number;
  actualQuantity: number;
  discrepancyQuantity: number;
  unit: string;
  price: number;
  amount: number;
  discrepancyType: 'shortage' | 'surplus' | 'damage';
  reason: string;
}

interface DiscrepancyActPageProps {
  documentId?: string;
}

export function DiscrepancyActPage({ documentId }: DiscrepancyActPageProps = {}) {
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const [items, setItems] = useState<DiscrepancyItem[]>([]);
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
        type: 'DiscrepancyAct',
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
        type: 'DiscrepancyAct',
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
    const newItem: DiscrepancyItem = {
      nomenclatureId: undefined,
      nomenclatureName: '',
      expectedQuantity: 0,
      actualQuantity: 0,
      discrepancyQuantity: 0,
      unit: 'шт',
      price: 0,
      amount: 0,
      discrepancyType: 'shortage',
      reason: ''
    };
    setItems([...items, newItem]);
  };

  const updateItem = (index: number, field: keyof DiscrepancyItem, value: any) => {
    const updated = [...items];
    updated[index] = { ...updated[index], [field]: value };
    
    const item = updated[index];
    item.discrepancyQuantity = Math.abs((item.expectedQuantity || 0) - (item.actualQuantity || 0));
    item.amount = item.discrepancyQuantity * (item.price || 0);
    
    setItems(updated);
  };

  const updateItemNomenclature = (index: number, nomenclatureId: string, nomenclatureName: string) => {
    const updated = [...items];
    updated[index] = { ...updated[index], nomenclatureId, nomenclatureName };
    const item = updated[index];
    item.discrepancyQuantity = Math.abs((item.expectedQuantity || 0) - (item.actualQuantity || 0));
    item.amount = item.discrepancyQuantity * (item.price || 0);
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
      render: (_: any, record: DiscrepancyItem, index: number) => (
        <NomenclatureSelect
          value={record.nomenclatureId}
          onChange={(id, name) => updateItemNomenclature(index, id, name)}
        />
      )
    },
    {
      title: 'По документу',
      dataIndex: 'expectedQuantity',
      key: 'expectedQuantity',
      width: 120,
      render: (_: any, record: DiscrepancyItem, index: number) => (
        <InputNumber
          value={record.expectedQuantity}
          onChange={(value) => updateItem(index, 'expectedQuantity', value || 0)}
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
      render: (_: any, record: DiscrepancyItem, index: number) => (
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
      render: (_: any, record: DiscrepancyItem) => record.discrepancyQuantity.toFixed(3)
    },
    {
      title: 'Ед.',
      dataIndex: 'unit',
      key: 'unit',
      width: 80,
      render: (_: any, record: DiscrepancyItem, index: number) => (
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
      render: (_: any, record: DiscrepancyItem, index: number) => (
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
      render: (_: any, record: DiscrepancyItem) => record.amount.toFixed(2)
    },
    {
      title: 'Вид расхождения',
      dataIndex: 'discrepancyType',
      key: 'discrepancyType',
      width: 150,
      render: (_: any, record: DiscrepancyItem, index: number) => (
        <Select
          value={record.discrepancyType}
          onChange={(value) => updateItem(index, 'discrepancyType', value)}
          style={{ width: '100%' }}
        >
          <Option value="shortage">Недостача</Option>
          <Option value="surplus">Излишек</Option>
          <Option value="damage">Повреждение</Option>
        </Select>
      )
    },
    {
      title: 'Причина',
      dataIndex: 'reason',
      key: 'reason',
      width: 200,
      render: (_: any, record: DiscrepancyItem, index: number) => (
        <Input
          value={record.reason}
          onChange={(e) => updateItem(index, 'reason', e.target.value)}
          placeholder="Причина расхождения"
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

  const totalAmount = items.reduce((sum, item) => sum + item.amount, 0);

  return (
    <div className="page">
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        <Space>
          <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/documents')}>
            Назад
          </Button>
          <Title level={3} style={{ margin: 0 }}>
            Акты о расхождениях (создание)
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
              label="Акт о расхождениях №"
              name="number"
              rules={[{ required: true, message: 'Введите номер акта' }]}
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
              label="Документ поступления:"
              name="receiptDocumentId"
              rules={[{ required: true, message: 'Выберите документ поступления' }]}
            >
              <Input placeholder="Введите номер документа поступления" />
            </Form.Item>

            <Form.Item 
              label="Организация" 
              name="organizationId" 
              rules={[{ required: true, message: 'Выберите организацию' }]}
            >
              <OrganizationSelect 
                onChange={(value) => {
                  setSelectedOrganizationId(value);
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

            <Form.Item label="Склад" name="warehouseId" rules={[{ required: true, message: 'Выберите склад' }]}>
              <WarehouseSelect organizationId={selectedOrganizationId} />
            </Form.Item>

            <Form.Item label="Комиссия:" name="commission">
              <TextArea rows={2} placeholder="Состав комиссии" />
            </Form.Item>
          </BaseDocumentForm>

          <BaseDocumentForm
            title="Расхождения"
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
                        <strong>Итого по сумме расхождений:</strong>
                      </Table.Summary.Cell>
                      <Table.Summary.Cell index={8} align="right">
                        <strong>{totalAmount.toFixed(2)}</strong>
                      </Table.Summary.Cell>
                      <Table.Summary.Cell index={9} colSpan={3} />
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
