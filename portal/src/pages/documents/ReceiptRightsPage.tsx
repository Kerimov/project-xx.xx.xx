import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Form, Input, DatePicker, Select, Checkbox, Space, Typography, message } from 'antd';
import { ArrowLeftOutlined } from '@ant-design/icons';
import { BaseDocumentForm } from '../../components/forms/BaseDocumentForm';
import { OrganizationSelect, CounterpartySelect, ContractSelect, AccountSelect } from '../../components/forms';
import { api } from '../../services/api';
import dayjs from 'dayjs';

const { Title } = Typography;
const { Option } = Select;

export function ReceiptRightsPage() {
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [selectedOrganizationId, setSelectedOrganizationId] = useState<string | undefined>();
  const [selectedCounterpartyId, setSelectedCounterpartyId] = useState<string | undefined>();

  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      const document = {
        ...values,
        date: values.date.format('YYYY-MM-DD'),
        type: 'ReceiptRights',
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
        type: 'ReceiptRights',
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
            Поступление прав: Акт, УПД (создание)
          </Title>
        </Space>

        <Form
          form={form}
          layout="vertical"
          initialValues={{
            date: dayjs(),
            isUPD: false,
            invoiceRequired: 'notRequired'
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

            <Form.Item label="Счет на оплату" name="paymentAccountId">
              <AccountSelect
                organizationId={selectedOrganizationId}
              />
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

            <Form.Item name="originalReceived" valuePropName="checked">
              <Checkbox>Оригинал: получен</Checkbox>
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
