-- MDM аналитик холдинга + подписки дочерних организаций + пуш-доставка через webhooks

-- Направления (дивизионы) холдинга
CREATE TABLE IF NOT EXISTS directions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_directions_code ON directions(code);

-- Привязка организаций к направлению
ALTER TABLE organizations
  ADD COLUMN IF NOT EXISTS direction_id UUID REFERENCES directions(id);

CREATE INDEX IF NOT EXISTS idx_organizations_direction ON organizations(direction_id);

-- Виды аналитик (что именно раздаём)
CREATE TABLE IF NOT EXISTS analytics_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(100) UNIQUE NOT NULL,          -- например: COUNTERPARTY, CFO, PROJECT, COST_ITEM
  name VARCHAR(255) NOT NULL,
  direction_id UUID REFERENCES directions(id), -- если аналитика относится к конкретному направлению; NULL = общая
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_analytics_types_direction ON analytics_types(direction_id);
CREATE INDEX IF NOT EXISTS idx_analytics_types_active ON analytics_types(is_active);

-- Значения аналитик (конкретные элементы)
CREATE TABLE IF NOT EXISTS analytics_values (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type_id UUID NOT NULL REFERENCES analytics_types(id) ON DELETE CASCADE,
  code VARCHAR(150) NOT NULL,   -- внешний/человеческий код (в рамках типа должен быть уникален)
  name VARCHAR(500) NOT NULL,
  attrs JSONB NOT NULL DEFAULT '{}'::jsonb,  -- расширяемые атрибуты
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(type_id, code)
);

-- Для keyset pagination + быстрых выборок в селектах
CREATE INDEX IF NOT EXISTS idx_analytics_values_type_updated_id
  ON analytics_values(type_id, updated_at, id);
CREATE INDEX IF NOT EXISTS idx_analytics_values_type_active
  ON analytics_values(type_id, is_active);

-- Подписки организаций на виды аналитик
CREATE TABLE IF NOT EXISTS org_analytics_subscriptions (
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  type_id UUID NOT NULL REFERENCES analytics_types(id) ON DELETE CASCADE,
  is_enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (org_id, type_id)
);

CREATE INDEX IF NOT EXISTS idx_org_analytics_subscriptions_org ON org_analytics_subscriptions(org_id);
CREATE INDEX IF NOT EXISTS idx_org_analytics_subscriptions_type ON org_analytics_subscriptions(type_id);

-- Вебхук организации для получения аналитик (пуш)
CREATE TABLE IF NOT EXISTS org_webhooks (
  org_id UUID PRIMARY KEY REFERENCES organizations(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  secret TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_delivered_seq BIGINT NOT NULL DEFAULT 0,
  fail_count INTEGER NOT NULL DEFAULT 0,
  last_error TEXT,
  next_retry_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_org_webhooks_active_retry
  ON org_webhooks(is_active, next_retry_at);

-- События изменений аналитик (outbox, монотонная последовательность)
CREATE TABLE IF NOT EXISTS analytics_events (
  seq BIGSERIAL PRIMARY KEY,
  event_type VARCHAR(20) NOT NULL, -- Upsert | Deactivate | Snapshot (при ресинке)
  type_id UUID NOT NULL REFERENCES analytics_types(id) ON DELETE CASCADE,
  value_id UUID REFERENCES analytics_values(id) ON DELETE SET NULL,
  payload JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_analytics_events_type_seq ON analytics_events(type_id, seq);
CREATE INDEX IF NOT EXISTS idx_analytics_events_seq ON analytics_events(seq);

-- Джобы ресинка: генерация Snapshot событий для организации/типа аналитики
CREATE TABLE IF NOT EXISTS analytics_resync_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  type_id UUID NOT NULL REFERENCES analytics_types(id) ON DELETE CASCADE,
  status VARCHAR(20) NOT NULL DEFAULT 'Pending', -- Pending | Processing | Completed | Failed
  cursor_updated_at TIMESTAMPTZ,
  cursor_id UUID,
  batch_size INTEGER NOT NULL DEFAULT 1000,
  fail_count INTEGER NOT NULL DEFAULT 0,
  last_error TEXT,
  next_retry_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(org_id, type_id, status)
);

CREATE INDEX IF NOT EXISTS idx_analytics_resync_jobs_status_retry
  ON analytics_resync_jobs(status, next_retry_at);

-- Триггеры updated_at для новых таблиц
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_directions_updated_at') THEN
    CREATE TRIGGER update_directions_updated_at BEFORE UPDATE ON directions
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_analytics_types_updated_at') THEN
    CREATE TRIGGER update_analytics_types_updated_at BEFORE UPDATE ON analytics_types
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_analytics_values_updated_at') THEN
    CREATE TRIGGER update_analytics_values_updated_at BEFORE UPDATE ON analytics_values
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_org_analytics_subscriptions_updated_at') THEN
    CREATE TRIGGER update_org_analytics_subscriptions_updated_at BEFORE UPDATE ON org_analytics_subscriptions
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_org_webhooks_updated_at') THEN
    CREATE TRIGGER update_org_webhooks_updated_at BEFORE UPDATE ON org_webhooks
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_analytics_resync_jobs_updated_at') THEN
    CREATE TRIGGER update_analytics_resync_jobs_updated_at BEFORE UPDATE ON analytics_resync_jobs
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

