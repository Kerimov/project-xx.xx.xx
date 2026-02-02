import { useState } from 'react';
import { Tabs, Card, Row, Col, Button } from 'antd';
import type { TabsProps } from 'antd';
import {
  BankOutlined,
  TeamOutlined,
  FileTextOutlined,
  CreditCardOutlined,
  ShopOutlined,
  ApartmentOutlined,
  UnorderedListOutlined,
  InboxOutlined
} from '@ant-design/icons';
import { OrganizationsList } from './nsi/OrganizationsList';
import { CounterpartiesList } from './nsi/CounterpartiesList';
import { ContractsList } from './nsi/ContractsList';
import { AccountsList } from './nsi/AccountsList';
import { WarehousesList } from './nsi/WarehousesList';
import { NomenclatureList } from './nsi/NomenclatureList';
import { AccountingAccountsList } from './nsi/AccountingAccountsList';

function AnalyticsTabContent({ onSelectTab }: { onSelectTab: (key: string) => void }) {
  return (
    <div style={{ padding: '16px 0' }}>
      <p style={{ marginBottom: 24, color: '#666' }}>
        Аналитики для документов: договоры, склады, банковские счета. Выберите справочник для просмотра.
      </p>
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} lg={8}>
          <Card size="small" title={<><FileTextOutlined /> Договоры</>} extra={<Button type="link" onClick={() => onSelectTab('contracts')}>Открыть</Button>}>
            Договоры с контрагентами по организациям.
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={8}>
          <Card size="small" title={<><ShopOutlined /> Склады</>} extra={<Button type="link" onClick={() => onSelectTab('warehouses')}>Открыть</Button>}>
            Склады организаций.
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={8}>
          <Card size="small" title={<><CreditCardOutlined /> Банковские счета</>} extra={<Button type="link" onClick={() => onSelectTab('accounts')}>Открыть</Button>}>
            Банковские счета организаций.
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={8}>
          <Card size="small" title={<><InboxOutlined /> Номенклатура</>} extra={<Button type="link" onClick={() => onSelectTab('nomenclature')}>Открыть</Button>}>
            Номенклатура (товары и услуги) из 1С УХ.
          </Card>
        </Col>
      </Row>
    </div>
  );
}

export function NSIPage() {
  const [activeTab, setActiveTab] = useState('organizations');

  const tabItems: TabsProps['items'] = [
    {
      key: 'organizations',
      label: (
        <span>
          <BankOutlined />
          Организации
        </span>
      ),
      children: <OrganizationsList />,
    },
    {
      key: 'counterparties',
      label: (
        <span>
          <TeamOutlined />
          Контрагенты
        </span>
      ),
      children: <CounterpartiesList />,
    },
    {
      key: 'analytics',
      label: (
        <span>
          <ApartmentOutlined />
          Аналитики
        </span>
      ),
      children: <AnalyticsTabContent onSelectTab={setActiveTab} />,
    },
    {
      key: 'contracts',
      label: (
        <span>
          <FileTextOutlined />
          Договоры
        </span>
      ),
      children: <ContractsList />,
    },
    {
      key: 'accounts',
      label: (
        <span>
          <CreditCardOutlined />
          Счета
        </span>
      ),
      children: <AccountsList />,
    },
    {
      key: 'warehouses',
      label: (
        <span>
          <ShopOutlined />
          Склады
        </span>
      ),
      children: <WarehousesList />,
    },
    {
      key: 'nomenclature',
      label: (
        <span>
          <InboxOutlined />
          Номенклатура
        </span>
      ),
      children: <NomenclatureList />,
    },
    {
      key: 'accounting-accounts',
      label: (
        <span>
          <UnorderedListOutlined />
          План счетов
        </span>
      ),
      children: <AccountingAccountsList />,
    },
  ];

  return (
    <div style={{ padding: '24px' }}>
      <h1 style={{ marginBottom: '24px', fontSize: '24px', fontWeight: 600 }}>
        Справочники
      </h1>
      
      <Card>
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          type="card"
          size="large"
          items={tabItems}
        />
      </Card>
    </div>
  );
}
