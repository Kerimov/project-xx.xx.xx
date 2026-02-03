-- Типы объектов учета «Склад» и «Счёт бухгалтерского учёта» для связи с НСИ (справочники Склады, План счетов)

INSERT INTO object_types (code, name, direction_id, icon, description, is_active)
VALUES
  ('WAREHOUSE', 'Склад', NULL, 'inbox', 'Склады организаций из НСИ', true),
  ('ACCOUNTING_ACCOUNT', 'Счёт бухгалтерского учёта', NULL, 'account-book', 'План счетов из НСИ', true)
ON CONFLICT (code) DO NOTHING;

-- ========== WAREHOUSE (Склад) ==========
DO $$
DECLARE
  tid UUID;
BEGIN
  SELECT id INTO tid FROM object_types WHERE code = 'WAREHOUSE';
  IF tid IS NOT NULL THEN
    INSERT INTO object_type_schemas (type_id, field_key, label, data_type, field_group, is_required, is_unique, display_order)
    VALUES
      (tid, 'code', 'Код склада', 'string', 'Основное', true, true, 1),
      (tid, 'name', 'Наименование', 'string', 'Основное', true, false, 2),
      (tid, 'organizationId', 'Организация', 'reference', 'Связи', false, false, 10),
      (tid, 'description', 'Описание', 'string', 'Прочее', false, false, 20)
    ON CONFLICT (type_id, field_key) DO NOTHING;
  END IF;
END $$;

-- ========== ACCOUNTING_ACCOUNT (Счёт бухгалтерского учёта) ==========
DO $$
DECLARE
  tid UUID;
BEGIN
  SELECT id INTO tid FROM object_types WHERE code = 'ACCOUNTING_ACCOUNT';
  IF tid IS NOT NULL THEN
    INSERT INTO object_type_schemas (type_id, field_key, label, data_type, field_group, is_required, is_unique, display_order)
    VALUES
      (tid, 'code', 'Код счёта', 'string', 'Основное', true, true, 1),
      (tid, 'name', 'Наименование', 'string', 'Основное', true, false, 2),
      (tid, 'description', 'Описание', 'string', 'Прочее', false, false, 10)
    ON CONFLICT (type_id, field_key) DO NOTHING;
  END IF;
END $$;
