import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Form, Input, DatePicker, Select, Button, Space, Typography, Table, InputNumber, message, Spin } from 'antd';
import { ArrowLeftOutlined } from '@ant-design/icons';
import { BaseDocumentForm } from '../../components/forms/BaseDocumentForm';
import { OrganizationSelect, WarehouseSelect, AccountingAccountSelect } from '../../components/forms';
import { api } from '../../services/api';
import dayjs from 'dayjs';
import { parseDateSafe } from '../../utils/dateUtils';

const { Title } = Typography;
const { Option } = Select;
const { TextArea } = Input;

interface ReceiptItem {
  id?: string;
  /** Стабильный ключ строки (для новых позиций без id), чтобы не терять фокус при вводе */
  rowKey?: string;
  rowNumber?: number;
  nomenclatureName: string;
  quantity: number;
  unit: string;
  price: number;
  amount: number;
  accountId?: string;
}

interface GoodsReceiptPageProps {
  documentId?: string;
}

export function GoodsReceiptPage({ documentId }: GoodsReceiptPageProps = {}) {
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const [items, setItems] = useState<ReceiptItem[]>([]);
  const isEditMode = !!documentId;
  const [loading, setLoading] = useState(isEditMode);
  const [selectedOrganizationId, setSelectedOrganizationId] = useState<string | undefined>();
  const [files, setFiles] = useState<File[]>([]);
  const [uploadedFiles, setUploadedFiles] = useState<Set<string>>(new Set());

  // Загружаем документ при редактировании
  useEffect(() => {
    if (isEditMode && documentId) {
      const loadDocument = async () => {
        try {
          setLoading(true);
          const response = await api.documents.getById(documentId);
          const doc = response.data;
          
          // Заполняем форму данными документа
          form.setFieldsValue({
            number: doc.number || '',
            date: parseDateSafe(doc.date),
            organizationId: doc.organizationId,
            warehouseId: doc.warehouseId,
            receiptBasis: doc.receiptBasis || '',
            currency: doc.currency || 'RUB'
          });

          setSelectedOrganizationId(doc.organizationId);
          
          // Загружаем позиции документа (добавляем rowKey для строк без id, чтобы не терять фокус при вводе)
          if (doc.items && Array.isArray(doc.items)) {
            setItems(
              doc.items.map((it: ReceiptItem, i: number) => ({
                ...it,
                rowKey: it.rowKey ?? it.id ?? `loaded-${i}-${documentId}`
              }))
            );
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
  }, [documentId, isEditMode, form, navigate]);

  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      const document = {
        ...values,
        date: values.date.format('YYYY-MM-DD'),
        type: 'GoodsReceipt',
        items,
        portalStatus: 'Draft',
        totalAmount: items.reduce((sum, item) => sum + item.amount, 0)
      };

      let documentIdToUse = documentId;

      if (isEditMode && documentId) {
        await api.documents.update(documentId, document);
        documentIdToUse = documentId;
        message.success('Документ обновлён');
      } else {
        const response = await api.documents.create(document);
        documentIdToUse = response.data.id;
        message.success('Документ сохранён');
      }

      // Загружаем файлы после создания/обновления документа
      if (files.length > 0 && documentIdToUse) {
        try {
          const filesToUpload = files.filter(file => {
            const fileKey = `${file.name}-${file.size}`;
            return !uploadedFiles.has(fileKey);
          });

          if (filesToUpload.length > 0) {
            for (const file of filesToUpload) {
              await api.files.upload(documentIdToUse, file);
              const fileKey = `${file.name}-${file.size}`;
              setUploadedFiles(prev => new Set(prev).add(fileKey));
            }
            message.success(`Загружено файлов: ${filesToUpload.length}`);
          }
        } catch (error: any) {
          message.warning('Документ сохранён, но некоторые файлы не удалось загрузить: ' + (error.message || 'Неизвестная ошибка'));
        }
      }

      navigate(`/documents/${documentIdToUse}`);
    } catch (error: any) {
      message.error('Ошибка при сохранении документа: ' + (error.message || 'Неизвестная ошибка'));
    }
  };

  const handleFreeze = async () => {
    try {
      const values = await form.validateFields();
      const document = {
        ...values,
        date: values.date.format('YYYY-MM-DD'),
        type: 'GoodsReceipt',
        items,
        portalStatus: 'Frozen',
        totalAmount: items.reduce((sum, item) => sum + item.amount, 0)
      };

      let documentIdToUse = documentId;

      if (isEditMode && documentId) {
        await api.documents.update(documentId, document);
        await api.documents.freeze(documentId);
        documentIdToUse = documentId;
        message.success('Документ заморожен');
      } else {
        const response = await api.documents.create(document);
        documentIdToUse = response.data.id;
        await api.documents.freeze(documentIdToUse);
        message.success('Документ заморожен');
      }

      // Загружаем файлы после создания/обновления документа
      if (files.length > 0 && documentIdToUse) {
        try {
          const filesToUpload = files.filter(file => {
            const fileKey = `${file.name}-${file.size}`;
            return !uploadedFiles.has(fileKey);
          });

          if (filesToUpload.length > 0) {
            for (const file of filesToUpload) {
              await api.files.upload(documentIdToUse, file);
              const fileKey = `${file.name}-${file.size}`;
              setUploadedFiles(prev => new Set(prev).add(fileKey));
            }
            message.success(`Загружено файлов: ${filesToUpload.length}`);
          }
        } catch (error: any) {
          message.warning('Документ заморожен, но некоторые файлы не удалось загрузить: ' + (error.message || 'Неизвестная ошибка'));
        }
      }

      navigate(`/documents/${documentIdToUse}`);
    } catch (error: any) {
      message.error('Ошибка при заморозке документа: ' + (error.message || 'Неизвестная ошибка'));
    }
  };

  const addItem = () => {
    const newItem: ReceiptItem = {
      rowKey: `row-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`,
      nomenclatureName: '',
      quantity: 1,
      unit: 'шт',
      price: 0,
      amount: 0
    };
    setItems([...items, newItem]);
  };

  const updateItem = (index: number, field: keyof ReceiptItem, value: any) => {
    const updated = items.map((it, i) => (i === index ? { ...it, [field]: value } : it));
    const item = updated[index];
    item.amount = (item.quantity || 0) * (item.price || 0);
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
      title: 'Номенклатура',
      dataIndex: 'nomenclatureName',
      key: 'nomenclatureName',
      width: 250,
      render: (_: any, record: ReceiptItem, index: number) => (
        <Input
          value={record.nomenclatureName}
          onChange={(e) => updateItem(index, 'nomenclatureName', e.target.value)}
          placeholder="Введите наименование"
        />
      )
    },
    {
      title: 'Количество',
      dataIndex: 'quantity',
      key: 'quantity',
      width: 120,
      render: (_: any, record: ReceiptItem, index: number) => (
        <InputNumber
          value={record.quantity}
          onChange={(value) => updateItem(index, 'quantity', value || 0)}
          min={0}
          precision={3}
          style={{ width: '100%' }}
        />
      )
    },
    {
      title: 'Ед.',
      dataIndex: 'unit',
      key: 'unit',
      width: 80,
      render: (_: any, record: ReceiptItem, index: number) => (
        <Input
          value={record.unit}
          onChange={(e) => updateItem(index, 'unit', e.target.value)}
          placeholder="шт"
        />
      )
    },
    {
      title: 'Цена',
      dataIndex: 'price',
      key: 'price',
      width: 120,
      render: (_: any, record: ReceiptItem, index: number) => (
        <InputNumber
          value={record.price}
          onChange={(value) => updateItem(index, 'price', value || 0)}
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
      render: (_: any, record: ReceiptItem) => record.amount.toFixed(2)
    },
    {
      title: 'Счет учета',
      dataIndex: 'accountId',
      key: 'accountId',
      width: 150,
      render: (_: any, record: ReceiptItem, index: number) => (
        <AccountingAccountSelect
          value={record.accountId}
          onChange={(value) => updateItem(index, 'accountId', value)}
          placeholder="Выберите счет"
          style={{ width: '100%' }}
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

  const totalAmount = items.reduce((sum, item) => sum + item.amount, 0);

  return (
    <div className="page">
      <Spin spinning={loading && isEditMode} tip="Загрузка документа...">
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          <Space>
            <Button icon={<ArrowLeftOutlined />} onClick={() => navigate(isEditMode ? `/documents/${documentId}` : '/documents')}>
              Назад
            </Button>
            <Title level={3} style={{ margin: 0 }}>
              Оприходование товаров {isEditMode ? '(редактирование)' : '(создание)'}
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
            files={files}
            onFilesChange={setFiles}
            showFileUpload={true}
          >
            <Form.Item
              label="Документ оприходования №"
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

            <Form.Item 
              label="Организация" 
              name="organizationId" 
              rules={[{ required: true, message: 'Выберите организацию' }]}
            >
              <OrganizationSelect 
                onChange={(value) => {
                  setSelectedOrganizationId(value);
                  form.setFieldsValue({ warehouseId: undefined });
                }}
              />
            </Form.Item>

            <Form.Item label="Склад" name="warehouseId" rules={[{ required: true, message: 'Выберите склад' }]}>
              <WarehouseSelect />
            </Form.Item>

            <Form.Item label="Основание оприходования:" name="receiptBasis">
              <TextArea rows={2} placeholder="Укажите основание оприходования (например, излишки по инвентаризации)" />
            </Form.Item>
          </BaseDocumentForm>

          <BaseDocumentForm
            title="Товары к оприходованию"
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
                rowKey={(record) => record.id ?? record.rowKey ?? `item-${record.nomenclatureName}-${record.quantity}-${record.unit}-${record.price}`}
                pagination={false}
                size="small"
                summary={() => (
                  <Table.Summary fixed>
                    <Table.Summary.Row>
                      <Table.Summary.Cell index={0} colSpan={6}>
                        <strong>Итого:</strong>
                      </Table.Summary.Cell>
                      <Table.Summary.Cell index={6} align="right">
                        <strong>{totalAmount.toFixed(2)}</strong>
                      </Table.Summary.Cell>
                      <Table.Summary.Cell index={7} colSpan={2} />
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
