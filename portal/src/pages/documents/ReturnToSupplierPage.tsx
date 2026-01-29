import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Form, Input, DatePicker, Select, Button, Space, Typography, Table, InputNumber, message, Spin } from 'antd';
import { ArrowLeftOutlined } from '@ant-design/icons';
import { BaseDocumentForm } from '../../components/forms/BaseDocumentForm';
import { OrganizationSelect, CounterpartySelect, ContractSelect, WarehouseSelect } from '../../components/forms';
import { api } from '../../services/api';
import dayjs from 'dayjs';

const { Title } = Typography;
const { Option } = Select;

interface ReturnItem {
  id?: string;
  rowNumber?: number;
  nomenclatureName: string;
  quantity: number;
  unit: string;
  price: number;
  amount: number;
  vatPercent: number;
  vatAmount: number;
  totalAmount: number;
  reason: string;
}

interface ReturnToSupplierPageProps {
  documentId?: string;
}

export function ReturnToSupplierPage({ documentId }: ReturnToSupplierPageProps = {}) {
  const navigate = useNavigate();
  const paramsId = useParams<{ id?: string }>().id;
  const id = documentId || paramsId;
  const isEditMode = !!id;
  const [form] = Form.useForm();
  const [items, setItems] = useState<ReturnItem[]>([]);
  const [loading, setLoading] = useState(isEditMode);
  const [selectedOrganizationId, setSelectedOrganizationId] = useState<string | undefined>();
  const [selectedCounterpartyId, setSelectedCounterpartyId] = useState<string | undefined>();

  // Загружаем документ при редактировании
  useEffect(() => {
    if (isEditMode && id) {
      const loadDocument = async () => {
        try {
          setLoading(true);
          const response = await api.documents.getById(id);
          const doc = response.data;
          
          // Заполняем форму данными документа
          form.setFieldsValue({
            number: doc.number,
            date: doc.date ? dayjs(doc.date) : undefined,
            organizationId: doc.organizationId,
            counterpartyId: doc.counterpartyId,
            counterpartyName: doc.counterpartyName,
            counterpartyInn: doc.counterpartyInn,
            contractId: doc.contractId,
            warehouseId: doc.warehouseId,
            currency: doc.currency || 'RUB',
            returnBasis: doc.returnBasis
          });

          setSelectedOrganizationId(doc.organizationId);
          setSelectedCounterpartyId(doc.counterpartyId);
          
          // Загружаем позиции документа
          if (doc.items && Array.isArray(doc.items)) {
            setItems(doc.items);
          }
        } catch (error: any) {
          message.error('Ошибка загрузки документа: ' + (error.message || 'Неизвестная ошибка'));
          navigate('/documents');
        } finally {
          setLoading(false);
        }
      };
      loadDocument();
    }
  }, [id, isEditMode, form, navigate]);

  const handleSave = async () => {
    try {
      setLoading(true);
      const values = await form.validateFields();
      const document = {
        number: values.number,
        date: values.date ? (typeof values.date === 'string' ? values.date : values.date.format('YYYY-MM-DD')) : undefined,
        type: 'ReturnToSupplier',
        organizationId: values.organizationId,
        counterpartyName: values.counterpartyName,
        counterpartyInn: values.counterpartyInn,
        contractId: values.contractId,
        warehouseId: values.warehouseId,
        currency: values.currency || 'RUB',
        items: items.map((item, idx) => ({
          rowNumber: idx + 1,
          nomenclatureName: item.nomenclatureName || '',
          quantity: item.quantity || 0,
          unit: item.unit || 'шт',
          price: item.price || 0,
          amount: item.amount || 0,
          vatPercent: item.vatPercent || 20,
          vatAmount: item.vatAmount || 0,
          totalAmount: item.totalAmount || 0,
          reason: item.reason || ''
        })),
        totalAmount: items.reduce((sum, item) => sum + (item.totalAmount || 0), 0),
        totalVAT: items.reduce((sum, item) => sum + (item.vatAmount || 0), 0),
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
    } catch (error: any) {
      message.error('Ошибка при сохранении документа: ' + (error.message || 'Неизвестная ошибка'));
    } finally {
      setLoading(false);
    }
  };

  const handleFreeze = async () => {
    try {
      setLoading(true);
      const values = await form.validateFields();
      const document = {
        number: values.number,
        date: values.date ? (typeof values.date === 'string' ? values.date : values.date.format('YYYY-MM-DD')) : undefined,
        type: 'ReturnToSupplier',
        organizationId: values.organizationId,
        counterpartyName: values.counterpartyName,
        counterpartyInn: values.counterpartyInn,
        contractId: values.contractId,
        warehouseId: values.warehouseId,
        currency: values.currency || 'RUB',
        items: items.map((item, idx) => ({
          rowNumber: idx + 1,
          nomenclatureName: item.nomenclatureName || '',
          quantity: item.quantity || 0,
          unit: item.unit || 'шт',
          price: item.price || 0,
          amount: item.amount || 0,
          vatPercent: item.vatPercent || 20,
          vatAmount: item.vatAmount || 0,
          totalAmount: item.totalAmount || 0,
          reason: item.reason || ''
        })),
        totalAmount: items.reduce((sum, item) => sum + (item.totalAmount || 0), 0),
        totalVAT: items.reduce((sum, item) => sum + (item.vatAmount || 0), 0),
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
    } catch (error: any) {
      message.error('Ошибка при заморозке документа: ' + (error.message || 'Неизвестная ошибка'));
    } finally {
      setLoading(false);
    }
  };

  const addItem = () => {
    const newItem: ReturnItem = {
      nomenclatureName: '',
      quantity: 1,
      unit: 'шт',
      price: 0,
      amount: 0,
      vatPercent: 20,
      vatAmount: 0,
      totalAmount: 0,
      reason: ''
    };
    setItems([...items, newItem]);
  };

  const updateItem = (index: number, field: keyof ReturnItem, value: any) => {
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
      title: 'Номенклатура',
      dataIndex: 'nomenclatureName',
      key: 'nomenclatureName',
      width: 250,
      render: (_: any, record: ReturnItem, index: number) => (
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
      render: (_: any, record: ReturnItem, index: number) => (
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
      render: (_: any, record: ReturnItem, index: number) => (
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
      render: (_: any, record: ReturnItem, index: number) => (
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
      render: (_: any, record: ReturnItem) => record.amount.toFixed(2)
    },
    {
      title: '% НДС',
      dataIndex: 'vatPercent',
      key: 'vatPercent',
      width: 100,
      render: (_: any, record: ReturnItem, index: number) => (
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
      render: (_: any, record: ReturnItem) => record.vatAmount.toFixed(2)
    },
    {
      title: 'Всего',
      dataIndex: 'totalAmount',
      key: 'totalAmount',
      width: 120,
      align: 'right' as const,
      render: (_: any, record: ReturnItem) => record.totalAmount.toFixed(2)
    },
    {
      title: 'Причина возврата',
      dataIndex: 'reason',
      key: 'reason',
      width: 200,
      render: (_: any, record: ReturnItem, index: number) => (
        <Input
          value={record.reason}
          onChange={(e) => updateItem(index, 'reason', e.target.value)}
          placeholder="Причина возврата"
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

  if (loading && isEditMode) {
    return (
      <div className="page" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div className="page">
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        <Space>
          <Button icon={<ArrowLeftOutlined />} onClick={() => navigate(isEditMode ? `/documents/${id}` : '/documents')}>
            Назад
          </Button>
          <Title level={3} style={{ margin: 0 }}>
            Возвраты поставщикам {isEditMode ? '(редактирование)' : '(создание)'}
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
              label="Документ возврата №"
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

            <Form.Item label="Склад" name="warehouseId" rules={[{ required: true, message: 'Выберите склад' }]}>
              <WarehouseSelect
                organizationId={selectedOrganizationId}
              />
            </Form.Item>

            <Form.Item label="Основание возврата:" name="returnBasis">
              <Input placeholder="Ссылка на документ поступления" />
            </Form.Item>
          </BaseDocumentForm>

          <BaseDocumentForm
            title="Товары к возврату"
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
                      <Table.Summary.Cell index={6} align="right">
                        <strong>{totalAmount.toFixed(2)}</strong>
                      </Table.Summary.Cell>
                      <Table.Summary.Cell index={7} />
                      <Table.Summary.Cell index={8} align="right">
                        <strong>{totalVAT.toFixed(2)}</strong>
                      </Table.Summary.Cell>
                      <Table.Summary.Cell index={9} align="right">
                        <strong>{(totalAmount + totalVAT).toFixed(2)}</strong>
                      </Table.Summary.Cell>
                      <Table.Summary.Cell index={10} colSpan={2} />
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
