import { useState, useEffect } from 'react';
import { Select, Spin, message, Alert } from 'antd';
import { Link } from 'react-router-dom';
import { InfoCircleOutlined } from '@ant-design/icons';
import { api } from '../../services/api';
import { ReferenceSelectWrapper } from './ReferenceSelectWrapper';
import type { SelectProps } from 'antd';

const { Option } = Select;

interface ObjectCard {
  id: string;
  code: string;
  name: string;
  status: string;
  attrs: Record<string, unknown>;
}

interface ObjectCardSelectProps extends Omit<SelectProps, 'options' | 'loading'> {
  /** Код типа объекта учета (например, 'FIXED_ASSET', 'PROJECT', 'CFO') */
  objectTypeCode: string;
  value?: string;
  onChange?: (value: string, card?: ObjectCard) => void;
  /** Показывать только активные карточки */
  activeOnly?: boolean;
}

/**
 * Компонент для выбора карточки объекта учета.
 * Работает аналогично CounterpartySelect, но для объектов учета.
 * Проверяет подписку организации на тип объекта учета.
 */
export function ObjectCardSelect({
  objectTypeCode,
  value,
  onChange,
  activeOnly = true,
  ...props
}: ObjectCardSelectProps) {
  const [loading, setLoading] = useState(false);
  const [cards, setCards] = useState<ObjectCard[]>([]);
  const [enabled, setEnabled] = useState(false);
  const [checkingSubscription, setCheckingSubscription] = useState(true);

  // Проверяем подписку организации на тип объекта учета
  useEffect(() => {
    const checkSubscription = async () => {
      try {
        setCheckingSubscription(true);
        const subsResponse = await api.objects.subscriptions.list();
        const typeResponse = await api.objects.types.list({ activeOnly: true });
        const type = typeResponse.data.find((t) => t.code === objectTypeCode);
        if (type) {
          const hasSubscription = subsResponse.data.some(
            (s) => s.typeCode === objectTypeCode && s.isEnabled
          );
          setEnabled(hasSubscription);
        } else {
          setEnabled(false);
        }
      } catch (e: any) {
        console.error('Ошибка проверки подписки на объекты учета:', e);
        setEnabled(false);
      } finally {
        setCheckingSubscription(false);
      }
    };
    checkSubscription();
  }, [objectTypeCode]);

  // Если подписка не активна — очищаем значение
  useEffect(() => {
    if (!enabled && value) {
      onChange?.('' as any, undefined);
    }
  }, [enabled, value, onChange]);

  const loadCards = async (search?: string) => {
    if (!enabled) return;
    setLoading(true);
    try {
      const response = await api.objects.subscribedCards.list({
        typeCode: objectTypeCode,
        search,
        status: activeOnly ? 'Active' : undefined,
        limit: 100
      });
      let list = response.data.cards || [];
      // Если задан value и его нет в списке — подгружаем по ID (для редактирования)
      if (value && !list.some((card: ObjectCard) => card.id === value)) {
        try {
          const res = await api.objects.cards.getById(value);
          if (res.data) list = [res.data, ...list];
        } catch {
          // Игнорируем — возможно карточка удалена
        }
      }
      setCards(list);
    } catch (error: any) {
      message.error('Ошибка загрузки объектов учета: ' + (error.message || 'Неизвестная ошибка'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (enabled) {
      loadCards();
    }
  }, [enabled, objectTypeCode, value]);

  const handleSearch = (search: string) => {
    if (search.length >= 2 || search.length === 0) {
      loadCards(search || undefined);
    }
  };

  const handleChange = (val: string) => {
    const card = cards.find((c) => c.id === val);
    onChange?.(val, card);
  };

  const loadItems = async (search?: string) => {
    const response = await api.objects.subscribedCards.list({
      typeCode: objectTypeCode,
      search,
      status: activeOnly ? 'Active' : undefined,
      limit: 100
    });
    return (response.data.cards || []) as ObjectCard[];
  };

  const handleSelectFromDirectory = (id: string, record?: ObjectCard) => {
    onChange?.(id, record);
  };

  if (checkingSubscription) {
    return <Select {...props} loading placeholder="Проверка подписки..." disabled style={{ width: '100%' }} />;
  }

  if (!enabled) {
    return (
      <>
        <Alert
          type="info"
          icon={<InfoCircleOutlined />}
          message={
            <span>
              Объект учета <strong>{objectTypeCode}</strong> недоступен. <Link to="/analytics" target="_blank" rel="noopener noreferrer">Подключить подписку →</Link>
            </span>
          }
          style={{ marginBottom: 8 }}
        />
        <Select
          {...props}
          value={value}
          onChange={handleChange}
          disabled
          placeholder="Недоступно (нет подписки на объект учета)"
          style={{ width: '100%' }}
        />
      </>
    );
  }

  return (
    <ReferenceSelectWrapper<ObjectCard>
      directoryTitle={`Справочник объектов учета: ${objectTypeCode}`}
      columns={[
        { title: 'Код', dataIndex: 'code', key: 'code', width: 150 },
        { title: 'Наименование', dataIndex: 'name', key: 'name', ellipsis: true },
        {
          title: 'Статус',
          dataIndex: 'status',
          key: 'status',
          width: 100,
          render: (status: string) => (status === 'Active' ? 'Активен' : status === 'Archived' ? 'Архив' : 'Неактивен')
        }
      ]}
      loadItems={loadItems}
      onSelect={handleSelectFromDirectory}
    >
      <Select
        {...props}
        value={value}
        onChange={handleChange}
        showSearch
        allowClear
        placeholder={`Выберите объект учета (${objectTypeCode})`}
        loading={loading}
        filterOption={false}
        onSearch={handleSearch}
        notFoundContent={loading ? <Spin size="small" /> : null}
        optionLabelProp="label"
        style={{ width: '100%' }}
      >
        {cards.map((card) => (
          <Option key={card.id} value={card.id} label={card.name}>
            <div>
              <div style={{ fontWeight: 500 }}>{card.name}</div>
              {card.code && <div style={{ fontSize: '12px', color: '#999' }}>Код: {card.code}</div>}
            </div>
          </Option>
        ))}
      </Select>
    </ReferenceSelectWrapper>
  );
}
