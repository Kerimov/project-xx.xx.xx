import { useState } from 'react';
import { Upload, Button, List, Space, Typography, message, Popconfirm } from 'antd';
import { UploadOutlined, DeleteOutlined } from '@ant-design/icons';
import type { UploadFile } from 'antd';

const { Text } = Typography;

interface FileUploadSectionProps {
  files: File[];
  onChange: (files: File[]) => void;
  maxSize?: number; // в байтах
  maxCount?: number;
}

export function FileUploadSection({ 
  files, 
  onChange, 
  maxSize = 50 * 1024 * 1024, // 50 МБ по умолчанию
  maxCount = 10 
}: FileUploadSectionProps) {
  const [uploading, setUploading] = useState(false);

  const handleFileSelect = (file: File) => {
    // Проверка размера файла
    if (file.size > maxSize) {
      message.error(`Размер файла "${file.name}" превышает допустимый лимит (${Math.round(maxSize / 1024 / 1024)} МБ)`);
      return false;
    }

    // Проверка количества файлов
    if (files.length >= maxCount) {
      message.error(`Максимальное количество файлов: ${maxCount}`);
      return false;
    }

    // Проверка на дубликаты
    if (files.some(f => f.name === file.name && f.size === file.size)) {
      message.warning(`Файл "${file.name}" уже добавлен`);
      return false;
    }

    onChange([...files, file]);
    return false; // Предотвращаем автоматическую загрузку
  };

  const handleRemove = (index: number) => {
    const newFiles = files.filter((_, i) => i !== index);
    onChange(newFiles);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  return (
    <Space direction="vertical" style={{ width: '100%' }} size="middle">
      <Upload
        beforeUpload={handleFileSelect}
        showUploadList={false}
        multiple
        accept="*/*"
      >
        <Button 
          icon={<UploadOutlined />} 
          loading={uploading}
          type="default"
        >
          Добавить файл
        </Button>
      </Upload>
      
      {files.length > 0 && (
        <List
          size="small"
          dataSource={files}
          renderItem={(file, index) => (
            <List.Item
              actions={[
                <Popconfirm
                  key="delete"
                  title="Удаление файла"
                  description={`Удалить файл "${file.name}"?`}
                  onConfirm={() => handleRemove(index)}
                  okText="Удалить"
                  okType="danger"
                  cancelText="Отмена"
                >
                  <Button
                    type="link"
                    danger
                    size="small"
                    icon={<DeleteOutlined />}
                  >
                    Удалить
                  </Button>
                </Popconfirm>
              ]}
            >
              <List.Item.Meta
                title={<Text>{file.name}</Text>}
                description={
                  <Text type="secondary">
                    Размер: {formatFileSize(file.size)}
                  </Text>
                }
              />
            </List.Item>
          )}
        />
      )}
      
      {files.length === 0 && (
        <Text type="secondary">Файлы не добавлены</Text>
      )}
    </Space>
  );
}
