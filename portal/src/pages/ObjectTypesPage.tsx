import { useEffect, useState } from 'react';
import { Card, Table, Button, Space, Typography, message, Modal, Form, Input, Select, Switch, Tag } from 'antd';
import { PlusOutlined, EditOutlined } from '@ant-design/icons';
import { api } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

const { Title } = Typography;
const { TextArea } = Input;

interface ObjectType {
  id: string;
  code: string;
  name: string;
  directionId: string | null;
  icon: string | null;
  description: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export function ObjectTypesPage() {
  const { user } = useAuth();
  const [types, setTypes] = useState<ObjectType[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingType, setEditingType] = useState<ObjectType | null>(null);
  const [form] = Form.useForm();

  const isAdmin = user?.role === 'ecof_admin';

  const load = async () => {
    try {
      setLoading(true);
      const response = await api.objects.types.list({ activeOnly: false });
      setTypes(response.data);
    } catch (e: any) {
      message.error('Ошибка загрузки типов объектов учета: ' + (e.message || 'Неизвестная ошибка'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAdmin) {
      load();
    }
  }, [isAdmin]);

  const handleCreate = () => {
    setEditingType(null);
    form.resetFields();
    setModalVisible(true);
  };

  const handleEdit = (type: ObjectType) => {
    setEditingType(type);
    form.setFieldsValue({
      code: type.code,
      name: type.name,
      directionId: type.directionId,
      icon: type.icon,
      description: type.description,
      isActive: type.isActive
    });
    setModalVisible(true);
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      if (editingType) {
        await api.objects.types.update(editingType.id, values);
        message.success('Тип объекта учета обновлён');
      } else {
        await api.objects.types.create(values);
        message.success('Тип объекта учета создан');
      }
      setModalVisible(false);
      load();
    } catch (e: any) {
      message.error('Ошибка сохранения: ' + (e.message || 'Неизвестная ошибка'));
    }
  };

  const columns = [
    {
      title: 'Код',
      dataIndex: 'code',
      key: 'code',
      width: 200
    },
    {
      title: 'Наименование',
      dataIndex: 'name',
      key: 'name'
    },
    {
      title: 'Статус',
      dataIndex: 'isActive',
      key: 'isActive',
      width: 100,
      render: (isActive: boolean) => (
        <Tag color={isActive ? 'green' : 'red'}>{isActive ? 'Активен' : 'Неактивен'}</Tag>
      )
    },
    {
      title: 'Действия',
      key: 'actions',
      width: 100,
      render: (_: any, record: ObjectType) => (
        <Button type="link" icon={<EditOutlined />} onClick={() => handleEdit(record)}>
          Редактировать
        </Button>
      )
    }
  ];

  if (!isAdmin) {
    return (
      <div className="page">
        <Card>
          <Typography.Text type="danger">
            Доступ запрещен. Требуется роль администратора ЕЦОФ.
          </Typography.Text>
        </Card>
      </div>
    );
  }

  return (
    <div className="page">
      <Space direction="vertical" style={{ width: '100%' }} size="large">
        <Space style={{ width: '100%', justifyContent: 'space-between' }}>
          <Title level={3} style={{ margin: 0 }}>
            Типы объектов учета
          </Title>
          <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>
            Создать тип
          </Button>
        </Space>

        <Card>
          <Table
            columns={columns}
            dataSource={types}
            rowKey="id"
            loading={loading}
            pagination={{ pageSize: 20 }}
          />
        </Card>

        <Modal
          title={editingType ? 'Редактировать тип объекта учета' : 'Создать тип объекта учета'}
          open={modalVisible}
          onOk={handleSubmit}
          onCancel={() => setModalVisible(false)}
          width={600}
        >
          <Form form={form} layout="vertical">
            <Form.Item
              name="code"
              label="Код"
              rules={[
                { required: true, message: 'Введите код' },
                {
                  pattern: /^[A-Z_][A-Z0-9_]*$/,
                  message: 'Код должен быть в формате UPPER_SNAKE_CASE'
                }
              ]}
            >
              <Input disabled={!!editingType} placeholder="FIXED_ASSET" />
            </Form.Item>
            <Form.Item name="name" label="Наименование" rules={[{ required: true, message: 'Введите наименование' }]}>
              <Input placeholder="Основное средство" />
            </Form.Item>
            <Form.Item name="icon" label="Иконка">
              <Input placeholder="build" />
            </Form.Item>
            <Form.Item name="description" label="Описание">
              <TextArea rows={3} placeholder="Описание назначения объекта учета" />
            </Form.Item>
            <Form.Item name="isActive" label="Активен" valuePropName="checked" initialValue={true}>
              <Switch />
            </Form.Item>
          </Form>
        </Modal>
      </Space>
    </div>
  );
}
