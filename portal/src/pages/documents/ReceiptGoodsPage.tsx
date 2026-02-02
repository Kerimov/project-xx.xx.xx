import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Form, Input, DatePicker, Select, Button, Space, Typography, Table, InputNumber, Checkbox, message, Spin } from 'antd';
import { ArrowLeftOutlined } from '@ant-design/icons';
import { BaseDocumentForm } from '../../components/forms/BaseDocumentForm';
import { OrganizationSelect, CounterpartySelect, AccountingAccountSelect, AnalyticsSection, NomenclatureSelect, DepartmentSelect, PackageSelect } from '../../components/forms';
import { AccountSelect } from '../../components/forms/AccountSelect';
import { api } from '../../services/api';
import dayjs from 'dayjs';
import { parseDateSafe } from '../../utils/dateUtils';

const { Title } = Typography;
const { Option } = Select;

interface ReceiptGoodsItem {
  id?: string;
  rowKey?: string;
  nomenclatureId?: string;
  nomenclatureName: string;
  characteristic?: string;
  supplierNomenclature?: string;
  quantity: number;
  unit: string;
  price: number;
  amount: number;
  vatPercent: number;
  vatAmount: number;
  totalAmount: number;
  accountId?: string;
  vatAccountId?: string;
  budgetItem?: string;
}

interface ReceiptGoodsPageProps {
  documentId?: string;
}

export function ReceiptGoodsPage({ documentId }: ReceiptGoodsPageProps = {}) {
  const navigate = useNavigate();
  const paramsId = useParams<{ id?: string }>().id;
  const id = documentId || paramsId;
  const isEditMode = !!id;
  const [form] = Form.useForm();
  const [items, setItems] = useState<ReceiptGoodsItem[]>([]);
  const [selectedOrganizationId, setSelectedOrganizationId] = useState<string | undefined>();
  const [selectedCounterpartyId, setSelectedCounterpartyId] = useState<string | undefined>();
  const [loading, setLoading] = useState(isEditMode);

  useEffect(() => {
    if (isEditMode && id) {
      const loadDocument = async () => {
        try {
          setLoading(true);
          const response = await api.documents.getById(id);
          const doc = response.data;
          form.setFieldsValue({
            number: doc.number || '',
            waybillDate: parseDateSafe(doc.waybillDate) ?? parseDateSafe(doc.date),
            documentNumber: doc.documentNumber || '',
            date: parseDateSafe(doc.date),
            originalReceived: doc.originalReceived || false,
            invoiceReceived: doc.invoiceReceived || false,
            organizationId: doc.organizationId,
            packageId: doc.packageId,
            counterpartyId: doc.counterpartyId,
            counterpartyName: doc.counterpartyName || '',
            counterpartyInn: doc.counterpartyInn || '',
            contractId: doc.contractId,
            warehouseId: doc.warehouseId,
            paymentAccountId: doc.paymentAccountId ?? doc.accountId,
            departmentId: doc.departmentId ?? doc.department ?? '',
            paymentTerms: doc.paymentTerms || '',
            dueDate: doc.dueDate ? parseDateSafe(doc.dueDate) : undefined,
            vatOnTop: doc.vatOnTop ?? false,
            vatIncluded: doc.vatIncluded ?? false,
            hasDiscrepancies: doc.hasDiscrepancies ?? false,
            currency: doc.currency || 'RUB',
            isUPD: doc.isUPD ?? false,
            invoiceRequired: doc.invoiceRequired || 'notRequired',
            receiptOperationType: doc.receiptOperationType || 'Товары'
          });
          setSelectedOrganizationId(doc.organizationId);
          setSelectedCounterpartyId(doc.counterpartyId);
          if (doc.items && Array.isArray(doc.items)) {
            setItems(
              doc.items.map((it: ReceiptGoodsItem, i: number) => ({
                ...it,
                rowKey: it.rowKey ?? it.id ?? `loaded-${i}-${id}`
              }))
            );
          }
        } catch (error: unknown) {
          const msg = error instanceof Error ? error.message : 'Неизвестная ошибка';
          message.error('Ошибка загрузки документа: ' + msg);
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
        type: 'ReceiptGoods',
        number: values.number,
        date: values.date ? (typeof values.date === 'string' ? values.date : values.date.format('YYYY-MM-DD')) : undefined,
        waybillDate: values.waybillDate ? (typeof values.waybillDate === 'string' ? values.waybillDate : values.waybillDate.format('YYYY-MM-DD')) : undefined,
        documentNumber: values.documentNumber,
        originalReceived: values.originalReceived ?? false,
        invoiceReceived: values.invoiceReceived ?? false,
        organizationId: values.organizationId,
        packageId: values.packageId || null,
        counterpartyId: values.counterpartyId,
        counterpartyName: values.counterpartyName,
        counterpartyInn: values.counterpartyInn,
        contractId: values.contractId,
        warehouseId: values.warehouseId,
        paymentAccountId: values.paymentAccountId,
        departmentId: values.departmentId ?? values.department,
        paymentTerms: values.paymentTerms,
        dueDate: values.dueDate ? (typeof values.dueDate === 'string' ? values.dueDate : values.dueDate.format('YYYY-MM-DD')) : undefined,
        vatOnTop: values.vatOnTop ?? false,
        vatIncluded: values.vatIncluded ?? false,
        hasDiscrepancies: values.hasDiscrepancies ?? false,
        currency: values.currency || 'RUB',
        receiptOperationType: values.receiptOperationType || 'Товары',
        items: items.map((item, idx) => ({
          rowNumber: idx + 1,
          nomenclatureId: item.nomenclatureId,
          nomenclatureName: item.nomenclatureName || '',
          characteristic: item.characteristic,
          supplierNomenclature: item.supplierNomenclature,
          quantity: item.quantity || 0,
          unit: item.unit || 'шт',
          price: item.price || 0,
          amount: item.amount || 0,
          vatPercent: item.vatPercent ?? 20,
          vatAmount: item.vatAmount || 0,
          totalAmount: item.totalAmount || 0,
          accountId: item.accountId,
          vatAccountId: item.vatAccountId,
          budgetItem: item.budgetItem
        })),
        totalAmount: items.reduce((sum, item) => sum + (item.totalAmount || 0), 0),
        totalVAT: items.reduce((sum, item) => sum + (item.vatAmount || 0), 0),
        isUPD: values.isUPD ?? false,
        invoiceRequired: values.invoiceRequired || 'notRequired',
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
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Неизвестная ошибка';
      message.error('Ошибка при сохранении: ' + msg);
    } finally {
      setLoading(false);
    }
  };

  const handleFreeze = async () => {
    try {
      const values = await form.validateFields();
      const document = {
        type: 'ReceiptGoods',
        number: values.number,
        date: values.date ? (typeof values.date === 'string' ? values.date : values.date.format('YYYY-MM-DD')) : undefined,
        waybillDate: values.waybillDate ? (typeof values.waybillDate === 'string' ? values.waybillDate : values.waybillDate.format('YYYY-MM-DD')) : undefined,
        documentNumber: values.documentNumber,
        originalReceived: values.originalReceived ?? false,
        invoiceReceived: values.invoiceReceived ?? false,
        organizationId: values.organizationId,
        packageId: values.packageId || null,
        counterpartyId: values.counterpartyId,
        counterpartyName: values.counterpartyName,
        counterpartyInn: values.counterpartyInn,
        contractId: values.contractId,
        warehouseId: values.warehouseId,
        paymentAccountId: values.paymentAccountId,
        departmentId: values.departmentId ?? values.department,
        paymentTerms: values.paymentTerms,
        dueDate: values.dueDate ? (typeof values.dueDate === 'string' ? values.dueDate : values.dueDate.format('YYYY-MM-DD')) : undefined,
        vatOnTop: values.vatOnTop ?? false,
        vatIncluded: values.vatIncluded ?? false,
        hasDiscrepancies: values.hasDiscrepancies ?? false,
        currency: values.currency || 'RUB',
        receiptOperationType: values.receiptOperationType || 'Товары',
        items: items.map((item, idx) => ({
          rowNumber: idx + 1,
          nomenclatureId: item.nomenclatureId,
          nomenclatureName: item.nomenclatureName || '',
          characteristic: item.characteristic,
          supplierNomenclature: item.supplierNomenclature,
          quantity: item.quantity || 0,
          unit: item.unit || 'шт',
          price: item.price || 0,
          amount: item.amount || 0,
          vatPercent: item.vatPercent ?? 20,
          vatAmount: item.vatAmount || 0,
          totalAmount: item.totalAmount || 0,
          accountId: item.accountId,
          vatAccountId: item.vatAccountId,
          budgetItem: item.budgetItem
        })),
        totalAmount: items.reduce((sum, item) => sum + (item.totalAmount || 0), 0),
        totalVAT: items.reduce((sum, item) => sum + (item.vatAmount || 0), 0),
        isUPD: values.isUPD ?? false,
        invoiceRequired: values.invoiceRequired || 'notRequired',
        portalStatus: 'Frozen'
      };
      const res = isEditMode && id
        ? await api.documents.update(id, document)
        : await api.documents.create(document);
      const docId = isEditMode && id ? id : res.data.id;
      await api.documents.freeze(docId);
      message.success('Документ заморожен');
      navigate(`/documents/${docId}`);
    } catch (error: unknown) {
      message.error(error instanceof Error ? error.message : 'Ошибка при заморозке');
    }
  };

  const addItem = () => {
    setItems([
      ...items,
      {
        rowKey: `row-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`,
        nomenclatureId: undefined,
        nomenclatureName: '',
        quantity: 1,
        unit: 'шт',
        price: 0,
        amount: 0,
        vatPercent: 20,
        vatAmount: 0,
        totalAmount: 0
      }
    ]);
  };

  const updateItem = (index: number, field: keyof ReceiptGoodsItem, value: unknown) => {
    const updated = items.map((it, i) => (i === index ? { ...it, [field]: value } : it));
    const item = updated[index];
    item.amount = (item.quantity || 0) * (item.price || 0);
    item.vatAmount = ((item.amount || 0) * (item.vatPercent ?? 0)) / 100;
    item.totalAmount = (item.amount || 0) + (item.vatAmount || 0);
    setItems(updated);
  };

  const updateItemNomenclature = (index: number, nomenclatureId: string, nomenclatureName: string) => {
    const updated = items.map((it, i) =>
      i === index ? { ...it, nomenclatureId, nomenclatureName } : it
    );
    const item = updated[index];
    item.amount = (item.quantity || 0) * (item.price || 0);
    item.vatAmount = ((item.amount || 0) * (item.vatPercent ?? 0)) / 100;
    item.totalAmount = (item.amount || 0) + (item.vatAmount || 0);
    setItems(updated);
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const itemColumns = [
    { title: 'N', key: 'index', width: 50, render: (_: unknown, __: ReceiptGoodsItem, index: number) => index + 1 },
    {
      title: 'Номенклатура',
      dataIndex: 'nomenclatureName',
      key: 'nomenclatureName',
      width: 280,
      render: (_: unknown, record: ReceiptGoodsItem, index: number) => (
        <NomenclatureSelect
          value={record.nomenclatureId}
          onChange={(id, name) => updateItemNomenclature(index, id, name)}
        />
      )
    },
    {
      title: 'Характеристика',
      dataIndex: 'characteristic',
      key: 'characteristic',
      width: 120,
      render: (_: unknown, record: ReceiptGoodsItem, index: number) => (
        <Input
          value={record.characteristic}
          onChange={(e) => updateItem(index, 'characteristic', e.target.value)}
          placeholder="—"
        />
      )
    },
    {
      title: 'Номенкл. постав.',
      dataIndex: 'supplierNomenclature',
      key: 'supplierNomenclature',
      width: 120,
      render: (_: unknown, record: ReceiptGoodsItem, index: number) => (
        <Input
          value={record.supplierNomenclature}
          onChange={(e) => updateItem(index, 'supplierNomenclature', e.target.value)}
          placeholder="—"
        />
      )
    },
    {
      title: 'Количество',
      dataIndex: 'quantity',
      key: 'quantity',
      width: 100,
      render: (_: unknown, record: ReceiptGoodsItem, index: number) => (
        <InputNumber
          value={record.quantity}
          onChange={(v) => updateItem(index, 'quantity', v ?? 0)}
          min={0}
          precision={3}
          style={{ width: '100%' }}
        />
      )
    },
    {
      title: 'Цена',
      dataIndex: 'price',
      key: 'price',
      width: 100,
      render: (_: unknown, record: ReceiptGoodsItem, index: number) => (
        <InputNumber
          value={record.price}
          onChange={(v) => updateItem(index, 'price', v ?? 0)}
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
      width: 100,
      align: 'right' as const,
      render: (_: unknown, record: ReceiptGoodsItem) => (record.amount ?? 0).toFixed(2)
    },
    {
      title: '% НДС',
      dataIndex: 'vatPercent',
      key: 'vatPercent',
      width: 90,
      render: (_: unknown, record: ReceiptGoodsItem, index: number) => (
        <Select
          value={record.vatPercent}
          onChange={(v) => updateItem(index, 'vatPercent', v)}
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
      width: 90,
      align: 'right' as const,
      render: (_: unknown, record: ReceiptGoodsItem) => (record.vatAmount ?? 0).toFixed(2)
    },
    {
      title: 'Всего',
      dataIndex: 'totalAmount',
      key: 'totalAmount',
      width: 100,
      align: 'right' as const,
      render: (_: unknown, record: ReceiptGoodsItem) => (record.totalAmount ?? 0).toFixed(2)
    },
    {
      title: 'Счет учета',
      dataIndex: 'accountId',
      key: 'accountId',
      width: 140,
      render: (_: unknown, record: ReceiptGoodsItem, index: number) => (
        <AccountingAccountSelect
          value={record.accountId}
          onChange={(v) => updateItem(index, 'accountId', v)}
          placeholder="Выберите счет"
          style={{ width: '100%' }}
        />
      )
    },
    {
      title: 'Счет НДС',
      dataIndex: 'vatAccountId',
      key: 'vatAccountId',
      width: 140,
      render: (_: unknown, record: ReceiptGoodsItem, index: number) => (
        <AccountingAccountSelect
          value={record.vatAccountId}
          onChange={(v) => updateItem(index, 'vatAccountId', v)}
          placeholder="Выберите счет"
          style={{ width: '100%' }}
        />
      )
    },
    {
      title: 'Статьи бюджета',
      dataIndex: 'budgetItem',
      key: 'budgetItem',
      width: 120,
      render: (_: unknown, record: ReceiptGoodsItem, index: number) => (
        <Input
          value={record.budgetItem}
          onChange={(e) => updateItem(index, 'budgetItem', e.target.value)}
          placeholder="—"
        />
      )
    },
    {
      title: 'Действия',
      key: 'actions',
      width: 90,
      render: (_: unknown, __: ReceiptGoodsItem, index: number) => (
        <Button type="link" danger onClick={() => removeItem(index)}>
          Удалить
        </Button>
      )
    }
  ];

  const totalAmount = items.reduce((sum, item) => sum + (item.totalAmount ?? 0), 0);
  const totalVAT = items.reduce((sum, item) => sum + (item.vatAmount ?? 0), 0);

  return (
    <div className="page">
      <Spin spinning={loading && isEditMode} tip="Загрузка документа...">
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          <Space>
            <Button icon={<ArrowLeftOutlined />} onClick={() => navigate(isEditMode ? `/documents/${id}` : '/documents')}>
              Назад
            </Button>
            <Title level={3} style={{ margin: 0 }}>
              Поступление товаров: Накладная, УПД {isEditMode ? '(редактирование)' : '(создание)'}
            </Title>
          </Space>

          <Form
            form={form}
            layout="vertical"
            initialValues={{
              date: dayjs(),
              waybillDate: dayjs(),
              originalReceived: false,
              invoiceReceived: false,
              vatOnTop: false,
              vatIncluded: false,
              hasDiscrepancies: false,
              isUPD: false,
              invoiceRequired: 'notRequired',
              currency: 'RUB',
              receiptOperationType: 'Товары'
            }}
          >
            <BaseDocumentForm title="Основное" onSave={handleSave} onFreeze={handleFreeze} loading={loading}>
              <Form.Item label="Накладная, УПД №" name="number" rules={[{ required: true, message: 'Введите номер' }]}>
                <Input placeholder="Номер накладной/УПД" />
              </Form.Item>
              <Form.Item label="от:" name="waybillDate" rules={[{ required: true, message: 'Укажите дату накладной' }]}>
                <DatePicker style={{ width: '100%' }} format="DD.MM.YYYY" showTime />
              </Form.Item>
              <Form.Item label="Номер:" name="documentNumber">
                <Input placeholder="Внутренний номер документа" />
              </Form.Item>
              <Form.Item label="Вид операции" name="receiptOperationType" rules={[{ required: true, message: 'Выберите вид операции' }]}>
                <Select>
                  <Option value="Товары">Товары</Option>
                  <Option value="Услуги">Услуги</Option>
                  <Option value="ОсновныеСредства">Основные средства</Option>
                  <Option value="ПриобретениеЗемельныхУчастков">Приобретение земельных участков</Option>
                  <Option value="ПокупкаКомиссия">Покупка комиссия</Option>
                  <Option value="ВПереработку">В переработку</Option>
                  <Option value="Оборудование">Оборудование</Option>
                  <Option value="ОбъектыСтроительства">Объекты строительства</Option>
                  <Option value="УслугиАренды">Услуги аренды</Option>
                  <Option value="УслугиЛизинга">Услуги лизинга</Option>
                  <Option value="УслугиФакторинга">Услуги факторинга</Option>
                  <Option value="Топливо">Топливо</Option>
                  <Option value="Права">Права</Option>
                </Select>
              </Form.Item>
              <Form.Item label="от:" name="date" rules={[{ required: true, message: 'Укажите дату документа' }]}>
                <DatePicker style={{ width: '100%' }} format="DD.MM.YYYY" showTime />
              </Form.Item>
              <Form.Item name="originalReceived" valuePropName="checked">
                <Checkbox>Оригинал: получен</Checkbox>
              </Form.Item>
              <Form.Item name="invoiceReceived" valuePropName="checked">
                <Checkbox>СФ получен</Checkbox>
              </Form.Item>

              <Form.Item
                label="Контрагент"
                name="counterpartyId"
                rules={[{ required: true, message: 'Выберите контрагента (поставщика)' }]}
              >
                <CounterpartySelect
                  placeholder="Введите ИНН или наименование"
                  onChange={(value, counterparty) => {
                    setSelectedCounterpartyId(value);
                    if (counterparty) {
                      form.setFieldsValue({ counterpartyName: counterparty.name, counterpartyInn: counterparty.inn });
                    }
                  }}
                  onNameChange={(name) => form.setFieldsValue({ counterpartyName: name })}
                />
              </Form.Item>
              <Form.Item name="counterpartyName" hidden>
                <Input />
              </Form.Item>
              <Form.Item name="counterpartyInn" hidden>
                <Input />
              </Form.Item>

              <Form.Item label="Организация" name="organizationId" rules={[{ required: true, message: 'Выберите организацию' }]}>
                <OrganizationSelect
                  onChange={(value) => {
                    setSelectedOrganizationId(value);
                    form.setFieldsValue({ contractId: undefined, warehouseId: undefined, paymentAccountId: undefined });
                  }}
                />
              </Form.Item>

              <Form.Item label="Пакет" name="packageId">
                <PackageSelect organizationId={selectedOrganizationId} placeholder="Выберите пакет (опционально)" />
              </Form.Item>

              <AnalyticsSection
                showContract
                showWarehouse
                showAccount={false}
                organizationId={selectedOrganizationId}
                counterpartyId={selectedCounterpartyId}
                warehouseRequired
              />

              <Form.Item label="Счет на оплату" name="paymentAccountId">
                <AccountSelect organizationId={selectedOrganizationId} placeholder="Счет на оплату" />
              </Form.Item>

              <Form.Item label="Подразделение" name="departmentId">
                <DepartmentSelect organizationId={selectedOrganizationId} placeholder="Выберите подразделение" />
              </Form.Item>

              <Form.Item label="Расчеты:" name="paymentTerms">
                <Input.TextArea rows={2} placeholder="Срок, счета расчетов (60.01, 60.02, зачет аванса)" />
              </Form.Item>
              <Form.Item label="Срок оплаты" name="dueDate">
                <DatePicker style={{ width: '100%' }} format="DD.MM.YYYY" />
              </Form.Item>

              <Space wrap>
                <Button type="link" onClick={() => message.info('Грузоотправитель и грузополучатель')}>
                  Грузоотправитель и грузополучатель
                </Button>
                <Button type="link" onClick={() => message.info('НДС сверху / НДС включен в стоимость')}>
                  НДС сверху. НДС включен в стоимость
                </Button>
              </Space>

              <Form.Item name="vatOnTop" valuePropName="checked">
                <Checkbox>НДС сверху</Checkbox>
              </Form.Item>
              <Form.Item name="vatIncluded" valuePropName="checked">
                <Checkbox>НДС включен в стоимость</Checkbox>
              </Form.Item>
              <Form.Item name="hasDiscrepancies" valuePropName="checked">
                <Checkbox>Есть расхождения</Checkbox>
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

            <BaseDocumentForm title="Товары" onSave={handleSave} onFreeze={handleFreeze} loading={loading} showFreeze={false}>
              <Space direction="vertical" style={{ width: '100%' }}>
                <Space>
                  <Button onClick={addItem}>Добавить</Button>
                  <Button>Подбор</Button>
                  <Button>Изменить</Button>
                </Space>
                <Table
                  columns={itemColumns}
                  dataSource={items}
                  rowKey={(record) => record.id ?? record.rowKey ?? `item-${record.nomenclatureName}-${record.quantity}-${record.unit}-${record.price}`}
                  pagination={false}
                  size="small"
                  scroll={{ x: 1400 }}
                  summary={() => (
                    <Table.Summary fixed>
                      <Table.Summary.Row>
                        <Table.Summary.Cell index={0} colSpan={6}>
                          <Space>
                            <Checkbox checked={form.getFieldValue('isUPD')} disabled>УПД</Checkbox>
                            <span>Счет-фактура: {form.getFieldValue('invoiceRequired') === 'notRequired' ? 'Не требуется' : 'Требуется'}</span>
                          </Space>
                        </Table.Summary.Cell>
                        <Table.Summary.Cell index={6} align="right">
                          <strong>Всего: {totalAmount.toFixed(2)} RUB</strong>
                        </Table.Summary.Cell>
                        <Table.Summary.Cell index={7} />
                        <Table.Summary.Cell index={8} align="right">
                          <strong>НДС (в т.ч.): {totalVAT.toFixed(2)}</strong>
                        </Table.Summary.Cell>
                        <Table.Summary.Cell index={9} colSpan={4} />
                      </Table.Summary.Row>
                    </Table.Summary>
                  )}
                />
              </Space>
            </BaseDocumentForm>
          </Form>
        </Space>
      </Spin>
    </div>
  );
}
