import { useNavigate } from 'react-router-dom';
import { Card, Typography, Space, Button, Divider } from 'antd';
import { ArrowLeftOutlined } from '@ant-design/icons';

const { Title } = Typography;

interface DocumentTypeOption {
  type: string;
  label: string;
  description: string;
  category: string;
}

const documentTypes: DocumentTypeOption[] = [
  {
    type: 'ReceiptGoods',
    label: 'Поступление товаров: Накладная, УПД',
    description: 'Оформление поступления товаров по накладной или универсальному передаточному документу',
    category: 'Покупки'
  },
  {
    type: 'ReceiptServices',
    label: 'Поступление услуг: Акт, УПД',
    description: 'Оформление поступления услуг по акту или универсальному передаточному документу',
    category: 'Покупки'
  },
  {
    type: 'ReceiptRights',
    label: 'Поступление прав: Акт, УПД',
    description: 'Оформление поступления прав по акту или универсальному передаточному документу',
    category: 'Покупки'
  },
  {
    type: 'InvoiceFromSupplier',
    label: 'Счет от поставщика',
    description: 'Регистрация счета на оплату от поставщика',
    category: 'Покупки'
  },
  {
    type: 'PowerOfAttorney',
    label: 'Доверенность',
    description: 'Оформление доверенности на получение товарно-материальных ценностей',
    category: 'Покупки'
  },
  {
    type: 'AdvanceReport',
    label: 'Авансовый отчет',
    description: 'Оформление авансового отчета подотчетного лица',
    category: 'Покупки'
  }
];

export function SelectDocumentTypePage() {
  const navigate = useNavigate();

  const groupedTypes = documentTypes.reduce((acc, docType) => {
    if (!acc[docType.category]) {
      acc[docType.category] = [];
    }
    acc[docType.category].push(docType);
    return acc;
  }, {} as Record<string, DocumentTypeOption[]>);

  return (
    <div className="page">
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        <Space>
          <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/documents')}>
            Назад
          </Button>
          <Title level={3} style={{ margin: 0 }}>
            Создание документа
          </Title>
        </Space>

        {Object.entries(groupedTypes).map(([category, types]) => (
          <div key={category}>
            <Typography.Title level={4} style={{ marginBottom: 16 }}>
              {category}
            </Typography.Title>
            <Space direction="vertical" size="middle" style={{ width: '100%' }}>
              {types.map((docType) => (
                <Card
                  key={docType.type}
                  hoverable
                  onClick={() => navigate(`/documents/new/${docType.type}`)}
                  style={{ cursor: 'pointer' }}
                >
                  <Space direction="vertical" size="small" style={{ width: '100%' }}>
                    <Typography.Text strong style={{ fontSize: 16 }}>
                      {docType.label}
                    </Typography.Text>
                    <Typography.Text type="secondary">{docType.description}</Typography.Text>
                  </Space>
                </Card>
              ))}
            </Space>
            <Divider />
          </div>
        ))}
      </Space>
    </div>
  );
}
