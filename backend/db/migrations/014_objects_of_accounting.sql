-- Объекты учета и аналитическая детализация
-- Создание системы для управления объектами учета (ОС, НМА, договоры, проекты и т.д.)

-- Виды объектов учета (ObjectType) - что именно учитываем
CREATE TABLE IF NOT EXISTS object_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(100) UNIQUE NOT NULL,          -- например: FIXED_ASSET, COUNTERPARTY, CONTRACT, PROJECT, CFO
  name VARCHAR(255) NOT NULL,                  -- "Основное средство", "Контрагент" и т.д.
  direction_id UUID REFERENCES directions(id), -- если объект относится к конкретному направлению; NULL = общий
  icon VARCHAR(50),                            -- иконка для UI (опционально)
  description TEXT,                            -- описание назначения объекта учета
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_object_types_direction ON object_types(direction_id);
CREATE INDEX IF NOT EXISTS idx_object_types_active ON object_types(is_active);
CREATE INDEX IF NOT EXISTS idx_object_types_code ON object_types(code);

-- Схемы полей для типов объектов учета (ObjectTypeSchema)
-- Определяет, какие поля и в каких группах есть у каждого типа объекта
CREATE TABLE IF NOT EXISTS object_type_schemas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type_id UUID NOT NULL REFERENCES object_types(id) ON DELETE CASCADE,
  field_key VARCHAR(100) NOT NULL,            -- например: inventoryNumber, vin, okofCode, initialCost
  label VARCHAR(255) NOT NULL,                -- "Инвентарный номер", "VIN" и т.д.
  data_type VARCHAR(50) NOT NULL,             -- string, number, date, boolean, money, enum, reference(ObjectType), file, json
  field_group VARCHAR(100),                   -- "Основное", "Идентификация", "Финансы", "Эксплуатация", "Налоговая", "Управленческая"
  is_required BOOLEAN NOT NULL DEFAULT false,
  is_unique BOOLEAN NOT NULL DEFAULT false,   -- уникальность значения в рамках типа
  validation_rules JSONB DEFAULT '{}'::jsonb,  -- правила валидации (маски, диапазоны, форматы)
  default_value JSONB,                         -- значение по умолчанию
  reference_type_id UUID REFERENCES object_types(id), -- если data_type = reference, ссылка на другой тип объекта
  enum_values JSONB,                           -- если data_type = enum, список допустимых значений
  display_order INTEGER NOT NULL DEFAULT 0,   -- порядок отображения в форме
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(type_id, field_key)
);

CREATE INDEX IF NOT EXISTS idx_object_type_schemas_type ON object_type_schemas(type_id);
CREATE INDEX IF NOT EXISTS idx_object_type_schemas_group ON object_type_schemas(type_id, field_group);

-- Карточки объектов учета (ObjectCard) - конкретные экземпляры объектов
CREATE TABLE IF NOT EXISTS object_cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type_id UUID NOT NULL REFERENCES object_types(id),
  code VARCHAR(150) NOT NULL,                  -- инвентарный номер, код договора и т.д. (уникален в рамках типа)
  name VARCHAR(500) NOT NULL,                  -- наименование объекта
  organization_id UUID REFERENCES organizations(id), -- если объект привязан к организации; NULL = общий для холдинга
  status VARCHAR(50) NOT NULL DEFAULT 'Active', -- Active, Inactive, Archived
  attrs JSONB NOT NULL DEFAULT '{}'::jsonb,   -- значения полей по схеме (field_key -> value)
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES users(id),
  updated_by UUID REFERENCES users(id),
  UNIQUE(type_id, code) -- уникальность кода в рамках типа
);

CREATE INDEX IF NOT EXISTS idx_object_cards_type ON object_cards(type_id);
CREATE INDEX IF NOT EXISTS idx_object_cards_organization ON object_cards(organization_id);
CREATE INDEX IF NOT EXISTS idx_object_cards_status ON object_cards(status);
CREATE INDEX IF NOT EXISTS idx_object_cards_code ON object_cards(code);
CREATE INDEX IF NOT EXISTS idx_object_cards_name ON object_cards(name);
CREATE INDEX IF NOT EXISTS idx_object_cards_type_code ON object_cards(type_id, code);

-- История изменений карточек объектов (audit log)
CREATE TABLE IF NOT EXISTS object_card_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  card_id UUID NOT NULL REFERENCES object_cards(id) ON DELETE CASCADE,
  changed_by UUID REFERENCES users(id),
  change_type VARCHAR(50) NOT NULL,          -- Created, Updated, StatusChanged, FieldChanged
  field_key VARCHAR(100),                     -- какое поле изменилось (если применимо)
  old_value JSONB,                            -- старое значение
  new_value JSONB,                            -- новое значение
  comment TEXT,                                -- комментарий к изменению
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_object_card_history_card ON object_card_history(card_id);
CREATE INDEX IF NOT EXISTS idx_object_card_history_created ON object_card_history(created_at DESC);

-- Подписки организаций на объекты учета (аналогично org_analytics_subscriptions)
-- Организация может подписаться на определенные типы объектов учета
CREATE TABLE IF NOT EXISTS org_object_subscriptions (
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  type_id UUID NOT NULL REFERENCES object_types(id) ON DELETE CASCADE,
  is_enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (org_id, type_id)
);

CREATE INDEX IF NOT EXISTS idx_org_object_subscriptions_org ON org_object_subscriptions(org_id);
CREATE INDEX IF NOT EXISTS idx_org_object_subscriptions_type ON org_object_subscriptions(type_id);

-- События изменений объектов учета (outbox для webhook доставки)
CREATE TABLE IF NOT EXISTS object_events (
  seq BIGSERIAL PRIMARY KEY,
  event_type VARCHAR(20) NOT NULL,            -- Upsert | Deactivate | Snapshot
  type_id UUID NOT NULL REFERENCES object_types(id) ON DELETE CASCADE,
  card_id UUID REFERENCES object_cards(id) ON DELETE SET NULL,
  payload JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_object_events_type_seq ON object_events(type_id, seq);
CREATE INDEX IF NOT EXISTS idx_object_events_seq ON object_events(seq);
CREATE INDEX IF NOT EXISTS idx_object_events_card ON object_events(card_id);

-- Триггеры updated_at для новых таблиц
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_object_types_updated_at') THEN
    CREATE TRIGGER update_object_types_updated_at BEFORE UPDATE ON object_types
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_object_type_schemas_updated_at') THEN
    CREATE TRIGGER update_object_type_schemas_updated_at BEFORE UPDATE ON object_type_schemas
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_object_cards_updated_at') THEN
    CREATE TRIGGER update_object_cards_updated_at BEFORE UPDATE ON object_cards
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_org_object_subscriptions_updated_at') THEN
    CREATE TRIGGER update_org_object_subscriptions_updated_at BEFORE UPDATE ON org_object_subscriptions
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

-- Функция для автоматической записи истории изменений карточки
CREATE OR REPLACE FUNCTION log_object_card_change()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO object_card_history (card_id, changed_by, change_type, new_value)
    VALUES (NEW.id, NEW.created_by, 'Created', row_to_json(NEW));
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    -- Записываем изменения по полям
    IF OLD.status != NEW.status THEN
      INSERT INTO object_card_history (card_id, changed_by, change_type, field_key, old_value, new_value)
      VALUES (NEW.id, NEW.updated_by, 'StatusChanged', 'status', 
              jsonb_build_object('status', OLD.status), 
              jsonb_build_object('status', NEW.status));
    END IF;
    
    -- Записываем общее изменение
    IF OLD.attrs != NEW.attrs OR OLD.name != NEW.name OR OLD.code != NEW.code THEN
      INSERT INTO object_card_history (card_id, changed_by, change_type, old_value, new_value)
      VALUES (NEW.id, NEW.updated_by, 'Updated', 
              jsonb_build_object('code', OLD.code, 'name', OLD.name, 'attrs', OLD.attrs),
              jsonb_build_object('code', NEW.code, 'name', NEW.name, 'attrs', NEW.attrs));
    END IF;
    RETURN NEW;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Триггер для логирования изменений карточек
DROP TRIGGER IF EXISTS trigger_log_object_card_change ON object_cards;
CREATE TRIGGER trigger_log_object_card_change
  AFTER INSERT OR UPDATE ON object_cards
  FOR EACH ROW EXECUTE FUNCTION log_object_card_change();
