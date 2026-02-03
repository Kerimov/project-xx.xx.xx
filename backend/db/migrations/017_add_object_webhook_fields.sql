-- Добавление полей для webhook доставки объектов учета в таблицу org_webhooks
-- Используем ту же таблицу, что и для аналитик, но добавляем отдельные счетчики для объектов

ALTER TABLE org_webhooks
  ADD COLUMN IF NOT EXISTS last_delivered_object_seq BIGINT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS object_webhook_fail_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS object_webhook_last_error TEXT,
  ADD COLUMN IF NOT EXISTS object_webhook_next_retry_at TIMESTAMPTZ DEFAULT now();

CREATE INDEX IF NOT EXISTS idx_org_webhooks_object_retry ON org_webhooks(object_webhook_next_retry_at)
WHERE is_active = true;
