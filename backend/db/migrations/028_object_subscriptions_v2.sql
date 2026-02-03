-- v2 подписок на объекты учета:
-- организация может:
-- 1) не иметь подписки (NONE)
-- 2) иметь доступ ко всем карточкам типа (ALL)
-- 3) иметь доступ только к выбранным карточкам (SELECTED)

CREATE TABLE IF NOT EXISTS org_object_type_subscriptions (
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  type_id UUID NOT NULL REFERENCES object_types(id) ON DELETE CASCADE,
  mode VARCHAR(20) NOT NULL DEFAULT 'NONE', -- NONE | ALL | SELECTED
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (org_id, type_id)
);

CREATE INDEX IF NOT EXISTS idx_org_object_type_subscriptions_org ON org_object_type_subscriptions(org_id);
CREATE INDEX IF NOT EXISTS idx_org_object_type_subscriptions_type ON org_object_type_subscriptions(type_id);
CREATE INDEX IF NOT EXISTS idx_org_object_type_subscriptions_mode ON org_object_type_subscriptions(mode);

-- Выбранные карточки при mode=SELECTED
CREATE TABLE IF NOT EXISTS org_object_card_subscriptions (
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  type_id UUID NOT NULL REFERENCES object_types(id) ON DELETE CASCADE,
  card_id UUID NOT NULL REFERENCES object_cards(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (org_id, card_id)
);

CREATE INDEX IF NOT EXISTS idx_org_object_card_subscriptions_org_type ON org_object_card_subscriptions(org_id, type_id);

-- updated_at trigger
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_org_object_type_subscriptions_updated_at') THEN
    CREATE TRIGGER update_org_object_type_subscriptions_updated_at BEFORE UPDATE ON org_object_type_subscriptions
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

-- Backward compatibility seed:
-- ранее "подписка на тип объекта" считалась подпиской на analytics_type с тем же code.
-- Переносим такие подписки в org_object_type_subscriptions.mode = ALL.
INSERT INTO org_object_type_subscriptions (org_id, type_id, mode)
SELECT DISTINCT
  s.org_id,
  ot.id AS type_id,
  'ALL' AS mode
FROM org_analytics_subscriptions s
JOIN analytics_types at ON at.id = s.type_id
JOIN object_types ot ON UPPER(ot.code) = UPPER(at.code)
WHERE s.is_enabled = true
ON CONFLICT (org_id, type_id) DO NOTHING;

