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
import type { CollapseProps } from 'antd';

const { Title } = Typography;

const groupIcons: Record<string, React.ReactNode> = {
  purchases: <ShoppingOutlined />,
  sales: <DollarOutlined />,
  'bank-cash': <BankOutlined />,
  warehouse: <InboxOutlined />
};

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
          items={documentGroups.map((group: DocumentGroup) => ({
            key: group.id,
            label: (
              <Space>
                {groupIcons[group.id]}
                <Typography.Text strong>{group.name}</Typography.Text>
              </Space>
            ),
            children: (
              <>
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
              </>
            )
          }))}
        />
      </Space>
    </div>
  );
}
