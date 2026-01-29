import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Form, Input, DatePicker, Select, InputNumber, Space, Typography, message, Button } from 'antd';
import { ArrowLeftOutlined } from '@ant-design/icons';
import { BaseDocumentForm } from '../../components/forms/BaseDocumentForm';
import { api } from '../../services/api';
import dayjs from 'dayjs';

const { Title } = Typography;
const { Option } = Select;
const { TextArea } = Input;

export function PowerOfAttorneyPage() {
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      const document = {
        ...values,
        date: values.date.format('YYYY-MM-DD'),
        validUntil: values.validUntil?.format('YYYY-MM-DD'),
        type: 'PowerOfAttorney',
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
        validUntil: values.validUntil?.format('YYYY-MM-DD'),
        type: 'PowerOfAttorney',
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
            Доверенность (создание)
          </Title>
        </Space>

        <Form
          form={form}
          layout="vertical"
          initialValues={{
            date: dayjs(),
            type: 'oneTime'
          }}
        >
          <BaseDocumentForm
            title="Основные реквизиты"
            onSave={handleSave}
            onFreeze={handleFreeze}
            loading={loading}
          >
            <Form.Item
              label="Доверенность №"
              name="number"
              rules={[{ required: true, message: 'Введите номер доверенности' }]}
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

            <Form.Item label="Тип доверенности:" name="type">
              <Select>
                <Option value="oneTime">Разовая</Option>
                <Option value="recurring">С правом передоверия</Option>
              </Select>
            </Form.Item>

            <Form.Item
              label="Доверенность выдана:"
              name="issuedTo"
              rules={[{ required: true, message: 'Укажите кому выдана доверенность' }]}
            >
              <Input placeholder="ФИО или наименование организации" />
            </Form.Item>

            <Form.Item label="Должность:" name="position">
              <Input placeholder="Должность доверенного лица" />
            </Form.Item>

            <Form.Item label="Паспорт:" name="passport">
              <Input placeholder="Серия и номер паспорта" />
            </Form.Item>

            <Form.Item label="Выдано:" name="passportIssuedBy">
              <Input placeholder="Кем выдан паспорт" />
            </Form.Item>

            <Form.Item label="Дата выдачи паспорта:" name="passportIssueDate">
              <DatePicker style={{ width: '100%' }} format="DD.MM.YYYY" />
            </Form.Item>

            <Form.Item label="Контрагент:" name="counterpartyName">
              <Input placeholder="Введите ИНН или наименование" />
            </Form.Item>

            <Form.Item label="Организация" name="organizationId" rules={[{ required: true }]}>
              <Select placeholder="Выберите организацию">
                <Option value="org1">ШАР ООО</Option>
              </Select>
            </Form.Item>

            <Form.Item label="Действительна до:" name="validUntil">
              <DatePicker style={{ width: '100%' }} format="DD.MM.YYYY" />
            </Form.Item>

            <Form.Item label="На получение:" name="forReceipt">
              <TextArea rows={3} placeholder="Укажите товары/материалы для получения" />
            </Form.Item>

            <Form.Item label="Основание:" name="basis">
              <Input placeholder="Например: договор поставки №123 от 01.01.2026" />
            </Form.Item>
          </BaseDocumentForm>
        </Form>
      </Space>
    </div>
  );
}
