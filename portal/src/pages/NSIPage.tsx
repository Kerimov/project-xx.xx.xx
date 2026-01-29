import { useState } from 'react';
import { Tabs, Card } from 'antd';
import type { TabsProps } from 'antd';
import {
  BankOutlined,
  TeamOutlined,
  FileTextOutlined,
  CreditCardOutlined,
  ShopOutlined
} from '@ant-design/icons';
import { OrganizationsList } from './nsi/OrganizationsList';
import { CounterpartiesList } from './nsi/CounterpartiesList';
import { ContractsList } from './nsi/ContractsList';
import { AccountsList } from './nsi/AccountsList';
import { WarehousesList } from './nsi/WarehousesList';

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
