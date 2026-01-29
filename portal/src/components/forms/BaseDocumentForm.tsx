import { ReactNode } from 'react';
import { Card, Form, Button, Space, Divider } from 'antd';
import { SaveOutlined, CheckOutlined } from '@ant-design/icons';
import { FileUploadSection } from './FileUploadSection';

interface BaseDocumentFormProps {
  title: string;
  children: ReactNode;
  onSave: () => void;
  onFreeze?: () => void;
  loading?: boolean;
  showFreeze?: boolean;
  files?: File[];
  onFilesChange?: (files: File[]) => void;
  showFileUpload?: boolean;
}

export function BaseDocumentForm({
  title,
  children,
  onSave,
  onFreeze,
  loading = false,
  showFreeze = true,
  files = [],
  onFilesChange,
  showFileUpload = true
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
      {showFileUpload && onFilesChange && (
        <>
          <Divider />
          <div>
            <h4>Прикрепленные файлы</h4>
            <FileUploadSection 
              files={files} 
              onChange={onFilesChange}
            />
          </div>
        </>
      )}
    </Card>
  );
}
