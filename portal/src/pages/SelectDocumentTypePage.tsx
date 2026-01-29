import { useNavigate } from 'react-router-dom';
import { Card, Typography, Space, Button, Divider, Collapse, Tag } from 'antd';
import {
  ArrowLeftOutlined,
  ShoppingOutlined,
  DollarOutlined,
  BankOutlined,
  InboxOutlined
} from '@ant-design/icons';
import { documentGroups, DocumentGroup } from '../config/documentGroups';

const { Title } = Typography;
const { Panel } = Collapse;

const groupIcons: Record<string, React.ReactNode> = {
  purchases: <ShoppingOutlined />,
  sales: <DollarOutlined />,
  'bank-cash': <BankOutlined />,
  warehouse: <InboxOutlined />
};
  // Поступление ТМЦ
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
    type: 'ReceiptGoodsServicesCommission',
    label: 'Товары, услуги, комиссия',
    description: 'Комплексное поступление товаров, услуг и комиссионных',
    category: 'Покупки'
  },
  {
    type: 'ReceiptAdditionalExpenses',
    label: 'Поступление доп. расходов',
    description: 'Оформление дополнительных расходов, связанных с закупкой',
    category: 'Покупки'
  },
  {
    type: 'ReceiptTickets',
    label: 'Поступление билетов',
    description: 'Оформление поступления билетов (авиа, ж/д и т.д.)',
    category: 'Покупки'
  },
  // Возвраты и корректировки
  {
    type: 'ReturnToSupplier',
    label: 'Возвраты поставщикам',
    description: 'Оформление возврата товаров поставщику',
    category: 'Покупки'
  },
  {
    type: 'ReceiptAdjustment',
    label: 'Корректировка поступления',
    description: 'Корректировка ранее оформленного поступления',
    category: 'Покупки'
  },
  {
    type: 'DiscrepancyAct',
    label: 'Акты о расхождениях',
    description: 'Оформление актов при обнаружении расхождений при приемке',
    category: 'Покупки'
  },
  // Комиссия
  {
    type: 'TransferToConsignor',
    label: 'Передача товаров комитенту',
    description: 'Передача товаров на комиссию',
    category: 'Покупки'
  },
  {
    type: 'ConsignorReport',
    label: 'Отчеты комитентам',
    description: 'Отчеты комитентов о продаже товаров',
    category: 'Покупки'
  },
  // Счета и расчеты
  {
    type: 'InvoiceFromSupplier',
    label: 'Счета от поставщиков',
    description: 'Регистрация счета на оплату от поставщика',
    category: 'Покупки'
  },
  {
    type: 'ReceivedInvoice',
    label: 'Счета-фактуры полученные',
    description: 'Регистрация входящих счетов-фактур от поставщиков',
    category: 'Покупки'
  },
  {
    type: 'PowerOfAttorney',
    label: 'Доверенности',
    description: 'Оформление доверенности на получение товарно-материальных ценностей',
    category: 'Покупки'
  },
  {
    type: 'AdvanceReport',
    label: 'Авансовые отчеты',
    description: 'Оформление авансового отчета подотчетного лица',
    category: 'Покупки'
  }
];

export function SelectDocumentTypePage() {
  const navigate = useNavigate();

  const renderDocumentCard = (doc: any) => (
    <Card
      key={doc.type}
      hoverable
      onClick={() => navigate(`/documents/new/${doc.type}`)}
      style={{ cursor: 'pointer', marginBottom: 8 }}
      size="small"
    >
      <Space style={{ width: '100%', justifyContent: 'space-between' }}>
        <Space direction="vertical" size="small" style={{ flex: 1 }}>
          <Typography.Text strong style={{ fontSize: 14 }}>
            {doc.label}
          </Typography.Text>
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            {doc.description}
          </Typography.Text>
        </Space>
        {doc.implemented && <Tag color="green">Реализовано</Tag>}
      </Space>
    </Card>
  );

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

        <Collapse
          defaultActiveKey={['purchases']}
          expandIconPosition="end"
          style={{ background: '#fff' }}
        >
          {documentGroups.map((group: DocumentGroup) => (
            <Panel
              key={group.id}
              header={
                <Space>
                  {groupIcons[group.id]}
                  <Typography.Text strong>{group.name}</Typography.Text>
                </Space>
              }
            >
              {group.subgroups?.map((subgroup) => (
                <div key={subgroup.id} style={{ marginBottom: 24 }}>
                  <Typography.Title level={5} style={{ marginBottom: 12, color: '#666' }}>
                    {subgroup.name}
                  </Typography.Title>
                  <Space direction="vertical" size="small" style={{ width: '100%' }}>
                    {subgroup.documents.map(renderDocumentCard)}
                  </Space>
                </div>
              ))}
              {group.documents && (
                <Space direction="vertical" size="small" style={{ width: '100%' }}>
                  {group.documents.map(renderDocumentCard)}
                </Space>
              )}
            </Panel>
          ))}
        </Collapse>
      </Space>
    </div>
  );
}
