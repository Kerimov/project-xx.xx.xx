-- Аналитические признаки (схемы полей) по каждому типу объекта учета, у которых их ещё нет.
-- Типы с уже заданными схемами в 015/016: FIXED_ASSET, COUNTERPARTY, CONTRACT, PROJECT, CFO,
-- DEPARTMENT, COST_CENTER, RESPONSIBLE_PERSON, BANK_ACCOUNT, COST_ITEM, CASHFLOW_ITEM, OKOF, VAT_RATE.
-- Здесь добавляются схемы для: ORG, BANK, SETTLEMENT_DOCUMENT, INTANGIBLE_ASSET, CONSTRUCTION_OBJECT,
-- ITEM, ITEM_GROUP, STORAGE_CELL, BATCH, SERIES, UOM, ORDER, ACTIVITY_DIRECTION, OKTMO, KBK, TAX_AUTHORITY, VAT_OPERATION_TYPE.

-- ========== ORG (Организация) ==========
DO $$
DECLARE
  tid UUID;
BEGIN
  SELECT id INTO tid FROM object_types WHERE code = 'ORG';
  IF tid IS NOT NULL THEN
    INSERT INTO object_type_schemas (type_id, field_key, label, data_type, field_group, is_required, is_unique, display_order)
    VALUES
      (tid, 'code', 'Код организации', 'string', 'Основное', true, true, 1),
      (tid, 'name', 'Наименование', 'string', 'Основное', true, false, 2),
      (tid, 'inn', 'ИНН', 'string', 'Реквизиты', true, false, 10),
      (tid, 'kpp', 'КПП', 'string', 'Реквизиты', false, false, 11),
      (tid, 'ogrn', 'ОГРН', 'string', 'Реквизиты', false, false, 12),
      (tid, 'legalAddress', 'Юридический адрес', 'string', 'Адрес', false, false, 20),
      (tid, 'head', 'Руководитель (ФИО)', 'string', 'Управление', false, false, 30),
      (tid, 'description', 'Описание', 'string', 'Прочее', false, false, 40)
    ON CONFLICT (type_id, field_key) DO NOTHING;
  END IF;
END $$;

-- ========== BANK (Банк) ==========
DO $$
DECLARE
  tid UUID;
BEGIN
  SELECT id INTO tid FROM object_types WHERE code = 'BANK';
  IF tid IS NOT NULL THEN
    INSERT INTO object_type_schemas (type_id, field_key, label, data_type, field_group, is_required, is_unique, display_order)
    VALUES
      (tid, 'code', 'Код банка', 'string', 'Основное', true, true, 1),
      (tid, 'name', 'Наименование', 'string', 'Основное', true, false, 2),
      (tid, 'bik', 'БИК', 'string', 'Реквизиты', true, false, 10),
      (tid, 'swift', 'SWIFT', 'string', 'Реквизиты', false, false, 11),
      (tid, 'correspondentAccount', 'Корр. счёт', 'string', 'Реквизиты', false, false, 12),
      (tid, 'address', 'Адрес', 'string', 'Адрес', false, false, 20),
      (tid, 'description', 'Примечание', 'string', 'Прочее', false, false, 30)
    ON CONFLICT (type_id, field_key) DO NOTHING;
  END IF;
END $$;

-- ========== SETTLEMENT_DOCUMENT (Документ расчетов) ==========
DO $$
DECLARE
  tid UUID;
BEGIN
  SELECT id INTO tid FROM object_types WHERE code = 'SETTLEMENT_DOCUMENT';
  IF tid IS NOT NULL THEN
    INSERT INTO object_type_schemas (type_id, field_key, label, data_type, field_group, is_required, is_unique, display_order)
    VALUES
      (tid, 'code', 'Номер документа', 'string', 'Основное', true, false, 1),
      (tid, 'name', 'Наименование', 'string', 'Основное', true, false, 2),
      (tid, 'documentType', 'Вид документа', 'enum', 'Основное', true, false, 3),
      (tid, 'documentDate', 'Дата документа', 'date', 'Основное', true, false, 4),
      (tid, 'amount', 'Сумма', 'money', 'Суммы', true, false, 10),
      (tid, 'currency', 'Валюта', 'enum', 'Суммы', true, false, 11),
      (tid, 'counterpartyId', 'Контрагент', 'reference', 'Связи', false, false, 20),
      (tid, 'contractId', 'Договор', 'reference', 'Связи', false, false, 21),
      (tid, 'description', 'Комментарий', 'string', 'Прочее', false, false, 30)
    ON CONFLICT (type_id, field_key) DO NOTHING;
    UPDATE object_type_schemas SET enum_values = '["invoice", "act", "waybill", "other"]'::jsonb
    WHERE type_id = tid AND field_key = 'documentType';
    UPDATE object_type_schemas SET enum_values = '["RUB", "USD", "EUR"]'::jsonb, default_value = '"RUB"'::jsonb
    WHERE type_id = tid AND field_key = 'currency';
  END IF;
END $$;

-- ========== INTANGIBLE_ASSET (НМА) ==========
DO $$
DECLARE
  tid UUID;
BEGIN
  SELECT id INTO tid FROM object_types WHERE code = 'INTANGIBLE_ASSET';
  IF tid IS NOT NULL THEN
    INSERT INTO object_type_schemas (type_id, field_key, label, data_type, field_group, is_required, is_unique, display_order)
    VALUES
      (tid, 'code', 'Инвентарный номер', 'string', 'Основное', true, true, 1),
      (tid, 'name', 'Наименование', 'string', 'Основное', true, false, 2),
      (tid, 'assetType', 'Вид НМА', 'enum', 'Классификация', true, false, 10),
      (tid, 'initialCost', 'Первоначальная стоимость', 'money', 'Финансы', true, false, 20),
      (tid, 'usefulLifeMonths', 'СПИ, мес.', 'number', 'Амортизация', true, false, 21),
      (tid, 'amortMethod', 'Метод амортизации', 'enum', 'Амортизация', true, false, 22),
      (tid, 'acceptanceDate', 'Дата принятия к учёту', 'date', 'Учёт', true, false, 30),
      (tid, 'description', 'Описание', 'string', 'Прочее', false, false, 40)
    ON CONFLICT (type_id, field_key) DO NOTHING;
    UPDATE object_type_schemas SET enum_values = '["software", "license", "patent", "trademark", "goodwill", "other"]'::jsonb
    WHERE type_id = tid AND field_key = 'assetType';
    UPDATE object_type_schemas SET enum_values = '["linear", "nonlinear"]'::jsonb
    WHERE type_id = tid AND field_key = 'amortMethod';
  END IF;
END $$;

-- ========== CONSTRUCTION_OBJECT (Объект строительства) ==========
DO $$
DECLARE
  tid UUID;
BEGIN
  SELECT id INTO tid FROM object_types WHERE code = 'CONSTRUCTION_OBJECT';
  IF tid IS NOT NULL THEN
    INSERT INTO object_type_schemas (type_id, field_key, label, data_type, field_group, is_required, is_unique, display_order)
    VALUES
      (tid, 'code', 'Инвентарный номер', 'string', 'Основное', true, true, 1),
      (tid, 'name', 'Наименование', 'string', 'Основное', true, false, 2),
      (tid, 'startDate', 'Дата начала', 'date', 'Период', false, false, 10),
      (tid, 'plannedEndDate', 'Плановая дата окончания', 'date', 'Период', false, false, 11),
      (tid, 'estimatedCost', 'Сметная стоимость', 'money', 'Финансы', false, false, 20),
      (tid, 'customerId', 'Заказчик', 'reference', 'Связи', false, false, 30),
      (tid, 'contractorId', 'Подрядчик', 'reference', 'Связи', false, false, 31),
      (tid, 'description', 'Описание', 'string', 'Прочее', false, false, 40)
    ON CONFLICT (type_id, field_key) DO NOTHING;
  END IF;
END $$;

-- ========== ITEM (Номенклатура) ==========
DO $$
DECLARE
  tid UUID;
BEGIN
  SELECT id INTO tid FROM object_types WHERE code = 'ITEM';
  IF tid IS NOT NULL THEN
    INSERT INTO object_type_schemas (type_id, field_key, label, data_type, field_group, is_required, is_unique, display_order)
    VALUES
      (tid, 'code', 'Код номенклатуры', 'string', 'Основное', true, true, 1),
      (tid, 'name', 'Наименование', 'string', 'Основное', true, false, 2),
      (tid, 'itemKind', 'Вид номенклатуры', 'enum', 'Классификация', true, false, 10),
      (tid, 'itemGroupId', 'Номенклатурная группа', 'reference', 'Связи', false, false, 11),
      (tid, 'uomId', 'Единица измерения', 'reference', 'Основное', true, false, 3),
      (tid, 'description', 'Описание', 'string', 'Прочее', false, false, 20)
    ON CONFLICT (type_id, field_key) DO NOTHING;
    UPDATE object_type_schemas SET enum_values = '["product", "service", "material", "semi_finished", "other"]'::jsonb
    WHERE type_id = tid AND field_key = 'itemKind';
  END IF;
END $$;

-- ========== ITEM_GROUP (Номенклатурная группа) ==========
DO $$
DECLARE
  tid UUID;
BEGIN
  SELECT id INTO tid FROM object_types WHERE code = 'ITEM_GROUP';
  IF tid IS NOT NULL THEN
    INSERT INTO object_type_schemas (type_id, field_key, label, data_type, field_group, is_required, is_unique, display_order)
    VALUES
      (tid, 'code', 'Код группы', 'string', 'Основное', true, true, 1),
      (tid, 'name', 'Наименование', 'string', 'Основное', true, false, 2),
      (tid, 'parentId', 'Родительская группа', 'reference', 'Структура', false, false, 10),
      (tid, 'description', 'Описание', 'string', 'Прочее', false, false, 20)
    ON CONFLICT (type_id, field_key) DO NOTHING;
  END IF;
END $$;

-- ========== STORAGE_CELL (Ячейка хранения) ==========
DO $$
DECLARE
  tid UUID;
BEGIN
  SELECT id INTO tid FROM object_types WHERE code = 'STORAGE_CELL';
  IF tid IS NOT NULL THEN
    INSERT INTO object_type_schemas (type_id, field_key, label, data_type, field_group, is_required, is_unique, display_order)
    VALUES
      (tid, 'code', 'Код ячейки', 'string', 'Основное', true, true, 1),
      (tid, 'name', 'Наименование', 'string', 'Основное', true, false, 2),
      (tid, 'warehouseId', 'Склад', 'string', 'Связи', false, false, 10),
      (tid, 'zone', 'Зона', 'string', 'Размещение', false, false, 11),
      (tid, 'tier', 'Ярус', 'number', 'Размещение', false, false, 12),
      (tid, 'description', 'Описание', 'string', 'Прочее', false, false, 20)
    ON CONFLICT (type_id, field_key) DO NOTHING;
  END IF;
END $$;

-- ========== BATCH (Партия) ==========
DO $$
DECLARE
  tid UUID;
BEGIN
  SELECT id INTO tid FROM object_types WHERE code = 'BATCH';
  IF tid IS NOT NULL THEN
    INSERT INTO object_type_schemas (type_id, field_key, label, data_type, field_group, is_required, is_unique, display_order)
    VALUES
      (tid, 'code', 'Номер партии', 'string', 'Основное', true, true, 1),
      (tid, 'name', 'Наименование', 'string', 'Основное', true, false, 2),
      (tid, 'itemId', 'Номенклатура', 'reference', 'Связи', false, false, 10),
      (tid, 'receiptDate', 'Дата поступления', 'date', 'Период', false, false, 11),
      (tid, 'expiryDate', 'Срок годности', 'date', 'Период', false, false, 12),
      (tid, 'description', 'Описание', 'string', 'Прочее', false, false, 20)
    ON CONFLICT (type_id, field_key) DO NOTHING;
  END IF;
END $$;

-- ========== SERIES (Серия) ==========
DO $$
DECLARE
  tid UUID;
BEGIN
  SELECT id INTO tid FROM object_types WHERE code = 'SERIES';
  IF tid IS NOT NULL THEN
    INSERT INTO object_type_schemas (type_id, field_key, label, data_type, field_group, is_required, is_unique, display_order)
    VALUES
      (tid, 'code', 'Код серии', 'string', 'Основное', true, true, 1),
      (tid, 'name', 'Наименование', 'string', 'Основное', true, false, 2),
      (tid, 'itemId', 'Номенклатура', 'reference', 'Связи', false, false, 10),
      (tid, 'productionDate', 'Дата выпуска', 'date', 'Период', false, false, 11),
      (tid, 'description', 'Описание', 'string', 'Прочее', false, false, 20)
    ON CONFLICT (type_id, field_key) DO NOTHING;
  END IF;
END $$;

-- ========== UOM (Единица измерения) ==========
DO $$
DECLARE
  tid UUID;
BEGIN
  SELECT id INTO tid FROM object_types WHERE code = 'UOM';
  IF tid IS NOT NULL THEN
    INSERT INTO object_type_schemas (type_id, field_key, label, data_type, field_group, is_required, is_unique, display_order)
    VALUES
      (tid, 'code', 'Код ОКЕИ', 'string', 'Основное', true, true, 1),
      (tid, 'name', 'Наименование', 'string', 'Основное', true, false, 2),
      (tid, 'shortName', 'Сокращение', 'string', 'Основное', false, false, 3),
      (tid, 'uomType', 'Тип', 'enum', 'Классификация', false, false, 10),
      (tid, 'description', 'Описание', 'string', 'Прочее', false, false, 20)
    ON CONFLICT (type_id, field_key) DO NOTHING;
    UPDATE object_type_schemas SET enum_values = '["piece", "weight", "length", "volume", "area", "other"]'::jsonb
    WHERE type_id = tid AND field_key = 'uomType';
  END IF;
END $$;

-- ========== ORDER (Заказ) ==========
DO $$
DECLARE
  tid UUID;
BEGIN
  SELECT id INTO tid FROM object_types WHERE code = 'ORDER';
  IF tid IS NOT NULL THEN
    INSERT INTO object_type_schemas (type_id, field_key, label, data_type, field_group, is_required, is_unique, display_order)
    VALUES
      (tid, 'code', 'Номер заказа', 'string', 'Основное', true, true, 1),
      (tid, 'name', 'Наименование', 'string', 'Основное', true, false, 2),
      (tid, 'orderDate', 'Дата заказа', 'date', 'Основное', true, false, 3),
      (tid, 'status', 'Статус', 'enum', 'Статус', true, false, 10),
      (tid, 'amount', 'Сумма', 'money', 'Финансы', false, false, 20),
      (tid, 'currency', 'Валюта', 'enum', 'Финансы', false, false, 21),
      (tid, 'counterpartyId', 'Контрагент', 'reference', 'Связи', false, false, 30),
      (tid, 'manager', 'Менеджер', 'string', 'Управление', false, false, 31),
      (tid, 'description', 'Комментарий', 'string', 'Прочее', false, false, 40)
    ON CONFLICT (type_id, field_key) DO NOTHING;
    UPDATE object_type_schemas SET enum_values = '["draft", "confirmed", "in_progress", "completed", "cancelled"]'::jsonb
    WHERE type_id = tid AND field_key = 'status';
    UPDATE object_type_schemas SET enum_values = '["RUB", "USD", "EUR"]'::jsonb, default_value = '"RUB"'::jsonb
    WHERE type_id = tid AND field_key = 'currency';
  END IF;
END $$;

-- ========== ACTIVITY_DIRECTION (Направление деятельности) ==========
DO $$
DECLARE
  tid UUID;
BEGIN
  SELECT id INTO tid FROM object_types WHERE code = 'ACTIVITY_DIRECTION';
  IF tid IS NOT NULL THEN
    INSERT INTO object_type_schemas (type_id, field_key, label, data_type, field_group, is_required, is_unique, display_order)
    VALUES
      (tid, 'code', 'Код направления', 'string', 'Основное', true, true, 1),
      (tid, 'name', 'Наименование', 'string', 'Основное', true, false, 2),
      (tid, 'parentId', 'Родительское направление', 'reference', 'Структура', false, false, 10),
      (tid, 'description', 'Описание', 'string', 'Прочее', false, false, 20)
    ON CONFLICT (type_id, field_key) DO NOTHING;
  END IF;
END $$;

-- ========== OKTMO ==========
DO $$
DECLARE
  tid UUID;
BEGIN
  SELECT id INTO tid FROM object_types WHERE code = 'OKTMO';
  IF tid IS NOT NULL THEN
    INSERT INTO object_type_schemas (type_id, field_key, label, data_type, field_group, is_required, is_unique, display_order)
    VALUES
      (tid, 'code', 'Код ОКТМО', 'string', 'Основное', true, true, 1),
      (tid, 'name', 'Наименование', 'string', 'Основное', true, false, 2),
      (tid, 'region', 'Регион', 'string', 'Классификация', false, false, 10),
      (tid, 'description', 'Описание', 'string', 'Прочее', false, false, 20)
    ON CONFLICT (type_id, field_key) DO NOTHING;
  END IF;
END $$;

-- ========== KBK ==========
DO $$
DECLARE
  tid UUID;
BEGIN
  SELECT id INTO tid FROM object_types WHERE code = 'KBK';
  IF tid IS NOT NULL THEN
    INSERT INTO object_type_schemas (type_id, field_key, label, data_type, field_group, is_required, is_unique, display_order)
    VALUES
      (tid, 'code', 'Код КБК', 'string', 'Основное', true, true, 1),
      (tid, 'name', 'Наименование', 'string', 'Основное', true, false, 2),
      (tid, 'kbkType', 'Вид', 'enum', 'Классификация', false, false, 10),
      (tid, 'description', 'Описание', 'string', 'Прочее', false, false, 20)
    ON CONFLICT (type_id, field_key) DO NOTHING;
    UPDATE object_type_schemas SET enum_values = '["income", "expense", "source"]'::jsonb
    WHERE type_id = tid AND field_key = 'kbkType';
  END IF;
END $$;

-- ========== TAX_AUTHORITY (ИФНС) ==========
DO $$
DECLARE
  tid UUID;
BEGIN
  SELECT id INTO tid FROM object_types WHERE code = 'TAX_AUTHORITY';
  IF tid IS NOT NULL THEN
    INSERT INTO object_type_schemas (type_id, field_key, label, data_type, field_group, is_required, is_unique, display_order)
    VALUES
      (tid, 'code', 'Код ИФНС', 'string', 'Основное', true, true, 1),
      (tid, 'name', 'Наименование', 'string', 'Основное', true, false, 2),
      (tid, 'address', 'Адрес', 'string', 'Адрес', false, false, 10),
      (tid, 'region', 'Регион', 'string', 'Классификация', false, false, 11),
      (tid, 'description', 'Примечание', 'string', 'Прочее', false, false, 20)
    ON CONFLICT (type_id, field_key) DO NOTHING;
  END IF;
END $$;

-- ========== VAT_OPERATION_TYPE (Вид операции НДС) ==========
DO $$
DECLARE
  tid UUID;
BEGIN
  SELECT id INTO tid FROM object_types WHERE code = 'VAT_OPERATION_TYPE';
  IF tid IS NOT NULL THEN
    INSERT INTO object_type_schemas (type_id, field_key, label, data_type, field_group, is_required, is_unique, display_order)
    VALUES
      (tid, 'code', 'Код вида операции', 'string', 'Основное', true, true, 1),
      (tid, 'name', 'Наименование', 'string', 'Основное', true, false, 2),
      (tid, 'vatTreatment', 'Признак НДС', 'enum', 'Классификация', true, false, 10),
      (tid, 'description', 'Описание', 'string', 'Прочее', false, false, 20)
    ON CONFLICT (type_id, field_key) DO NOTHING;
    UPDATE object_type_schemas SET enum_values = '["taxable", "exempt", "zero_rated", "not_applicable"]'::jsonb
    WHERE type_id = tid AND field_key = 'vatTreatment';
  END IF;
END $$;
