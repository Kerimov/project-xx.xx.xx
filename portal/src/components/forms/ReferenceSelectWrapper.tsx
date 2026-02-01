import { useState, useEffect } from 'react';
import { Button, Modal, Table, Input, message } from 'antd';
import { UnorderedListOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';

export interface ReferenceSelectWrapperProps<T extends { id: string }> {
  /** Сам селект (поле выбора) */
  children: React.ReactNode;
  /** Заголовок модального окна справочника */
  directoryTitle: string;
  /** Колонки таблицы в справочнике */
  columns: ColumnsType<T>;
  /** Загрузка списка (search — опциональный поисковый запрос) */
  loadItems: (search?: string) => Promise<T[]>;
  /** Вызов при выборе элемента (заполнение поля) */
  onSelect: (id: string, record?: T) => void;
  /** Показывать кнопку «Открыть справочник» даже если данные зависят от другого поля (например, договоры от организации) */
  disabled?: boolean;
  /** Подсказка при disabled */
  disabledHint?: string;
}

export function ReferenceSelectWrapper<T extends { id: string }>({
  children,
  directoryTitle,
  columns,
  loadItems,
  onSelect,
  disabled = false,
  disabledHint,
}: ReferenceSelectWrapperProps<T>) {
  const [modalOpen, setModalOpen] = useState(false);
  const [items, setItems] = useState<T[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');

  const load = async (searchQuery?: string) => {
    setLoading(true);
    try {
      const data = await loadItems(searchQuery);
      setItems(Array.isArray(data) ? data : []);
    } catch (e) {
      message.error('Ошибка загрузки справочника');
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (modalOpen) {
      load(undefined);
    }
  }, [modalOpen]);

  const handleSearch = () => {
    load(search || undefined);
  };

  const handleRowClick = (record: T) => {
    onSelect(record.id, record);
    setModalOpen(false);
  };

  const openModal = () => {
    setSearch('');
    setModalOpen(true);
  };

  return (
    <>
      <div style={{ display: 'flex', width: '100%', alignItems: 'stretch', gap: 4 }}>
        <div style={{ flex: 1, minWidth: 0 }}>{children}</div>
        <Button
          type="default"
          icon={<UnorderedListOutlined />}
          onClick={openModal}
          disabled={disabled}
          title={disabled ? disabledHint : 'Открыть справочник'}
        />
      </div>
      <Modal
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        title={directoryTitle}
        footer={null}
        width={800}
        destroyOnHidden
      >
        <div style={{ marginBottom: 12 }}>
          <Input.Search
            placeholder="Поиск по справочнику"
            allowClear
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onSearch={handleSearch}
            enterButton="Искать"
          />
        </div>
        <Table<T>
          size="small"
          rowKey="id"
          dataSource={items}
          columns={columns}
          loading={loading}
          pagination={{ pageSize: 10, showSizeChanger: true, showTotal: (t) => `Всего: ${t}` }}
          onRow={(record) => ({
            onClick: () => handleRowClick(record),
            style: { cursor: 'pointer' },
          })}
        />
      </Modal>
    </>
  );
}
