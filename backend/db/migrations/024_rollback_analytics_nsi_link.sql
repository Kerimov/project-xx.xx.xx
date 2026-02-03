-- Откат связи аналитик с НСИ: удаление колонки nsi_entity из analytics_types (если была добавлена миграцией 023).

ALTER TABLE analytics_types DROP COLUMN IF EXISTS nsi_entity;

DROP INDEX IF EXISTS idx_analytics_types_nsi_entity;
