-- Добавляем недостающие коды типов аналитик, которые используются в UI/валидации

INSERT INTO analytics_types (code, name, direction_id, is_active)
VALUES
  ('ACCOUNT', 'Счёт (банк/касса)', NULL, true),
  ('ACCOUNTING_ACCOUNT', 'Счет учета (план счетов)', NULL, true),
  ('NOMENCLATURE', 'Номенклатура', NULL, true)
ON CONFLICT (code) DO NOTHING;

