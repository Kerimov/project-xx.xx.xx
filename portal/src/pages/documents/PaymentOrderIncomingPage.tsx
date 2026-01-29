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

export function PaymentOrderIncomingPage() {
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      const document = {
        ...values,
        date: values.date.format('YYYY-MM-DD'),
        type: 'PaymentOrderIncoming',
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
        type: 'PaymentOrderIncoming',
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
            Платежное поручение входящее (создание)
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
              label="Платежное поручение №"
              name="number"
              rules={[{ required: true, message: 'Введите номер платежного поручения' }]}
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

            <Form.Item label="Сумма:" name="amount" rules={[{ required: true }]}>
              <InputNumber
                style={{ width: '100%' }}
                precision={2}
                placeholder="0.00"
                formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ' ')}
              />
            </Form.Item>

            <Form.Item label="Организация (получатель)" name="organizationId" rules={[{ required: true }]}>
              <Select placeholder="Выберите организацию">
                <Option value="00000000-0000-0000-0000-000000000001">ЕЦОФ</Option>
                <Option value="00000000-0000-0000-0000-000000000002">Дочка 1</Option>
                <Option value="00000000-0000-0000-0000-000000000003">Дочка 2</Option>
              </Select>
            </Form.Item>

            <Form.Item label="Расчетный счет получателя:" name="recipientAccount">
              <Input placeholder="Номер счета" />
            </Form.Item>

            <Form.Item label="Плательщик:" name="payerName" rules={[{ required: true }]}>
              <Input placeholder="Наименование плательщика" />
            </Form.Item>

            <Form.Item label="Расчетный счет плательщика:" name="payerAccount">
              <Input placeholder="Номер счета" />
            </Form.Item>

            <Form.Item label="ИНН плательщика:" name="payerInn">
              <Input placeholder="ИНН" />
            </Form.Item>

            <Form.Item label="Банк плательщика:" name="payerBank">
              <Input placeholder="Наименование банка" />
            </Form.Item>

            <Form.Item label="БИК банка плательщика:" name="payerBik">
              <Input placeholder="БИК" />
            </Form.Item>

            <Form.Item label="Назначение платежа:" name="purpose" rules={[{ required: true }]}>
              <TextArea rows={3} placeholder="Укажите назначение платежа" />
            </Form.Item>
          </BaseDocumentForm>
        </Form>
      </Space>
    </div>
  );
}
