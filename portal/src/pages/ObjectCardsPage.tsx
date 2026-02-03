import { useState, useEffect, useMemo } from 'react';
import { Table, Input, Button, Space, Tag, message, Card, Typography, Select, Tabs } from 'antd';
import { SearchOutlined, EyeOutlined, PlusOutlined, BuildOutlined } from '@ant-design/icons';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import type { TabsProps } from 'antd';

const { Option } = Select;

interface ObjectType {
  id: string;
  code: string;
  name: string;
  isActive: boolean;
}

interface ObjectCard {
  id: string;
  typeId: string;
  typeCode: string | null;
  typeName: string | null;
  code: string;
  name: string;
  organizationId: string | null;
  status: string;
  attrs: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export function ObjectCardsPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [objectTypes, setObjectTypes] = useState<ObjectType[]>([]);
  const [objectCards, setObjectCards] = useState<ObjectCard[]>([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [selectedTypeId, setSelectedTypeId] = useState<string | undefined>(
    searchParams.get('typeId') || undefined
  );
  const [statusFilter, setStatusFilter] = useState<string | undefined>(
    searchParams.get('status') || undefined
  );
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const isOrgAdmin = user?.role === 'org_admin' || user?.role === 'ecof_admin';
  const isEcofAdmin = user?.role === 'ecof_admin';

  // Загружаем карточки объектов
  const loadObjectCards = async () => {
    setLoading(true);
    try {
      const params: {
        typeId?: string;
        organizationId?: string | null;
        status?: string;
        search?: string;
        limit?: number;
        offset?: number;
      } = {
        limit: pageSize,
        offset: (currentPage - 1) * pageSize,
      };

      if (selectedTypeId) {
        params.typeId = selectedTypeId;
      }
      if (statusFilter) {
        params.status = statusFilter;
      }
      if (search) {
        params.search = search;
      }
      if (!isEcofAdmin && user?.organizationId) {
        params.organizationId = user.organizationId;
      }

      const response = await api.objects.cards.list(params);
      setObjectCards(response.data || []);
      setTotal(response.total || 0);
    } catch (error: any) {
      message.error('Ошибка загрузки карточек объектов: ' + (error.message || 'Неизвестная ошибка'));
    } finally {
      setLoading(false);
    }
  };

  // Загружаем типы объектов
  useEffect(() => {
    const loadTypes = async () => {
      try {
        const response = await api.objects.types.list({ activeOnly: true });
        setObjectTypes(response.data || []);
      } catch (error: any) {
        message.error('Ошибка загрузки типов объектов: ' + (error.message || 'Неизвестная ошибка'));
      }
    };
    loadTypes();
  }, []);

  // Загружаем карточки при изменении фильтров
  useEffect(() => {
    loadObjectCards();
  }, [selectedTypeId, statusFilter, currentPage, pageSize]);

  useEffect(() => {
    // Обновляем URL при изменении фильтров
    const params = new URLSearchParams();
    if (selectedTypeId) params.set('typeId', selectedTypeId);
    if (statusFilter) params.set('status', statusFilter);
    if (search) params.set('search', search);
    setSearchParams(params, { replace: true });
  }, [selectedTypeId, statusFilter, search]);

  const handleSearch = () => {
    setCurrentPage(1);
    loadObjectCards();
  };

  const handleTypeChange = (typeId: string | undefined) => {
    setSelectedTypeId(typeId);
    setCurrentPage(1);
  };

  const handleStatusChange = (status: string | undefined) => {
    setStatusFilter(status);
    setCurrentPage(1);
  };

  const selectedType = useMemo(() => {
    return objectTypes.find((t) => t.id === selectedTypeId);
  }, [objectTypes, selectedTypeId]);

  const columns = [
    {
      title: 'Код',
      dataIndex: 'code',
      key: 'code',
      width: 150,
      render: (code: string) => <Tag color="blue">{code}</Tag>,
    },
    {
      title: 'Наименование',
      dataIndex: 'name',
      key: 'name',
      ellipsis: true,
    },
    {
      title: 'Тип объекта',
      dataIndex: 'typeName',
      key: 'typeName',
      width: 180,
      render: (typeName: string | null, record: ObjectCard) => (
        <Tag>{typeName || record.typeCode || 'Неизвестно'}</Tag>
      ),
    },
    {
      title: 'Статус',
      dataIndex: 'status',
      key: 'status',
      width: 120,
      render: (status: string) => {
        const statusMap: Record<string, { color: string; label: string }> = {
          Active: { color: 'green', label: 'Активен' },
          Inactive: { color: 'default', label: 'Неактивен' },
          Archived: { color: 'gray', label: 'Архивирован' },
        };
        const statusInfo = statusMap[status] || { color: 'default', label: status };
        return <Tag color={statusInfo.color}>{statusInfo.label}</Tag>;
      },
    },
    {
      title: 'Дата создания',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 150,
      render: (date: string) => new Date(date).toLocaleDateString('ru-RU'),
    },
    {
      title: 'Действия',
      key: 'actions',
      width: 100,
      render: (_: any, record: ObjectCard) => (
        <Button
          type="link"
          icon={<EyeOutlined />}
          onClick={() => navigate(`/objects/cards/${record.id}`)}
        >
          Открыть
        </Button>
      ),
    },
  ];


  return (
    <div className="page">
      <Space direction="vertical" style={{ width: '100%' }} size="large">
        <Space style={{ width: '100%', justifyContent: 'space-between' }}>
          <Typography.Title level={2} style={{ margin: 0 }}>
            <BuildOutlined /> Карточки объектов учета
          </Typography.Title>
          {isOrgAdmin && (
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => {
                if (selectedTypeId) {
                  navigate(`/objects/cards/new?typeId=${selectedTypeId}`);
                } else {
                  navigate('/objects/cards/new');
                }
              }}
            >
              Создать карточку
            </Button>
          )}
        </Space>

        <Card>
          <Space direction="vertical" style={{ width: '100%' }} size="middle">
            <Space wrap>
              <Select
                placeholder="Выберите тип объекта"
                style={{ width: 250 }}
                allowClear
                value={selectedTypeId}
                onChange={handleTypeChange}
              >
                {objectTypes.map((type) => (
                  <Option key={type.id} value={type.id}>
                    {type.name} ({type.code})
                  </Option>
                ))}
              </Select>

              <Select
                placeholder="Статус"
                style={{ width: 150 }}
                allowClear
                value={statusFilter}
                onChange={handleStatusChange}
              >
                <Option value="Active">Активен</Option>
                <Option value="Inactive">Неактивен</Option>
                <Option value="Archived">Архивирован</Option>
              </Select>

              <Input
                placeholder="Поиск по коду или наименованию"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onPressEnter={handleSearch}
                style={{ width: 300 }}
                prefix={<SearchOutlined />}
              />
              <Button type="primary" onClick={handleSearch}>
                Найти
              </Button>
            </Space>

            {selectedTypeId && selectedType && (
              <Typography.Text type="secondary">
                Фильтр: {selectedType.name} ({selectedType.code})
              </Typography.Text>
            )}

            <Table
              columns={columns}
              dataSource={objectCards}
              loading={loading}
              rowKey="id"
              pagination={{
                current: currentPage,
                pageSize: pageSize,
                total: total,
                showSizeChanger: true,
                showTotal: (total) => `Всего: ${total}`,
                onChange: (page, size) => {
                  setCurrentPage(page);
                  setPageSize(size);
                },
              }}
            />
          </Space>
        </Card>
      </Space>
    </div>
  );
}
