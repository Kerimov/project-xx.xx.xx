import { useEffect, useMemo, useState } from 'react';
import { Button, Card, Col, Form, Input, Row, Space, Table, Typography, message } from 'antd';
import { api } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

type TypeRow = { id: string; code: string; name: string; directionId: string | null; isActive: boolean };

export function AnalyticsAdminPage() {
  const { user } = useAuth();
  const isAdmin = useMemo(() => ['ecof_admin', 'admin'].includes(user?.role || ''), [user?.role]);

  const [types, setTypes] = useState<TypeRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [createForm] = Form.useForm();
  const [valueForm] = Form.useForm();

  const load = async () => {
    try {
      setLoading(true);
      const res = await api.analytics.listTypes();
      setTypes(res.data || []);
    } catch (e: any) {
      message.error(e?.message || 'Ошибка загрузки типов аналитик');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const createType = async () => {
    try {
      const v = await createForm.validateFields();
      await api.analytics.adminCreateType(v);
      message.success('Тип аналитики создан');
      createForm.resetFields();
      load();
    } catch (e: any) {
      if (e?.errorFields) return;
      message.error(e?.message || 'Ошибка создания');
    }
  };

  const upsertValue = async () => {
    try {
      const v = await valueForm.validateFields();
      await api.analytics.adminUpsertValue({
        typeCode: v.typeCode,
        code: v.code,
        name: v.name,
        attrs: v.attrs ? JSON.parse(v.attrs) : undefined,
        isActive: v.isActive !== 'false'
      });
      message.success('Значение сохранено (событие создано)');
      valueForm.resetFields();
    } catch (e: any) {
      if (e?.errorFields) return;
      message.error(e?.message || 'Ошибка сохранения значения');
    }
  };

  if (!isAdmin) {
    return (
      <div className="page">
        <Card>
          <Typography.Text>Недостаточно прав.</Typography.Text>
        </Card>
      </div>
    );
  }

  return (
    <div className="page">
      <Space direction="vertical" style={{ width: '100%' }} size={12}>
        <Typography.Title level={3} style={{ margin: 0 }}>
          Администрирование аналитик (каталог холдинга)
        </Typography.Title>

        <Card size="small" title="Создать тип аналитики">
          <Form layout="vertical" form={createForm}>
            <Row gutter={12}>
              <Col xs={24} md={6}>
                <Form.Item
                  name="code"
                  label="Код (A-Z0-9_)"
                  rules={[{ required: true, message: 'Укажите code' }]}
                >
                  <Input placeholder="COUNTERPARTY" />
                </Form.Item>
              </Col>
              <Col xs={24} md={12}>
                <Form.Item name="name" label="Название" rules={[{ required: true, message: 'Укажите name' }]}>
                  <Input placeholder="Контрагент" />
                </Form.Item>
              </Col>
              <Col xs={24} md={6}>
                <Form.Item name="directionId" label="Direction ID (опц.)">
                  <Input placeholder="UUID или пусто" />
                </Form.Item>
              </Col>
            </Row>
            <Button type="primary" onClick={createType}>
              Создать
            </Button>
          </Form>
        </Card>

        <Card size="small" title="Добавить/обновить значение аналитики (ручной ввод)">
          <Form layout="vertical" form={valueForm}>
            <Row gutter={12}>
              <Col xs={24} md={6}>
                <Form.Item name="typeCode" label="TypeCode" rules={[{ required: true, message: 'Укажите typeCode' }]}>
                  <Input placeholder="COUNTERPARTY" />
                </Form.Item>
              </Col>
              <Col xs={24} md={6}>
                <Form.Item name="code" label="Код значения" rules={[{ required: true, message: 'Укажите code' }]}>
                  <Input placeholder="000123" />
                </Form.Item>
              </Col>
              <Col xs={24} md={12}>
                <Form.Item name="name" label="Название" rules={[{ required: true, message: 'Укажите name' }]}>
                  <Input placeholder="ООО Ромашка" />
                </Form.Item>
              </Col>
            </Row>
            <Row gutter={12}>
              <Col xs={24} md={16}>
                <Form.Item name="attrs" label="attrs (JSON, опц.)">
                  <Input.TextArea rows={3} placeholder='{"inn":"7700000000"}' />
                </Form.Item>
              </Col>
              <Col xs={24} md={8}>
                <Form.Item name="isActive" label="Активен? (true/false)" initialValue="true">
                  <Input />
                </Form.Item>
              </Col>
            </Row>
            <Button onClick={upsertValue} type="primary">
              Сохранить значение
            </Button>
          </Form>
        </Card>

        <Card size="small" title="Список типов аналитик" loading={loading}>
          <Table<TypeRow>
            rowKey="id"
            dataSource={types}
            pagination={{ pageSize: 50 }}
            columns={[
              { title: 'Код', dataIndex: 'code', key: 'code' },
              { title: 'Название', dataIndex: 'name', key: 'name' },
              { title: 'Active', dataIndex: 'isActive', key: 'isActive', render: (v) => String(v) },
              { title: 'Direction', dataIndex: 'directionId', key: 'directionId', render: (v) => v || '—' }
            ]}
          />
        </Card>
      </Space>
    </div>
  );
}

