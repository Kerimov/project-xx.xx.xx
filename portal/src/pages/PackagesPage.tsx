import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Table,
  Tag,
  Typography,
  Button,
  Space,
  Select,
  Input,
  Modal,
  Form,
  message,
  Card,
  Row,
  Col,
  DatePicker
} from 'antd';
import { PlusOutlined, SearchOutlined, FilterOutlined, ClearOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { api } from '../services/api';
import { OrganizationSelect } from '../components/forms';

const STATUS_OPTIONS = [
  { value: 'New', label: 'Новый' },
  { value: 'InProcessing', label: 'В обработке' },
  { value: 'Done', label: 'Завершён' },
  { value: 'Failed', label: 'Ошибка' },
  { value: 'PartiallyFailed', label: 'Частично с ошибками' }
];

const TYPE_OPTIONS = [
  { value: 'Реализация', label: 'Реализация' },
  { value: 'Поступление', label: 'Поступление' },
  { value: 'Возврат', label: 'Возврат' },
  { value: 'Прочее', label: 'Прочее' }
];

const statusColorMap: Record<string, string> = {
  New: 'default',
  InProcessing: 'processing',
  Done: 'success',
  Failed: 'error',
  PartiallyFailed: 'warning'
};

const statusLabelMap: Record<string, string> = {
  New: 'Новый',
  InProcessing: 'В обработке',
  Done: 'Завершён',
  Failed: 'Ошибка',
  PartiallyFailed: 'Частично с ошибками'
};

interface FiltersState {
  search?: string;
  organizationId?: string;
  status?: string;
  period?: string;
  type?: string;
}

function filtersToParams(f: FiltersState): Record<string, string> {
  const p: Record<string, string> = {};
  if (f.search?.trim()) p.search = f.search.trim();
  if (f.organizationId) p.organizationId = f.organizationId;
  if (f.status) p.status = f.status;
  if (f.period) p.period = f.period;
  if (f.type) p.type = f.type;
  return p;
}

function paramsToFilters(params: URLSearchParams): FiltersState {
  return {
    search: params.get('search') || undefined,
    organizationId: params.get('organizationId') || undefined,
    status: params.get('status') || undefined,
    period: params.get('period') || undefined,
    type: params.get('type') || undefined
  };
}

function hasActiveFilters(f: FiltersState): boolean {
  return !!(f.search?.trim() || f.organizationId || f.status || f.period || f.type);
}

export function PackagesPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [packages, setPackages] = useState<any[]>([]);
  const [organizations, setOrganizations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form] = Form.useForm();
  const [filtersExpanded, setFiltersExpanded] = useState(true);
  const [filters, setFilters] = useState<FiltersState>(() => paramsToFilters(searchParams));
  const [searchInput, setSearchInput] = useState('');

  // Синхронизация фильтров с URL
  useEffect(() => {
    const f = paramsToFilters(searchParams);
    setFilters(f);
    setSearchInput(f.search ?? '');
  }, [searchParams]);

  const loadPackages = useCallback(async () => {
    try {
      setLoading(true);
      const params = filtersToParams(filters);
      const response = await api.packages.list(params);
      setPackages(response.data || []);
    } catch (error) {
      message.error('Ошибка при загрузке пакетов');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  const loadOrganizations = useCallback(async () => {
    try {
      const res = await api.nsi.organizations();
      setOrganizations(res.data || []);
    } catch {
      setOrganizations([]);
    }
  }, []);

  useEffect(() => {
    loadPackages();
  }, [loadPackages]);

  useEffect(() => {
    loadOrganizations();
  }, [loadOrganizations]);

  const applyFilters = useCallback(
    (newFilters: FiltersState) => {
      const params = filtersToParams(newFilters);
      const next = new URLSearchParams();
      Object.entries(params).forEach(([k, v]) => next.set(k, v));
      setSearchParams(next, { replace: true });
    },
    [setSearchParams]
  );

  const clearFilters = useCallback(() => {
    setFilters({});
    setSearchInput('');
    setSearchParams({}, { replace: true });
  }, [setSearchParams]);

  const handleFilterChange = (key: keyof FiltersState, value: string | undefined) => {
    const next = { ...filters, [key]: value || undefined };
    setFilters(next);
    applyFilters(next);
  };

  const handleCreate = async () => {
    try {
      const values = await form.validateFields();
      setSaving(true);
      await api.packages.create({
        name: values.name,
        organizationId: values.organizationId || null,
        period: values.period,
        type: values.type || null
      });
      message.success('Пакет создан');
      setModalOpen(false);
      form.resetFields();
      loadPackages();
    } catch (error: any) {
      if (error?.errorFields) return;
      message.error('Ошибка при создании пакета: ' + (error?.message || 'Неизвестная ошибка'));
    } finally {
      setSaving(false);
    }
  };

  const columns = [
    {
      title: 'Пакет',
      dataIndex: 'name',
      key: 'name',
      render: (name: string, row: any) => (
        <Button
          type="link"
          onClick={(e) => {
            e.stopPropagation();
            navigate(`/packages/${row.id}`);
          }}
          style={{ padding: 0 }}
        >
          {name}
        </Button>
      )
    },
    { title: 'Дочка', dataIndex: 'company', key: 'company' },
    { title: 'Период', dataIndex: 'period', key: 'period', width: 100 },
    { title: 'Тип', dataIndex: 'type', key: 'type', width: 120 },
    { title: 'Документов', dataIndex: 'documentCount', key: 'documentCount', width: 110, align: 'right' as const },
    {
      title: 'Статус',
      dataIndex: 'status',
      key: 'status',
      width: 180,
      render: (status: string) => (
        <Tag color={statusColorMap[status] || 'default'}>
          {statusLabelMap[status] || status}
        </Tag>
      )
    }
  ];

  return (
    <div className="page">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Typography.Title level={3} style={{ margin: 0 }}>
          Пакеты
        </Typography.Title>
        <Button onClick={() => setModalOpen(true)} type="primary" icon={<PlusOutlined />}>
          Создать пакет
        </Button>
      </div>

      <Card size="small" style={{ marginBottom: 16 }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            marginBottom: filtersExpanded ? 12 : 0,
            cursor: 'pointer'
          }}
          onClick={() => setFiltersExpanded((e) => !e)}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === 'Enter' && setFiltersExpanded((v) => !v)}
        >
          <FilterOutlined />
          <Typography.Text strong>Фильтры и поиск</Typography.Text>
          {hasActiveFilters(filters) && (
            <Tag color="blue">
              {[
                filters.search && 'поиск',
                filters.organizationId && 'организация',
                filters.status && 'статус',
                filters.period && 'период',
                filters.type && 'тип'
              ]
                .filter(Boolean)
                .join(', ')}
            </Tag>
          )}
        </div>

        {filtersExpanded && (
          <Row gutter={[12, 12]}>
            <Col xs={24} sm={12} md={6}>
              <Input.Search
                placeholder="Поиск по наименованию..."
                allowClear
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onSearch={(v) => applyFilters({ ...filters, search: v || undefined })}
                enterButton={<SearchOutlined />}
              />
            </Col>
            <Col xs={24} sm={12} md={6}>
              <Select
                placeholder="Организация"
                allowClear
                style={{ width: '100%' }}
                value={filters.organizationId || undefined}
                onChange={(v) => handleFilterChange('organizationId', v)}
                options={organizations.map((o) => ({ value: o.id, label: o.name }))}
                showSearch
                optionFilterProp="label"
              />
            </Col>
            <Col xs={24} sm={12} md={6}>
              <Select
                placeholder="Статус"
                allowClear
                style={{ width: '100%' }}
                value={filters.status || undefined}
                onChange={(v) => handleFilterChange('status', v)}
                options={STATUS_OPTIONS}
              />
            </Col>
            <Col xs={24} sm={12} md={6}>
              <Select
                placeholder="Тип пакета"
                allowClear
                style={{ width: '100%' }}
                value={filters.type || undefined}
                onChange={(v) => handleFilterChange('type', v)}
                options={TYPE_OPTIONS}
              />
            </Col>
            <Col xs={24} sm={12} md={6}>
              <DatePicker.MonthPicker
                placeholder="Период"
                style={{ width: '100%' }}
                format="YYYY-MM"
                value={filters.period ? dayjs(filters.period, 'YYYY-MM') : null}
                onChange={(d) => handleFilterChange('period', d ? d.format('YYYY-MM') : undefined)}
                allowClear
              />
            </Col>
            <Col xs={24} sm={12} md={6}>
              <Space>
                <Button
                  icon={<ClearOutlined />}
                  onClick={clearFilters}
                  disabled={!hasActiveFilters(filters)}
                >
                  Сбросить
                </Button>
              </Space>
            </Col>
          </Row>
        )}
      </Card>

      <Table
        columns={columns}
        dataSource={packages}
        rowKey="id"
        loading={loading}
        pagination={{ pageSize: 20, showSizeChanger: true, showTotal: (t) => `Всего: ${t}` }}
        onRow={(row) => ({
          style: { cursor: 'pointer' },
          onClick: () => navigate(`/packages/${row.id}`)
        })}
        locale={{ emptyText: hasActiveFilters(filters) ? 'Нет пакетов по заданным фильтрам' : 'Нет пакетов' }}
      />

      <Modal
        title="Создать пакет"
        open={modalOpen}
        onOk={handleCreate}
        onCancel={() => {
          setModalOpen(false);
          form.resetFields();
        }}
        confirmLoading={saving}
        okText="Создать"
        destroyOnClose
      >
        <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item
            name="name"
            label="Наименование"
            rules={[{ required: true, message: 'Укажите наименование пакета' }]}
          >
            <Input placeholder="Например: PKG-2026-01-001" />
          </Form.Item>
          <Form.Item name="organizationId" label="Организация (дочка)">
            <OrganizationSelect placeholder="Выберите организацию" />
          </Form.Item>
          <Form.Item
            name="period"
            label="Период"
            rules={[{ required: true, message: 'Укажите период (YYYY-MM)' }]}
          >
            <Input placeholder="2026-01" />
          </Form.Item>
          <Form.Item name="type" label="Тип пакета">
            <Select placeholder="Выберите тип" allowClear options={TYPE_OPTIONS} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
