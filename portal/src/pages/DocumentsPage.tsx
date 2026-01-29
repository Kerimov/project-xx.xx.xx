import { Table, Tag, Typography, Button, Space, Tabs } from 'antd';
import type { TabsProps } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useEffect, useState, useMemo } from 'react';
import { api } from '../services/api';
import { message } from 'antd';
import { documentGroups } from '../config/documentGroups';

// Маппинг типов документов на названия
const getDocumentTypeLabel = (type: string): string => {
  for (const group of documentGroups) {
    for (const subgroup of group.subgroups || []) {
      const docType = subgroup.documents?.find(doc => doc.type === type);
      if (docType) {
        return docType.label;
      }
    }
  }
  return type; // Если не найдено, возвращаем сам тип
};

const columns = [
  { title: '№', dataIndex: 'number', key: 'number', width: 120 },
  { title: 'Дата', dataIndex: 'date', key: 'date', width: 120 },
  { 
    title: 'Вид документа', 
    dataIndex: 'type', 
    key: 'type', 
    width: 200,
    render: (type: string) => getDocumentTypeLabel(type)
  },
  { title: 'Контрагент', dataIndex: 'counterparty', key: 'counterparty' },
  { title: 'Сумма', dataIndex: 'amount', key: 'amount', align: 'right', width: 140 },
  {
    title: 'Статус портала',
    dataIndex: 'portalStatus',
    key: 'portalStatus',
    width: 160,
    render: (status: string) => {
      const colorMap: Record<string, string> = {
        Draft: 'default',
        Validated: 'processing',
        Frozen: 'geekblue',
        QueuedToUH: 'processing',
        SentToUH: 'processing'
      };
      const labelMap: Record<string, string> = {
        Draft: 'Черновик',
        Validated: 'Проверен',
        Frozen: 'Заморожен',
        QueuedToUH: 'В очереди в УХ',
        SentToUH: 'Отправлен в УХ'
      };

      const color = colorMap[status] || 'default';
      const label = labelMap[status] || status;

      return <Tag color={color}>{label}</Tag>;
    }
  },
  {
    title: 'Статус УХ',
    dataIndex: 'uhStatus',
    key: 'uhStatus',
    width: 140,
    render: (status: string) => {
      const colorMap: Record<string, string> = {
        None: 'default',
        Accepted: 'processing',
        Posted: 'success',
        Error: 'error'
      };
      const labelMap: Record<string, string> = {
        None: '—',
        Accepted: 'Принят',
        Posted: 'Проведён',
        Error: 'Ошибка'
      };

      const color = colorMap[status] || 'default';
      const label = labelMap[status] || status;

      return <Tag color={color}>{label}</Tag>;
    }
  }
];

export function DocumentsPage() {
  const navigate = useNavigate();
  const [documents, setDocuments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<string>('all');

  useEffect(() => {
    loadDocuments();
  }, []);

  const loadDocuments = async () => {
    try {
      setLoading(true);
      const response = await api.documents.list();
      setDocuments(response.data || []);
    } catch (error) {
      console.error('Error loading documents:', error);
      message.error('Ошибка при загрузке документов');
    } finally {
      setLoading(false);
    }
  };

  // Группировка документов по группам и подгруппам
  const documentsByGroupAndSubgroup = useMemo(() => {
    const grouped: Record<string, Record<string, any[]>> = {
      all: { all: documents },
      purchases: {},
      sales: {},
      'bank-cash': {},
      warehouse: {}
    };

    // Создаем структуру для каждой группы и подгруппы
    documentGroups.forEach(group => {
      group.subgroups?.forEach(subgroup => {
        const key = `${group.id}-${subgroup.id}`;
        grouped[group.id][subgroup.id] = [];
        grouped[group.id][key] = [];
        
        // Собираем типы документов для подгруппы
        const subgroupTypes = new Set<string>();
        subgroup.documents?.forEach(doc => {
          subgroupTypes.add(doc.type);
        });

        // Распределяем документы по подгруппам
        documents.forEach(doc => {
          if (subgroupTypes.has(doc.type)) {
            grouped[group.id][subgroup.id].push(doc);
            grouped[group.id][key].push(doc);
          }
        });
      });
    });

    // Также заполняем общие группы
    const purchasesTypes = new Set<string>();
    const salesTypes = new Set<string>();
    const bankCashTypes = new Set<string>();
    const warehouseTypes = new Set<string>();

    documentGroups.forEach(group => {
      group.subgroups?.forEach(subgroup => {
        subgroup.documents?.forEach(doc => {
          if (group.id === 'purchases') {
            purchasesTypes.add(doc.type);
          } else if (group.id === 'sales') {
            salesTypes.add(doc.type);
          } else if (group.id === 'bank-cash') {
            bankCashTypes.add(doc.type);
          } else if (group.id === 'warehouse') {
            warehouseTypes.add(doc.type);
          }
        });
      });
    });

    documents.forEach(doc => {
      if (purchasesTypes.has(doc.type)) {
        if (!grouped.purchases.all) grouped.purchases.all = [];
        grouped.purchases.all.push(doc);
      } else if (salesTypes.has(doc.type)) {
        if (!grouped.sales.all) grouped.sales.all = [];
        grouped.sales.all.push(doc);
      } else if (bankCashTypes.has(doc.type)) {
        if (!grouped['bank-cash'].all) grouped['bank-cash'].all = [];
        grouped['bank-cash'].all.push(doc);
      } else if (warehouseTypes.has(doc.type)) {
        if (!grouped.warehouse.all) grouped.warehouse.all = [];
        grouped.warehouse.all.push(doc);
      }
    });

    return grouped;
  }, [documents]);

  const [activeSubTab, setActiveSubTab] = useState<Record<string, string>>({
    purchases: 'all',
    sales: 'all',
    'bank-cash': 'all',
    warehouse: 'all'
  });

  // Получаем документы для активной вкладки и подвкладки
  const filteredDocuments = useMemo(() => {
    if (activeTab === 'all') {
      return documents;
    }
    
    const currentSubTab = activeSubTab[activeTab] || 'all';
    if (currentSubTab === 'all') {
      return documentsByGroupAndSubgroup[activeTab]?.all || [];
    }
    
    return documentsByGroupAndSubgroup[activeTab]?.[currentSubTab] || [];
  }, [documentsByGroupAndSubgroup, activeTab, activeSubTab, documents]);

  // Формируем подвкладки для группы
  const getSubTabsForGroup = (group: typeof documentGroups[0]): TabsProps['items'] => {
    const items: TabsProps['items'] = [
      {
        key: 'all',
        label: `Все (${documentsByGroupAndSubgroup[group.id]?.all?.length || 0})`,
        children: (
          <Table
            columns={columns}
            dataSource={(documentsByGroupAndSubgroup[group.id]?.all || []).map(doc => ({ ...doc, key: doc.id }))}
            size="middle"
            loading={loading}
            onRow={(record) => ({
              onClick: () => navigate(`/documents/${record.id}`)
            })}
          />
        )
      }
    ];

    group.subgroups?.forEach(subgroup => {
      const count = documentsByGroupAndSubgroup[group.id]?.[subgroup.id]?.length || 0;
      items.push({
        key: subgroup.id,
        label: `${subgroup.name} (${count})`,
        children: (
          <Table
            columns={columns}
            dataSource={(documentsByGroupAndSubgroup[group.id]?.[subgroup.id] || []).map(doc => ({ ...doc, key: doc.id }))}
            size="middle"
            loading={loading}
            onRow={(record) => ({
              onClick: () => navigate(`/documents/${record.id}`)
            })}
          />
        )
      });
    });

    return items;
  };

  // Формируем основные вкладки
  const tabItems: TabsProps['items'] = [
    {
      key: 'all',
      label: `Все документы (${documents.length})`,
      children: (
        <Table
          columns={columns}
          dataSource={documents.map(doc => ({ ...doc, key: doc.id }))}
          size="middle"
          loading={loading}
          onRow={(record) => ({
            onClick: () => navigate(`/documents/${record.id}`)
          })}
        />
      )
    }
  ];

  // Добавляем вкладки для каждой группы с подвкладками
  documentGroups.forEach(group => {
    const totalCount = documentsByGroupAndSubgroup[group.id]?.all?.length || 0;
    tabItems.push({
      key: group.id,
      label: `${group.name} (${totalCount})`,
      children: (
        <Tabs
          activeKey={activeSubTab[group.id] || 'all'}
          onChange={(key) => setActiveSubTab({ ...activeSubTab, [group.id]: key })}
          items={getSubTabsForGroup(group)}
          type="card"
        />
      )
    });
  });

  return (
    <div className="page">
      <Space style={{ width: '100%', justifyContent: 'space-between', marginBottom: 16 }}>
        <Typography.Title level={3} style={{ margin: 0 }}>
          Документы
        </Typography.Title>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => navigate('/documents/new')}
        >
          Создать документ
        </Button>
      </Space>
      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        items={tabItems}
        type="card"
      />
    </div>
  );
}

