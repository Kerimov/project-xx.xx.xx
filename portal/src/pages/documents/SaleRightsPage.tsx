import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Form, Input, DatePicker, Select, Button, Space, Typography, Checkbox, message } from 'antd';
import { ArrowLeftOutlined } from '@ant-design/icons';
import { BaseDocumentForm } from '../../components/forms/BaseDocumentForm';
import { api } from '../../services/api';
import dayjs from 'dayjs';

const { Title } = Typography;
const { Option } = Select;

export function SaleRightsPage() {
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      const document = {
        ...values,
        date: values.date.format('YYYY-MM-DD'),
        type: 'SaleRights',
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
        type: 'SaleRights',
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
            Реализация прав: Акт, УПД (создание)
          </Title>
        </Space>

        <Form
          form={form}
          layout="vertical"
          initialValues={{
            date: dayjs(),
            isUPD: false,
            invoiceRequired: 'notRequired',
            organizationId: '00000000-0000-0000-0000-000000000001'
          }}
        >
          <BaseDocumentForm
            title="Основные реквизиты"
            onSave={handleSave}
            onFreeze={handleFreeze}
            loading={loading}
          >
            <Form.Item
              label="Акт, УПД №"
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

            <Form.Item label="Номер:" name="documentNumber">
              <Input placeholder="Введите номер" />
            </Form.Item>

            <Form.Item
              label="Покупатель"
              name="counterpartyName"
              rules={[{ required: true, message: 'Выберите покупателя' }]}
            >
              <Input placeholder="Введите ИНН или наименование" />
            </Form.Item>

            <Form.Item label="Договор" name="contractId">
              <Select placeholder="Выберите договор" allowClear>
                {/* TODO: загрузка из API */}
              </Select>
            </Form.Item>

            <Form.Item label="Организация" name="organizationId" rules={[{ required: true }]}>
              <Select placeholder="Выберите организацию">
                <Option value="00000000-0000-0000-0000-000000000001">ЕЦОФ</Option>
                <Option value="00000000-0000-0000-0000-000000000002">Дочка 1</Option>
                <Option value="00000000-0000-0000-0000-000000000003">Дочка 2</Option>
              </Select>
            </Form.Item>

            <Form.Item label="Период действия прав:" name="rightsPeriod">
              <Input placeholder="Например: январь 2026" />
            </Form.Item>

            <Form.Item label="Дата начала:" name="rightsStartDate">
              <DatePicker style={{ width: '100%' }} format="DD.MM.YYYY" />
            </Form.Item>

            <Form.Item label="Дата окончания:" name="rightsEndDate">
              <DatePicker style={{ width: '100%' }} format="DD.MM.YYYY" />
            </Form.Item>

            <Form.Item label="Расчеты:" name="paymentTerms">
              <Input.TextArea
                rows={2}
                placeholder="Срок, счета расчетов"
                readOnly
              />
            </Form.Item>

            <Form.Item name="isUPD" valuePropName="checked">
              <Checkbox>УПД</Checkbox>
            </Form.Item>

            <Form.Item label="Счет-фактура" name="invoiceRequired">
              <Select>
                <Option value="notRequired">Не требуется</Option>
                <Option value="required">Требуется</Option>
              </Select>
            </Form.Item>
          </BaseDocumentForm>
        </Form>
      </Space>
    </div>
  );
}
