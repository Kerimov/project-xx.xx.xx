-- Предзаполнение типов объектов учета и их схем полей
-- На основе ТЗ: FIXED_ASSET, COUNTERPARTY, CONTRACT, PROJECT, CFO

-- ========== FIXED_ASSET (Основное средство) ==========
INSERT INTO object_types (code, name, direction_id, icon, description, is_active)
VALUES ('FIXED_ASSET', 'Основное средство', NULL, 'build', 'Инвентарные объекты основных средств (ОС)', true)
ON CONFLICT (code) DO NOTHING;

-- Схема полей для FIXED_ASSET
DO $$
DECLARE
  fixed_asset_type_id UUID;
BEGIN
  SELECT id INTO fixed_asset_type_id FROM object_types WHERE code = 'FIXED_ASSET';
  
  IF fixed_asset_type_id IS NOT NULL THEN
    -- Основное
    INSERT INTO object_type_schemas (type_id, field_key, label, data_type, field_group, is_required, is_unique, display_order)
    VALUES
      (fixed_asset_type_id, 'code', 'Инвентарный номер', 'string', 'Основное', true, true, 1),
      (fixed_asset_type_id, 'name', 'Наименование', 'string', 'Основное', true, false, 2)
    ON CONFLICT (type_id, field_key) DO NOTHING;

    -- Идентификация
    INSERT INTO object_type_schemas (type_id, field_key, label, data_type, field_group, is_required, validation_rules, display_order)
    VALUES
      (fixed_asset_type_id, 'vin', 'VIN/Заводской номер', 'string', 'Идентификация', false, '{"pattern": "^[A-HJ-NPR-Z0-9]{17}$", "maxLength": 17}'::jsonb, 10),
      (fixed_asset_type_id, 'inventoryCardNumber', 'Инвентарная карточка (ОС-6)', 'string', 'Идентификация', false, '{}'::jsonb, 11),
      (fixed_asset_type_id, 'okofCode', 'ОКОФ код', 'string', 'Идентификация', false, '{}'::jsonb, 12),
      (fixed_asset_type_id, 'depreciationGroup', 'Амортизационная группа', 'enum', 'Идентификация', true, '{}'::jsonb, 13)
    ON CONFLICT (type_id, field_key) DO NOTHING;

    UPDATE object_type_schemas SET enum_values = '["1", "2", "3", "4", "5", "6", "7", "8", "9", "10"]'::jsonb
    WHERE type_id = fixed_asset_type_id AND field_key = 'depreciationGroup';

    -- Финансы (БУ)
    INSERT INTO object_type_schemas (type_id, field_key, label, data_type, field_group, is_required, display_order)
    VALUES
      (fixed_asset_type_id, 'initialCost', 'Первоначальная стоимость', 'money', 'Финансы (БУ)', true, 20),
      (fixed_asset_type_id, 'vatRate', 'Ставка НДС', 'enum', 'Финансы (БУ)', false, 21),
      (fixed_asset_type_id, 'vatAmount', 'Сумма НДС', 'money', 'Финансы (БУ)', false, 22),
      (fixed_asset_type_id, 'amortBaseCost', 'Стоимость для амортизации', 'money', 'Финансы (БУ)', false, 23)
    ON CONFLICT (type_id, field_key) DO NOTHING;

    UPDATE object_type_schemas SET enum_values = '["0", "10", "20"]'::jsonb
    WHERE type_id = fixed_asset_type_id AND field_key = 'vatRate';

    -- Амортизация
    INSERT INTO object_type_schemas (type_id, field_key, label, data_type, field_group, is_required, display_order)
    VALUES
      (fixed_asset_type_id, 'amortMethodBU', 'Метод амортизации (БУ)', 'enum', 'Амортизация', true, 30),
      (fixed_asset_type_id, 'usefulLifeMonthsBU', 'СПИ (БУ), мес.', 'number', 'Амортизация', true, 31),
      (fixed_asset_type_id, 'monthlyAmortBU', 'Амортизация/мес (БУ)', 'money', 'Амортизация', false, 32)
    ON CONFLICT (type_id, field_key) DO NOTHING;

    UPDATE object_type_schemas SET enum_values = '["linear", "nonlinear", "other"]'::jsonb
    WHERE type_id = fixed_asset_type_id AND field_key = 'amortMethodBU';

    -- Эксплуатация
    INSERT INTO object_type_schemas (type_id, field_key, label, data_type, field_group, is_required, reference_type_id, display_order)
    VALUES
      (fixed_asset_type_id, 'putIntoUseDate', 'Дата ввода в эксплуатацию', 'date', 'Эксплуатация', true, NULL, 40),
      (fixed_asset_type_id, 'condition', 'Состояние', 'enum', 'Эксплуатация', true, NULL, 41),
      (fixed_asset_type_id, 'location', 'Место эксплуатации', 'string', 'Эксплуатация', false, NULL, 42),
      (fixed_asset_type_id, 'departmentId', 'Подразделение', 'string', 'Эксплуатация', false, NULL, 43),
      (fixed_asset_type_id, 'molId', 'МОЛ', 'string', 'Эксплуатация', false, NULL, 44)
    ON CONFLICT (type_id, field_key) DO NOTHING;

    UPDATE object_type_schemas SET enum_values = '["good", "needs_repair", "conservation", "written_off"]'::jsonb
    WHERE type_id = fixed_asset_type_id AND field_key = 'condition';

    -- Управленческая
    INSERT INTO object_type_schemas (type_id, field_key, label, data_type, field_group, is_required, reference_type_id, display_order)
    VALUES
      (fixed_asset_type_id, 'cfoId', 'ЦФО', 'reference', 'Управленческая', true, NULL, 50),
      (fixed_asset_type_id, 'costItemId', 'Статья затрат', 'reference', 'Управленческая', false, NULL, 51)
    ON CONFLICT (type_id, field_key) DO NOTHING;
  END IF;
END $$;

-- ========== COUNTERPARTY (Контрагент) ==========
INSERT INTO object_types (code, name, direction_id, icon, description, is_active)
VALUES ('COUNTERPARTY', 'Контрагент', NULL, 'team', 'Контрагенты (поставщики, покупатели, прочие)', true)
ON CONFLICT (code) DO NOTHING;

DO $$
DECLARE
  counterparty_type_id UUID;
BEGIN
  SELECT id INTO counterparty_type_id FROM object_types WHERE code = 'COUNTERPARTY';
  
  IF counterparty_type_id IS NOT NULL THEN
    INSERT INTO object_type_schemas (type_id, field_key, label, data_type, field_group, is_required, is_unique, display_order)
    VALUES
      (counterparty_type_id, 'code', 'Код/UUID внешний', 'string', 'Основное', false, false, 1),
      (counterparty_type_id, 'name', 'Наименование', 'string', 'Основное', true, false, 2),
      (counterparty_type_id, 'inn', 'ИНН', 'string', 'Реквизиты', true, false, 3),
      (counterparty_type_id, 'kpp', 'КПП', 'string', 'Реквизиты', false, false, 4),
      (counterparty_type_id, 'ogrn', 'ОГРН/ОГРНИП', 'string', 'Реквизиты', false, false, 5),
      (counterparty_type_id, 'counterpartyType', 'Тип', 'enum', 'Тип', true, false, 10),
      (counterparty_type_id, 'legalAddress', 'Юр. адрес', 'json', 'Адреса', false, false, 20),
      (counterparty_type_id, 'actualAddress', 'Факт. адрес', 'json', 'Адреса', false, false, 21),
      (counterparty_type_id, 'contacts', 'Контакты', 'json', 'Контакты', false, false, 30),
      (counterparty_type_id, 'defaultContractId', 'Договор по умолчанию', 'string', 'Расчеты', false, NULL, 40)
    ON CONFLICT (type_id, field_key) DO NOTHING;

    UPDATE object_type_schemas SET enum_values = '["legal_entity", "individual_entrepreneur", "individual", "non_resident"]'::jsonb
    WHERE type_id = counterparty_type_id AND field_key = 'counterpartyType';
  END IF;
END $$;

-- ========== CONTRACT (Договор) ==========
INSERT INTO object_types (code, name, direction_id, icon, description, is_active)
VALUES ('CONTRACT', 'Договор', NULL, 'file-text', 'Договоры с контрагентами', true)
ON CONFLICT (code) DO NOTHING;

DO $$
DECLARE
  contract_type_id UUID;
BEGIN
  SELECT id INTO contract_type_id FROM object_types WHERE code = 'CONTRACT';
  
  IF contract_type_id IS NOT NULL THEN
    INSERT INTO object_type_schemas (type_id, field_key, label, data_type, field_group, is_required, is_unique, reference_type_id, display_order)
    VALUES
      (contract_type_id, 'number', 'Номер договора', 'string', 'Основное', true, false, NULL, 1),
      (contract_type_id, 'date', 'Дата договора', 'date', 'Основное', true, false, NULL, 2),
      (contract_type_id, 'name', 'Наименование/предмет', 'string', 'Основное', true, false, NULL, 3),
      (contract_type_id, 'counterpartyId', 'Контрагент', 'reference', 'Связи', true, false, NULL, 10),
      (contract_type_id, 'organizationId', 'Организация', 'reference', 'Связи', true, false, NULL, 11),
      (contract_type_id, 'contractType', 'Вид договора', 'enum', 'Условия', true, false, NULL, 20),
      (contract_type_id, 'currency', 'Валюта', 'enum', 'Условия', true, false, NULL, 21),
      (contract_type_id, 'paymentTerms', 'Условия оплаты', 'string', 'Условия', false, false, NULL, 22),
      (contract_type_id, 'validFrom', 'Действует с', 'date', 'Условия', false, false, NULL, 23),
      (contract_type_id, 'validTo', 'Действует по', 'date', 'Условия', false, false, NULL, 24),
      (contract_type_id, 'vatIncluded', 'НДС включен в цену', 'boolean', 'Учет', false, false, NULL, 30)
    ON CONFLICT (type_id, field_key) DO NOTHING;

    UPDATE object_type_schemas SET enum_values = '["supply", "services", "rent", "loan", "other"]'::jsonb
    WHERE type_id = contract_type_id AND field_key = 'contractType';

    UPDATE object_type_schemas SET enum_values = '["RUB", "USD", "EUR"]'::jsonb, default_value = '"RUB"'::jsonb
    WHERE type_id = contract_type_id AND field_key = 'currency';
  END IF;
END $$;

-- ========== PROJECT (Проект) ==========
INSERT INTO object_types (code, name, direction_id, icon, description, is_active)
VALUES ('PROJECT', 'Проект', NULL, 'project', 'Проекты для управленческого учета', true)
ON CONFLICT (code) DO NOTHING;

DO $$
DECLARE
  project_type_id UUID;
BEGIN
  SELECT id INTO project_type_id FROM object_types WHERE code = 'PROJECT';
  
  IF project_type_id IS NOT NULL THEN
    INSERT INTO object_type_schemas (type_id, field_key, label, data_type, field_group, is_required, is_unique, reference_type_id, display_order)
    VALUES
      (project_type_id, 'code', 'Код проекта', 'string', 'Основное', true, true, NULL, 1),
      (project_type_id, 'name', 'Наименование', 'string', 'Основное', true, false, NULL, 2),
      (project_type_id, 'ownerCfoId', 'ЦФО-владелец', 'string', 'Управление', true, false, NULL, 10),
      (project_type_id, 'manager', 'Руководитель проекта', 'string', 'Управление', false, false, NULL, 11),
      (project_type_id, 'startDate', 'Дата начала', 'date', 'Период', false, false, NULL, 20),
      (project_type_id, 'endDate', 'Дата окончания', 'date', 'Период', false, false, NULL, 21),
      (project_type_id, 'status', 'Статус', 'enum', 'Статус', true, false, NULL, 30)
    ON CONFLICT (type_id, field_key) DO NOTHING;

    UPDATE object_type_schemas SET enum_values = '["planned", "in_progress", "closed"]'::jsonb, default_value = '"planned"'::jsonb
    WHERE type_id = project_type_id AND field_key = 'status';
  END IF;
END $$;

-- ========== CFO (ЦФО) ==========
INSERT INTO object_types (code, name, direction_id, icon, description, is_active)
VALUES ('CFO', 'ЦФО', NULL, 'apartment', 'Центр финансовой ответственности', true)
ON CONFLICT (code) DO NOTHING;

DO $$
DECLARE
  cfo_type_id UUID;
BEGIN
  SELECT id INTO cfo_type_id FROM object_types WHERE code = 'CFO';
  
  IF cfo_type_id IS NOT NULL THEN
    INSERT INTO object_type_schemas (type_id, field_key, label, data_type, field_group, is_required, is_unique, reference_type_id, display_order)
    VALUES
      (cfo_type_id, 'code', 'Код ЦФО', 'string', 'Основное', true, true, NULL, 1),
      (cfo_type_id, 'name', 'Наименование', 'string', 'Основное', true, false, NULL, 2),
      (cfo_type_id, 'parentId', 'Родительский ЦФО', 'string', 'Структура', false, false, NULL, 10),
      (cfo_type_id, 'organizationId', 'Организация', 'string', 'Структура', true, false, NULL, 11),
      (cfo_type_id, 'head', 'Руководитель', 'string', 'Управление', false, false, NULL, 20)
    ON CONFLICT (type_id, field_key) DO NOTHING;
  END IF;
END $$;
