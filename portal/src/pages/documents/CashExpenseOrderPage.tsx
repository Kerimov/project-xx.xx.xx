import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Form, Input, DatePicker, Select, Button, Space, Typography, InputNumber, message } from 'antd';
import { ArrowLeftOutlined } from '@ant-design/icons';
import { BaseDocumentForm } from '../../components/forms/BaseDocumentForm';
import { api } from '../../services/api';
import dayjs from 'dayjs';

const { Title } = Typography;
const { Option } = Select;
const { TextArea } = Input;

export function CashExpenseOrderPage() {
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      const document = {
        ...values,
        date: values.date.format('YYYY-MM-DD'),
        type: 'CashExpenseOrder',
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
        type: 'CashExpenseOrder',
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

  return (
    <div className="page">
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        <Space>
          <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/documents')}>
            Назад
          </Button>
          <Title level={3} style={{ margin: 0 }}>
            Расходный кассовый ордер (РКО) (создание)
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
              label="РКО №"
              name="number"
              rules={[{ required: true, message: 'Введите номер РКО' }]}
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

            <Form.Item label="Организация" name="organizationId" rules={[{ required: true }]}>
              <Select placeholder="Выберите организацию">
                <Option value="00000000-0000-0000-0000-000000000001">ЕЦОФ</Option>
                <Option value="00000000-0000-0000-0000-000000000002">Дочка 1</Option>
                <Option value="00000000-0000-0000-0000-000000000003">Дочка 2</Option>
              </Select>
            </Form.Item>

            <Form.Item label="Касса:" name="cashDesk">
              <Select placeholder="Выберите кассу">
                {/* TODO: загрузка из API */}
              </Select>
            </Form.Item>

            <Form.Item label="Основание:" name="basis" rules={[{ required: true }]}>
              <TextArea rows={2} placeholder="Укажите основание выдачи" />
            </Form.Item>

            <Form.Item label="Кому выдано:" name="issuedTo" rules={[{ required: true }]}>
              <Input placeholder="ФИО или наименование организации" />
            </Form.Item>

            <Form.Item label="Сумма:" name="amount" rules={[{ required: true }]}>
              <InputNumber
                style={{ width: '100%' }}
                precision={2}
                placeholder="0.00"
                formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ' ')}
              />
            </Form.Item>

            <Form.Item label="Статья ДДС:" name="cashFlowItem">
              <Select placeholder="Выберите статью ДДС">
                {/* TODO: загрузка из API */}
              </Select>
            </Form.Item>
          </BaseDocumentForm>
        </Form>
      </Space>
    </div>
  );
}
