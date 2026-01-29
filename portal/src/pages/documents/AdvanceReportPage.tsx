import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Form, Input, DatePicker, Select, InputNumber, Space, Typography, message, Table, Button } from 'antd';
import { ArrowLeftOutlined, PlusOutlined } from '@ant-design/icons';
import { BaseDocumentForm } from '../../components/forms/BaseDocumentForm';
import { api } from '../../services/api';
import dayjs from 'dayjs';

const { Title } = Typography;
const { Option } = Select;
const { TextArea } = Input;

export function AdvanceReportPage() {
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [expenses, setExpenses] = useState<any[]>([]);

  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      const document = {
        ...values,
        date: values.date.format('YYYY-MM-DD'),
        type: 'AdvanceReport',
        expenses,
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
        type: 'AdvanceReport',
        expenses,
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

  const addExpense = () => {
    setExpenses([...expenses, { description: '', amount: 0, documentNumber: '', documentDate: null }]);
  };

  const expenseColumns = [
    {
      title: 'N',
      key: 'index',
      width: 50,
      render: (_: any, __: any, index: number) => index + 1
    },
    {
      title: 'Наименование расхода',
      dataIndex: 'description',
      key: 'description',
      render: (_: any, record: any, index: number) => (
        <Input
          value={record.description}
          onChange={(e) => {
            const updated = [...expenses];
            updated[index].description = e.target.value;
            setExpenses(updated);
          }}
          placeholder="Введите наименование расхода"
        />
      )
    },
    {
      title: 'Документ',
      dataIndex: 'documentNumber',
      key: 'documentNumber',
      width: 150,
      render: (_: any, record: any, index: number) => (
        <Input
          value={record.documentNumber}
          onChange={(e) => {
            const updated = [...expenses];
            updated[index].documentNumber = e.target.value;
            setExpenses(updated);
          }}
          placeholder="№ документа"
        />
      )
    },
    {
      title: 'Дата',
      dataIndex: 'documentDate',
      key: 'documentDate',
      width: 120,
      render: (_: any, record: any, index: number) => (
        <DatePicker
          value={record.documentDate}
          onChange={(date) => {
            const updated = [...expenses];
            updated[index].documentDate = date;
            setExpenses(updated);
          }}
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
      render: (_: any, record: any, index: number) => (
        <InputNumber
          value={record.amount}
          onChange={(value) => {
            const updated = [...expenses];
            updated[index].amount = value || 0;
            setExpenses(updated);
          }}
          min={0}
          precision={2}
          style={{ width: '100%' }}
        />
      )
    },
    {
      title: 'Действия',
      key: 'actions',
      width: 100,
      render: (_: any, __: any, index: number) => (
        <Button type="link" danger onClick={() => setExpenses(expenses.filter((_, i) => i !== index))}>
          Удалить
        </Button>
      )
    }
  ];

  const totalAmount = expenses.reduce((sum, exp) => sum + (exp.amount || 0), 0);

  return (
    <div className="page">
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        <Space>
          <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/documents')}>
            Назад
          </Button>
          <Title level={3} style={{ margin: 0 }}>
            Авансовый отчет (создание)
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
              label="Авансовый отчет №"
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
              <DatePicker style={{ width: '100%' }} format="DD.MM.YYYY" />
            </Form.Item>

            <Form.Item
              label="Подотчетное лицо:"
              name="employeeName"
              rules={[{ required: true, message: 'Укажите подотчетное лицо' }]}
            >
              <Input placeholder="ФИО сотрудника" />
            </Form.Item>

            <Form.Item 
              label="Организация" 
              name="organizationId" 
              rules={[{ required: true, message: 'Выберите организацию' }]}
            >
              <OrganizationSelect />
            </Form.Item>

            <Form.Item label="Выдано:" name="issuedAmount">
              <InputNumber
                style={{ width: '100%' }}
                precision={2}
                placeholder="0.00"
                formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ' ')}
              />
            </Form.Item>

            <Form.Item label="Израсходовано:" name="spentAmount">
              <InputNumber
                style={{ width: '100%' }}
                precision={2}
                placeholder="0.00"
                formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ' ')}
              />
            </Form.Item>

            <Form.Item label="К возврату:" name="returnAmount">
              <InputNumber
                style={{ width: '100%' }}
                precision={2}
                placeholder="0.00"
                formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ' ')}
              />
            </Form.Item>

            <Form.Item label="К доплате:" name="additionalAmount">
              <InputNumber
                style={{ width: '100%' }}
                precision={2}
                placeholder="0.00"
                formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ' ')}
              />
            </Form.Item>

            <Form.Item label="Цель выдачи:" name="purpose">
              <TextArea rows={2} placeholder="Укажите цель выдачи аванса" />
            </Form.Item>
          </BaseDocumentForm>

          <BaseDocumentForm
            title="Расходы"
            onSave={handleSave}
            onFreeze={handleFreeze}
            loading={loading}
            showFreeze={false}
          >
            <Space direction="vertical" style={{ width: '100%' }}>
              <Button icon={<PlusOutlined />} onClick={addExpense}>
                Добавить расход
              </Button>
              <Table
                columns={expenseColumns}
                dataSource={expenses}
                rowKey={(record) => record.id || `expense-${Math.random()}`}
                pagination={false}
                size="small"
                summary={() => (
                  <Table.Summary fixed>
                    <Table.Summary.Row>
                      <Table.Summary.Cell index={0} colSpan={5}>
                        <strong>Итого:</strong>
                      </Table.Summary.Cell>
                      <Table.Summary.Cell index={5} align="right">
                        <strong>{totalAmount.toFixed(2)}</strong>
                      </Table.Summary.Cell>
                      <Table.Summary.Cell index={6} />
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
