import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Form, Input, DatePicker, Select, Button, Space, Typography, InputNumber, message } from 'antd';
import { ArrowLeftOutlined } from '@ant-design/icons';
import { BaseDocumentForm } from '../../components/forms/BaseDocumentForm';
import { OrganizationSelect } from '../../components/forms';
import { api } from '../../services/api';
import dayjs from 'dayjs';

const { Title } = Typography;
const { Option } = Select;
const { TextArea } = Input;

export function PaymentOrderOutgoingPage() {
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      const document = {
        ...values,
        date: values.date.format('YYYY-MM-DD'),
        type: 'PaymentOrderOutgoing',
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
        type: 'PaymentOrderOutgoing',
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
            Платежное поручение исходящее (создание)
          </Title>
        </Space>

        <Form
          form={form}
          layout="vertical"
          initialValues={{
            date: dayjs(),
            priority: '5',
            paymentType: '01'
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

            <Form.Item label="Вид платежа:" name="paymentType">
              <Select>
                <Option value="01">Электронно</Option>
                <Option value="02">Почтой</Option>
                <Option value="03">Телеграфом</Option>
              </Select>
            </Form.Item>

            <Form.Item label="Сумма:" name="amount" rules={[{ required: true }]}>
              <InputNumber
                style={{ width: '100%' }}
                precision={2}
                placeholder="0.00"
                formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ' ')}
              />
            </Form.Item>

            <Form.Item label="Очередность платежа:" name="priority">
              <Select>
                <Option value="1">1</Option>
                <Option value="2">2</Option>
                <Option value="3">3</Option>
                <Option value="4">4</Option>
                <Option value="5">5</Option>
              </Select>
            </Form.Item>

            <Form.Item 
              label="Организация (плательщик)" 
              name="organizationId" 
              rules={[{ required: true, message: 'Выберите организацию' }]}
            >
              <OrganizationSelect />
            </Form.Item>

            <Form.Item label="Расчетный счет плательщика:" name="payerAccount">
              <Input placeholder="Номер счета" />
            </Form.Item>

            <Form.Item label="ИНН плательщика:" name="payerInn">
              <Input placeholder="ИНН" />
            </Form.Item>

            <Form.Item label="Получатель:" name="recipientName" rules={[{ required: true }]}>
              <Input placeholder="Наименование получателя" />
            </Form.Item>

            <Form.Item label="Расчетный счет получателя:" name="recipientAccount" rules={[{ required: true }]}>
              <Input placeholder="Номер счета" />
            </Form.Item>

            <Form.Item label="ИНН получателя:" name="recipientInn">
              <Input placeholder="ИНН" />
            </Form.Item>

            <Form.Item label="Банк получателя:" name="recipientBank" rules={[{ required: true }]}>
              <Input placeholder="Наименование банка" />
            </Form.Item>

            <Form.Item label="БИК банка получателя:" name="recipientBik" rules={[{ required: true }]}>
              <Input placeholder="БИК" />
            </Form.Item>

            <Form.Item label="Корр. счет банка получателя:" name="recipientCorrAccount">
              <Input placeholder="Корреспондентский счет" />
            </Form.Item>

            <Form.Item label="Назначение платежа:" name="purpose" rules={[{ required: true }]}>
              <TextArea rows={3} placeholder="Укажите назначение платежа" />
            </Form.Item>

            <Form.Item label="Срок плательщика:" name="dueDate">
              <DatePicker style={{ width: '100%' }} format="DD.MM.YYYY" />
            </Form.Item>
          </BaseDocumentForm>
        </Form>
      </Space>
    </div>
  );
}
