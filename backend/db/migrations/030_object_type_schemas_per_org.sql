-- 030_object_type_schemas_per_org.sql
-- Добавляем возможность делать разные наборы аналитик (полей карточки объекта)
-- для разных организаций по одному и тому же типу объекта учета.
--
-- Идея:
-- - существующие записи object_type_schemas остаются "общими" (organization_id IS NULL)
-- - для организации можно завести свой набор полей с organization_id = <org_id>
-- - при чтении схемы для организации, если есть записи с её organization_id,
--   используется только этот набор; иначе используется общий (NULL).

ALTER TABLE object_type_schemas
  ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id);

CREATE INDEX IF NOT EXISTS idx_object_type_schemas_type_org
  ON object_type_schemas(type_id, organization_id);

