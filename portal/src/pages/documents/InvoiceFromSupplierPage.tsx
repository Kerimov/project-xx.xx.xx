import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Form, Input, DatePicker, Select, InputNumber, Space, Typography, message, Table, Button, Spin } from 'antd';
import { ArrowLeftOutlined } from '@ant-design/icons';
import { BaseDocumentForm } from '../../components/forms/BaseDocumentForm';
import { OrganizationSelect } from '../../components/forms/OrganizationSelect';
import { CounterpartySelect } from '../../components/forms/CounterpartySelect';
import { ContractSelect } from '../../components/forms/ContractSelect';
import { AccountSelect } from '../../components/forms/AccountSelect';
import { api } from '../../services/api';
import { useAutoFillOrganization } from '../../hooks/useAutoFillOrganization';
import dayjs from 'dayjs';
import { parseDateSafe } from '../../utils/dateUtils';

const { Title } = Typography;
const { Option } = Select;

interface InvoiceFromSupplierPageProps {
  documentId?: string;
}

export function InvoiceFromSupplierPage({ documentId }: InvoiceFromSupplierPageProps = {}) {
  const navigate = useNavigate();
  const paramsId = useParams<{ id?: string }>().id;
  const id = documentId || paramsId;
  const isEditMode = !!id;
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(isEditMode);
  const [items, setItems] = useState<any[]>([]);
  const [selectedOrganizationId, setSelectedOrganizationId] = useState<string | undefined>();
  const [selectedCounterpartyId, setSelectedCounterpartyId] = useState<string | undefined>();
  const [counterpartyName, setCounterpartyName] = useState<string>('');

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
            number: doc.number || '',
            date: parseDateSafe(doc.date),
            dueDate: parseDateSafe(doc.dueDate),
            organizationId: doc.organizationId,
            counterpartyId: doc.counterpartyId,
            counterpartyName: doc.counterpartyName || '',
            counterpartyInn: doc.counterpartyInn || '',
            contractId: doc.contractId,
            paymentAccountId: doc.paymentAccountId,
            currency: doc.currency || 'RUB',
            totalAmount: doc.totalAmount || doc.amount || 0
          });

          setSelectedOrganizationId(doc.organizationId);
          setSelectedCounterpartyId(doc.counterpartyId);
          setCounterpartyName(doc.counterpartyName || '');
          
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

  // Автоматическое заполнение организации при создании нового документа
  useAutoFillOrganization(form, isEditMode, setSelectedOrganizationId);

  const handleSave = async () => {
    try {
      setLoading(true);
      const values = await form.validateFields();

      const document = {
        number: values.number,
        date: values.date ? (typeof values.date === 'string' ? values.date : values.date.format('YYYY-MM-DD')) : undefined,
        dueDate: values.dueDate ? (typeof values.dueDate === 'string' ? values.dueDate : values.dueDate.format('YYYY-MM-DD')) : undefined,
        type: 'InvoiceFromSupplier',
        organizationId: values.organizationId,
        counterpartyName: values.counterpartyName,
        counterpartyInn: values.counterpartyInn,
        contractId: values.contractId,
        paymentAccountId: values.paymentAccountId,
        currency: values.currency || 'RUB',
        totalAmount: values.totalAmount || items.reduce((sum, item) => sum + (item.amount || 0), 0),
        totalVAT: items.reduce((sum, item) => sum + ((item.amount || 0) * 0.2), 0),
        items: items.map((item, idx) => ({
          rowNumber: idx + 1,
          name: item.name,
          quantity: item.quantity || 0,
          price: item.price || 0,
          amount: item.amount || 0
        })),
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
      console.error('❌ Error saving document:', error);
      const msg = error instanceof Error ? error.message : 'Ошибка при сохранении документа';
      message.error(msg);
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
        dueDate: values.dueDate ? (typeof values.dueDate === 'string' ? values.dueDate : values.dueDate.format('YYYY-MM-DD')) : undefined,
        type: 'InvoiceFromSupplier',
        organizationId: values.organizationId,
        counterpartyName: values.counterpartyName,
        counterpartyInn: values.counterpartyInn,
        contractId: values.contractId,
        paymentAccountId: values.paymentAccountId,
        currency: values.currency || 'RUB',
        totalAmount: values.totalAmount || items.reduce((sum, item) => sum + (item.amount || 0), 0),
        totalVAT: items.reduce((sum, item) => sum + ((item.amount || 0) * 0.2), 0),
        items: items.map((item, idx) => ({
          rowNumber: idx + 1,
          name: item.name,
          quantity: item.quantity || 0,
          price: item.price || 0,
          amount: item.amount || 0
        })),
        portalStatus: 'Frozen'
      };

      const response = await api.documents.create(document);
      await api.documents.freeze(response.data.id);
      message.success('Документ заморожен');
      navigate(`/documents/${response.data.id}`);
    } catch (error) {
      console.error('❌ Error freezing document:', error);
      const msg = error instanceof Error ? error.message : 'Ошибка при заморозке документа';
      message.error(msg);
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
      render: (_: any, record: any, index: number) => (
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
      render: (_: any, record: any, index: number) => (
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
      render: (_: any, record: any, index: number) => (
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
      render: (_: any, record: any) => record.amount.toFixed(2)
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
      <Spin spinning={loading && isEditMode} tip="Загрузка документа...">
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          <Space>
          <Button icon={<ArrowLeftOutlined />} onClick={() => navigate(isEditMode ? `/documents/${id}` : '/documents')}>
            Назад
          </Button>
          <Title level={3} style={{ margin: 0 }}>
            Счет от поставщика {isEditMode ? '(редактирование)' : '(создание)'}
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
                  form.setFieldsValue({ contractId: undefined, paymentAccountId: undefined });
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
                    setCounterpartyName(counterparty.name);
                    form.setFieldsValue({ 
                      counterpartyName: counterparty.name,
                      counterpartyInn: counterparty.inn 
                    });
                  }
                }}
                onNameChange={(name) => {
                  setCounterpartyName(name);
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

            <Form.Item label="Счет на оплату" name="paymentAccountId">
              <AccountSelect
                organizationId={selectedOrganizationId}
              />
            </Form.Item>

            <Form.Item label="Срок оплаты:" name="dueDate">
              <DatePicker style={{ width: '100%' }} format="DD.MM.YYYY" />
            </Form.Item>

            <Form.Item label="Сумма счета:" name="totalAmount">
              <InputNumber
                style={{ width: '100%' }}
                precision={2}
                placeholder="0.00"
                formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ' ')}
              />
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
      </Spin>
    </div>
  );
}
