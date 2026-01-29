import { ReactNode } from 'react';
import { Card, Form, Button, Space } from 'antd';
import { SaveOutlined, CheckOutlined } from '@ant-design/icons';

interface BaseDocumentFormProps {
  title: string;
  children: ReactNode;
  onSave: () => void;
  onFreeze?: () => void;
  loading?: boolean;
  showFreeze?: boolean;
}

export function BaseDocumentForm({
  title,
  children,
  onSave,
  onFreeze,
  loading = false,
  showFreeze = true
}: BaseDocumentFormProps) {
  return (
    <Card
      title={title}
      extra={
        <Space>
          <Button
            type="primary"
            icon={<SaveOutlined />}
            onClick={onSave}
            loading={loading}
          >
            Записать
          </Button>
          {showFreeze && onFreeze && (
            <Button
              type="primary"
              icon={<CheckOutlined />}
              onClick={onFreeze}
              loading={loading}
            >
              Заморозить
            </Button>
          )}
        </Space>
      }
    >
      {children}
    </Card>
  );
}
