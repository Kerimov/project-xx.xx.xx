-- 029_object_cards_exclude_analytics.sql
-- Флаг исключения карточки объекта учета из аналитик/выборов в документах.
-- Карточка остаётся в системе (история, отчёты), но по умолчанию не предлагается в селекторах.

ALTER TABLE object_cards
  ADD COLUMN IF NOT EXISTS exclude_from_analytics BOOLEAN NOT NULL DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_object_cards_exclude_from_analytics
  ON object_cards(exclude_from_analytics);

