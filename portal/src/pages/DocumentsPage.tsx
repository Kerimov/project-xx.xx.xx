import { Table, Tag, Typography, Button, Space, Tabs, Popconfirm, Modal } from 'antd';
import type { TabsProps } from 'antd';
import { PlusOutlined, DeleteOutlined, InboxOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useEffect, useState, useMemo, useCallback } from 'react';
import { api } from '../services/api';
import { message } from 'antd';
import { documentGroups } from '../config/documentGroups';
import { PackageSelect } from '../components/forms';

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

export function DocumentsPage() {
  const navigate = useNavigate();
  const [documents, setDocuments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState<string>('all');
  const [packageFilter, setPackageFilter] = useState<string | undefined>();
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [addToPackageModal, setAddToPackageModal] = useState(false);
  const [addToPackageId, setAddToPackageId] = useState<string | null>(null);
  const [addingToPackage, setAddingToPackage] = useState(false);

  const loadDocuments = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.documents.list({
        packageId: packageFilter || undefined,
        limit: 1000
      });
      setDocuments(response.data || []);
    } catch (error) {
      console.error('Error loading documents:', error);
      message.error('Ошибка при загрузке документов');
    } finally {
      setLoading(false);
    }
  }, [packageFilter]);

  const columns = useMemo(() => [
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
          SentToUH: 'processing',
          AcceptedByUH: 'success',
          PostedInUH: 'success',
          UnpostedInUH: 'warning',
          RejectedByUH: 'warning',
          Cancelled: 'error'
        };
        const labelMap: Record<string, string> = {
          Draft: 'Черновик',
          Validated: 'Проверен',
          Frozen: 'Заморожен',
          QueuedToUH: 'В очереди в УХ',
          SentToUH: 'Отправлен в УХ',
          AcceptedByUH: 'Принят УХ',
          PostedInUH: 'Проведен в УХ',
          UnpostedInUH: 'Отменено проведение в УХ',
          RejectedByUH: 'Отклонен УХ',
          Cancelled: 'Отменен'
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
    },
    {
      title: 'Действия',
      key: 'actions',
      width: 150,
      render: (_: any, record: any) => {
        const canDelete = ['Draft', 'Validated', 'Cancelled', 'RejectedByUH', 'UnpostedInUH'].includes(record.portalStatus);
        return (
          <Space>
            <Button 
              type="link" 
              onClick={() => navigate(`/documents/${record.id}`)}
            >
              Открыть
            </Button>
            {canDelete && (
              <Popconfirm
                title="Удаление документа"
                description={`Удалить документ "${record.number}"?`}
                onConfirm={async (e) => {
                  e?.stopPropagation();
                  try {
                    setDeletingIds(prev => new Set(prev).add(record.id));
                    await api.documents.delete(record.id);
                    message.success('Документ удален');
                    loadDocuments();
                  } catch (error: any) {
                    message.error('Ошибка при удалении: ' + (error.message || 'Неизвестная ошибка'));
                  } finally {
                    setDeletingIds(prev => {
                      const next = new Set(prev);
                      next.delete(record.id);
                      return next;
                    });
                  }
                }}
                onCancel={(e) => e?.stopPropagation()}
                okText="Удалить"
                okType="danger"
                cancelText="Отмена"
              >
                <Button 
                  type="link" 
                  danger 
                  icon={<DeleteOutlined />}
                  loading={deletingIds.has(record.id)}
                  onClick={(e) => e.stopPropagation()}
                >
                  Удалить
                </Button>
              </Popconfirm>
            )}
          </Space>
        );
      }
    }
  ], [navigate, deletingIds, loadDocuments]);

  const rowSelection = {
    selectedRowKeys,
    onChange: (keys: React.Key[]) => setSelectedRowKeys(keys)
  };

  const handleAddToPackage = async () => {
    if (!addToPackageId || selectedRowKeys.length === 0) return;
    try {
      setAddingToPackage(true);
      await api.packages.addDocuments(addToPackageId, selectedRowKeys as string[]);
      message.success(`Добавлено в пакет: ${selectedRowKeys.length} документов`);
      setAddToPackageModal(false);
      setAddToPackageId(null);
      setSelectedRowKeys([]);
      loadDocuments();
    } catch (e: any) {
      message.error('Ошибка: ' + (e?.message || 'Неизвестная ошибка'));
    } finally {
      setAddingToPackage(false);
    }
  };

  useEffect(() => {
    loadDocuments();
  }, [loadDocuments]);

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
            rowSelection={rowSelection}
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
            rowSelection={rowSelection}
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
          rowSelection={rowSelection}
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
      <Space style={{ width: '100%', justifyContent: 'space-between', marginBottom: 16 }} wrap>
        <Space wrap>
          <Typography.Title level={3} style={{ margin: 0 }}>
            Документы
          </Typography.Title>
          <PackageSelect
            placeholder="Фильтр по пакету"
            style={{ width: 220 }}
            value={packageFilter || undefined}
            onChange={(v) => setPackageFilter(v || undefined)}
            allowClear
          />
        </Space>
        <Space>
          {selectedRowKeys.length > 0 && (
            <Button
              icon={<InboxOutlined />}
              onClick={() => setAddToPackageModal(true)}
            >
              Добавить в пакет ({selectedRowKeys.length})
            </Button>
          )}
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => navigate('/documents/new')}
          >
            Создать документ
          </Button>
        </Space>
      </Space>
      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        items={tabItems}
        type="card"
      />

      <Modal
        title="Добавить документы в пакет"
        open={addToPackageModal}
        onOk={handleAddToPackage}
        onCancel={() => {
          setAddToPackageModal(false);
          setAddToPackageId(null);
        }}
        okText="Добавить"
        okButtonProps={{ disabled: !addToPackageId }}
        confirmLoading={addingToPackage}
      >
        <p style={{ marginBottom: 12 }}>Выберите пакет для {selectedRowKeys.length} документов:</p>
        <PackageSelect
          placeholder="Выберите пакет"
          value={addToPackageId || undefined}
          onChange={(v) => setAddToPackageId(v || null)}
        />
      </Modal>
    </div>
  );
}

