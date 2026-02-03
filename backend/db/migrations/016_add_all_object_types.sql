-- Добавление полного перечня типов объектов учета из ТЗ
-- Расширение существующих 5 типов до полного списка (~30+ типов)

-- ========== Организационная структура ==========
INSERT INTO object_types (code, name, direction_id, icon, description, is_active)
VALUES 
  ('ORG', 'Организация', NULL, 'bank', 'Организации холдинга', true),
  ('DEPARTMENT', 'Подразделение', NULL, 'apartment', 'Подразделения организаций', true),
  ('COST_CENTER', 'МВЗ / Центр затрат', NULL, 'fund', 'Места возникновения затрат', true),
  ('RESPONSIBLE_PERSON', 'МОЛ / Ответственный', NULL, 'user', 'Материально ответственные лица и ответственные сотрудники', true)
ON CONFLICT (code) DO NOTHING;

-- ========== Контрагенты и договоры (расширение) ==========
INSERT INTO object_types (code, name, direction_id, icon, description, is_active)
VALUES 
  ('BANK', 'Банк', NULL, 'bank', 'Банки-контрагенты', true),
  ('BANK_ACCOUNT', 'Банковский счет', NULL, 'wallet', 'Банковские счета организаций', true),
  ('SETTLEMENT_DOCUMENT', 'Документ расчетов', NULL, 'file-text', 'Счета/акты/накладные как объекты для взаиморасчетов', true)
ON CONFLICT (code) DO NOTHING;

-- ========== Активы (расширение) ==========
INSERT INTO object_types (code, name, direction_id, icon, description, is_active)
VALUES 
  ('INTANGIBLE_ASSET', 'Нематериальный актив (НМА)', NULL, 'file-protect', 'Нематериальные активы', true),
  ('CONSTRUCTION_OBJECT', 'Объект строительства / Капвложения', NULL, 'build', 'Объекты незавершенного строительства и капитальные вложения', true)
ON CONFLICT (code) DO NOTHING;

-- ========== Запасы и склад ==========
INSERT INTO object_types (code, name, direction_id, icon, description, is_active)
VALUES 
  ('ITEM', 'Номенклатура', NULL, 'shopping', 'Номенклатура товаров/услуг/материалов', true),
  ('ITEM_GROUP', 'Номенклатурная группа', NULL, 'folder', 'Группы номенклатуры', true),
  ('STORAGE_CELL', 'Ячейка / Место хранения', NULL, 'inbox', 'Места хранения на складах', true),
  ('BATCH', 'Партия', NULL, 'tags', 'Партии товаров', true),
  ('SERIES', 'Серия', NULL, 'barcode', 'Серии товаров', true),
  ('UOM', 'Единица измерения', NULL, 'ruler', 'Единицы измерения', true)
ON CONFLICT (code) DO NOTHING;

-- ========== Управленческий учет ==========
INSERT INTO object_types (code, name, direction_id, icon, description, is_active)
VALUES 
  ('ORDER', 'Заказ / Объект калькулирования', NULL, 'file-done', 'Заказы и объекты калькулирования затрат', true),
  ('COST_ITEM', 'Статья затрат', NULL, 'dollar', 'Статьи затрат для управленческого учета', true),
  ('CASHFLOW_ITEM', 'Статья ДДС', NULL, 'transaction', 'Статьи движения денежных средств', true),
  ('ACTIVITY_DIRECTION', 'Направление деятельности', NULL, 'compass', 'Направления бизнес-деятельности', true)
ON CONFLICT (code) DO NOTHING;

-- ========== Налоги и классификаторы ==========
INSERT INTO object_types (code, name, direction_id, icon, description, is_active)
VALUES 
  ('OKOF', 'ОКОФ', NULL, 'database', 'Общероссийский классификатор основных фондов', true),
  ('OKTMO', 'ОКТМО', NULL, 'global', 'Общероссийский классификатор территорий муниципальных образований', true),
  ('KBK', 'КБК', NULL, 'file-text', 'Коды бюджетной классификации', true),
  ('TAX_AUTHORITY', 'ИФНС', NULL, 'audit', 'Инспекции Федеральной налоговой службы', true),
  ('VAT_RATE', 'Ставка НДС', NULL, 'percentage', 'Ставки налога на добавленную стоимость', true),
  ('VAT_OPERATION_TYPE', 'Вид операции НДС', NULL, 'file-search', 'Виды операций для НДС', true)
ON CONFLICT (code) DO NOTHING;

-- Добавление базовых схем полей для новых типов объектов

-- ========== DEPARTMENT (Подразделение) ==========
DO $$
DECLARE
  dept_type_id UUID;
BEGIN
  SELECT id INTO dept_type_id FROM object_types WHERE code = 'DEPARTMENT';
  
  IF dept_type_id IS NOT NULL THEN
    INSERT INTO object_type_schemas (type_id, field_key, label, data_type, field_group, is_required, is_unique, display_order)
    VALUES
      (dept_type_id, 'code', 'Код подразделения', 'string', 'Основное', true, true, 1),
      (dept_type_id, 'name', 'Наименование', 'string', 'Основное', true, false, 2),
      (dept_type_id, 'organizationId', 'Организация', 'reference', 'Связи', true, false, 10),
      (dept_type_id, 'parentId', 'Родительское подразделение', 'reference', 'Структура', false, false, 11),
      (dept_type_id, 'head', 'Руководитель', 'reference', 'Управление', false, false, 20),
      (dept_type_id, 'address', 'Адрес', 'string', 'Основное', false, false, 3)
    ON CONFLICT (type_id, field_key) DO NOTHING;
  END IF;
END $$;

-- ========== COST_CENTER (МВЗ) ==========
DO $$
DECLARE
  cc_type_id UUID;
BEGIN
  SELECT id INTO cc_type_id FROM object_types WHERE code = 'COST_CENTER';
  
  IF cc_type_id IS NOT NULL THEN
    INSERT INTO object_type_schemas (type_id, field_key, label, data_type, field_group, is_required, is_unique, display_order)
    VALUES
      (cc_type_id, 'code', 'Код МВЗ', 'string', 'Основное', true, true, 1),
      (cc_type_id, 'name', 'Наименование', 'string', 'Основное', true, false, 2),
      (cc_type_id, 'organizationId', 'Организация', 'reference', 'Связи', true, false, 10),
      (cc_type_id, 'cfoId', 'ЦФО', 'reference', 'Связи', false, false, 11),
      (cc_type_id, 'departmentId', 'Подразделение', 'reference', 'Связи', false, false, 12)
    ON CONFLICT (type_id, field_key) DO NOTHING;
  END IF;
END $$;

-- ========== RESPONSIBLE_PERSON (МОЛ) ==========
DO $$
DECLARE
  rp_type_id UUID;
BEGIN
  SELECT id INTO rp_type_id FROM object_types WHERE code = 'RESPONSIBLE_PERSON';
  
  IF rp_type_id IS NOT NULL THEN
    INSERT INTO object_type_schemas (type_id, field_key, label, data_type, field_group, is_required, is_unique, display_order)
    VALUES
      (rp_type_id, 'code', 'Табельный номер', 'string', 'Основное', false, false, 1),
      (rp_type_id, 'name', 'ФИО', 'string', 'Основное', true, false, 2),
      (rp_type_id, 'organizationId', 'Организация', 'reference', 'Связи', true, false, 10),
      (rp_type_id, 'departmentId', 'Подразделение', 'reference', 'Связи', false, false, 11),
      (rp_type_id, 'position', 'Должность', 'string', 'Основное', false, false, 3),
      (rp_type_id, 'phone', 'Телефон', 'string', 'Контакты', false, false, 20),
      (rp_type_id, 'email', 'Email', 'string', 'Контакты', false, false, 21)
    ON CONFLICT (type_id, field_key) DO NOTHING;
  END IF;
END $$;

-- ========== BANK_ACCOUNT (Банковский счет) ==========
DO $$
DECLARE
  ba_type_id UUID;
BEGIN
  SELECT id INTO ba_type_id FROM object_types WHERE code = 'BANK_ACCOUNT';
  
  IF ba_type_id IS NOT NULL THEN
    INSERT INTO object_type_schemas (type_id, field_key, label, data_type, field_group, is_required, is_unique, display_order)
    VALUES
      (ba_type_id, 'code', 'Номер счета', 'string', 'Основное', true, true, 1),
      (ba_type_id, 'name', 'Наименование счета', 'string', 'Основное', true, false, 2),
      (ba_type_id, 'organizationId', 'Организация', 'reference', 'Связи', true, false, 10),
      (ba_type_id, 'bankId', 'Банк', 'reference', 'Связи', true, false, 11),
      (ba_type_id, 'currency', 'Валюта', 'enum', 'Основное', true, false, 3),
      (ba_type_id, 'accountType', 'Тип счета', 'enum', 'Основное', true, false, 4),
      (ba_type_id, 'isActive', 'Активен', 'boolean', 'Основное', true, false, 5)
    ON CONFLICT (type_id, field_key) DO NOTHING;

    UPDATE object_type_schemas SET enum_values = '["RUB", "USD", "EUR"]'::jsonb, default_value = '"RUB"'::jsonb
    WHERE type_id = ba_type_id AND field_key = 'currency';

    UPDATE object_type_schemas SET enum_values = '["current", "settlement", "deposit", "loan"]'::jsonb
    WHERE type_id = ba_type_id AND field_key = 'accountType';
  END IF;
END $$;

-- ========== COST_ITEM (Статья затрат) ==========
DO $$
DECLARE
  ci_type_id UUID;
BEGIN
  SELECT id INTO ci_type_id FROM object_types WHERE code = 'COST_ITEM';
  
  IF ci_type_id IS NOT NULL THEN
    INSERT INTO object_type_schemas (type_id, field_key, label, data_type, field_group, is_required, is_unique, display_order)
    VALUES
      (ci_type_id, 'code', 'Код статьи', 'string', 'Основное', true, true, 1),
      (ci_type_id, 'name', 'Наименование', 'string', 'Основное', true, false, 2),
      (ci_type_id, 'parentId', 'Родительская статья', 'reference', 'Структура', false, false, 10),
      (ci_type_id, 'costType', 'Тип затрат', 'enum', 'Классификация', true, false, 20),
      (ci_type_id, 'isDirect', 'Прямые затраты', 'boolean', 'Классификация', true, false, 21)
    ON CONFLICT (type_id, field_key) DO NOTHING;

    UPDATE object_type_schemas SET enum_values = '["direct", "indirect", "overhead", "administrative"]'::jsonb
    WHERE type_id = ci_type_id AND field_key = 'costType';
  END IF;
END $$;

-- ========== CASHFLOW_ITEM (Статья ДДС) ==========
DO $$
DECLARE
  cfi_type_id UUID;
BEGIN
  SELECT id INTO cfi_type_id FROM object_types WHERE code = 'CASHFLOW_ITEM';
  
  IF cfi_type_id IS NOT NULL THEN
    INSERT INTO object_type_schemas (type_id, field_key, label, data_type, field_group, is_required, is_unique, display_order)
    VALUES
      (cfi_type_id, 'code', 'Код статьи', 'string', 'Основное', true, true, 1),
      (cfi_type_id, 'name', 'Наименование', 'string', 'Основное', true, false, 2),
      (cfi_type_id, 'direction', 'Направление', 'enum', 'Классификация', true, false, 10),
      (cfi_type_id, 'category', 'Категория', 'enum', 'Классификация', true, false, 11)
    ON CONFLICT (type_id, field_key) DO NOTHING;

    UPDATE object_type_schemas SET enum_values = '["inflow", "outflow"]'::jsonb
    WHERE type_id = cfi_type_id AND field_key = 'direction';

    UPDATE object_type_schemas SET enum_values = '["operating", "investing", "financing"]'::jsonb
    WHERE type_id = cfi_type_id AND field_key = 'category';
  END IF;
END $$;

-- ========== OKOF (ОКОФ) ==========
DO $$
DECLARE
  okof_type_id UUID;
BEGIN
  SELECT id INTO okof_type_id FROM object_types WHERE code = 'OKOF';
  
  IF okof_type_id IS NOT NULL THEN
    INSERT INTO object_type_schemas (type_id, field_key, label, data_type, field_group, is_required, is_unique, display_order)
    VALUES
      (okof_type_id, 'code', 'Код ОКОФ', 'string', 'Основное', true, true, 1),
      (okof_type_id, 'name', 'Наименование', 'string', 'Основное', true, false, 2),
      (okof_type_id, 'depreciationGroup', 'Амортизационная группа', 'enum', 'Классификация', false, false, 10)
    ON CONFLICT (type_id, field_key) DO NOTHING;

    UPDATE object_type_schemas SET enum_values = '["1", "2", "3", "4", "5", "6", "7", "8", "9", "10"]'::jsonb
    WHERE type_id = okof_type_id AND field_key = 'depreciationGroup';
  END IF;
END $$;

-- ========== VAT_RATE (Ставка НДС) ==========
DO $$
DECLARE
  vat_type_id UUID;
BEGIN
  SELECT id INTO vat_type_id FROM object_types WHERE code = 'VAT_RATE';
  
  IF vat_type_id IS NOT NULL THEN
    INSERT INTO object_type_schemas (type_id, field_key, label, data_type, field_group, is_required, is_unique, display_order)
    VALUES
      (vat_type_id, 'code', 'Код ставки', 'string', 'Основное', true, true, 1),
      (vat_type_id, 'name', 'Наименование', 'string', 'Основное', true, false, 2),
      (vat_type_id, 'rate', 'Ставка, %', 'number', 'Основное', true, false, 3),
      (vat_type_id, 'isActive', 'Активна', 'boolean', 'Основное', true, false, 4)
    ON CONFLICT (type_id, field_key) DO NOTHING;
  END IF;
END $$;
