import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Form, Input, DatePicker, Select, Button, Space, Typography, Table, InputNumber, message } from 'antd';
import { ArrowLeftOutlined } from '@ant-design/icons';
import { BaseDocumentForm } from '../../components/forms/BaseDocumentForm';
import { api } from '../../services/api';
import dayjs from 'dayjs';

const { Title } = Typography;
const { Option } = Select;

interface StatementItem {
  id?: string;
  rowNumber?: number;
  date: string;
  documentNumber: string;
  counterparty: string;
  debit: number;
  credit: number;
  balance: number;
  purpose: string;
}

export function BankStatementPage() {
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const [items, setItems] = useState<StatementItem[]>([]);
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      const document = {
        ...values,
        date: values.date.format('YYYY-MM-DD'),
        type: 'BankStatement',
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
        type: 'BankStatement',
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
    const newItem: StatementItem = {
      date: dayjs().format('YYYY-MM-DD'),
      documentNumber: '',
      counterparty: '',
      debit: 0,
      credit: 0,
      balance: 0,
      purpose: ''
    };
    setItems([...items, newItem]);
  };

  const updateItem = (index: number, field: keyof StatementItem, value: any) => {
    const updated = [...items];
    updated[index] = { ...updated[index], [field]: value };
    
    // Пересчет баланса (упрощенный)
    const item = updated[index];
    item.balance = (item.debit || 0) - (item.credit || 0);
    
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
      title: 'Дата',
      dataIndex: 'date',
      key: 'date',
      width: 120,
      render: (_: any, record: StatementItem, index: number) => (
        <DatePicker
          value={record.date ? dayjs(record.date) : null}
          onChange={(date) => updateItem(index, 'date', date?.format('YYYY-MM-DD') || '')}
          style={{ width: '100%' }}
          format="DD.MM.YYYY"
        />
      )
    },
    {
      title: 'Документ',
      dataIndex: 'documentNumber',
      key: 'documentNumber',
      width: 150,
      render: (_: any, record: StatementItem, index: number) => (
        <Input
          value={record.documentNumber}
          onChange={(e) => updateItem(index, 'documentNumber', e.target.value)}
          placeholder="№ документа"
        />
      )
    },
    {
      title: 'Контрагент',
      dataIndex: 'counterparty',
      key: 'counterparty',
      width: 200,
      render: (_: any, record: StatementItem, index: number) => (
        <Input
          value={record.counterparty}
          onChange={(e) => updateItem(index, 'counterparty', e.target.value)}
          placeholder="Контрагент"
        />
      )
    },
    {
      title: 'Дебет',
      dataIndex: 'debit',
      key: 'debit',
      width: 120,
      align: 'right' as const,
      render: (_: any, record: StatementItem, index: number) => (
        <InputNumber
          value={record.debit}
          onChange={(value) => updateItem(index, 'debit', value || 0)}
          min={0}
          precision={2}
          style={{ width: '100%' }}
        />
      )
    },
    {
      title: 'Кредит',
      dataIndex: 'credit',
      key: 'credit',
      width: 120,
      align: 'right' as const,
      render: (_: any, record: StatementItem, index: number) => (
        <InputNumber
          value={record.credit}
          onChange={(value) => updateItem(index, 'credit', value || 0)}
          min={0}
          precision={2}
          style={{ width: '100%' }}
        />
      )
    },
    {
      title: 'Назначение платежа',
      dataIndex: 'purpose',
      key: 'purpose',
      render: (_: any, record: StatementItem, index: number) => (
        <Input
          value={record.purpose}
          onChange={(e) => updateItem(index, 'purpose', e.target.value)}
          placeholder="Назначение платежа"
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

  const totalDebit = items.reduce((sum, item) => sum + (item.debit || 0), 0);
  const totalCredit = items.reduce((sum, item) => sum + (item.credit || 0), 0);

  return (
    <div className="page">
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        <Space>
          <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/documents')}>
            Назад
          </Button>
          <Title level={3} style={{ margin: 0 }}>
            Выписка банка (создание)
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
              label="Выписка №"
              name="number"
              rules={[{ required: true, message: 'Введите номер выписки' }]}
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
              <OrganizationSelect />
            </Form.Item>

            <Form.Item label="Расчетный счет:" name="bankAccount">
              <Input placeholder="Номер расчетного счета" />
            </Form.Item>

            <Form.Item label="Банк:" name="bankName">
              <Input placeholder="Наименование банка" />
            </Form.Item>

            <Form.Item label="Остаток на начало:" name="openingBalance">
              <InputNumber
                style={{ width: '100%' }}
                precision={2}
                placeholder="0.00"
                formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ' ')}
              />
            </Form.Item>

            <Form.Item label="Остаток на конец:" name="closingBalance">
              <InputNumber
                style={{ width: '100%' }}
                precision={2}
                placeholder="0.00"
                formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ' ')}
              />
            </Form.Item>
          </BaseDocumentForm>

          <BaseDocumentForm
            title="Операции по счету"
            onSave={handleSave}
            onFreeze={handleFreeze}
            loading={loading}
            showFreeze={false}
          >
            <Space direction="vertical" style={{ width: '100%' }}>
              <Button onClick={addItem}>Добавить операцию</Button>
              <Table
                columns={itemColumns}
                dataSource={items}
                rowKey={(record) => record.id || `item-${Math.random()}`}
                pagination={false}
                size="small"
                summary={() => (
                  <Table.Summary fixed>
                    <Table.Summary.Row>
                      <Table.Summary.Cell index={0} colSpan={4}>
                        <strong>Итого:</strong>
                      </Table.Summary.Cell>
                      <Table.Summary.Cell index={4} align="right">
                        <strong>{totalDebit.toFixed(2)}</strong>
                      </Table.Summary.Cell>
                      <Table.Summary.Cell index={5} align="right">
                        <strong>{totalCredit.toFixed(2)}</strong>
                      </Table.Summary.Cell>
                      <Table.Summary.Cell index={6} colSpan={2} />
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
