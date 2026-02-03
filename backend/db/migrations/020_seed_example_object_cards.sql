-- Примеры карточек объектов учета по каждому типу (для демонстрации и тестов).
-- Используется ON CONFLICT (type_id, code) DO NOTHING, чтобы не дублировать при повторном запуске.

-- FIXED_ASSET: пример уже создаётся в 017_example_fixed_asset.sql (код 0005), пропускаем или добавляем второй
INSERT INTO object_cards (type_id, code, name, status, attrs)
SELECT id, '0006', 'Ноутбук Dell Latitude для бухгалтерии', 'Active', '{"vin": null, "inventoryCardNumber": "ОС-6", "okofCode": "320.26.20.11", "depreciationGroup": "2", "initialCost": 85000, "vatRate": "20", "vatAmount": 14167, "amortBaseCost": 70833, "amortMethodBU": "linear", "usefulLifeMonthsBU": 36, "monthlyAmortBU": 1968, "putIntoUseDate": "2024-06-01", "condition": "good", "location": "Бухгалтерия"}'::jsonb
FROM object_types WHERE code = 'FIXED_ASSET'
ON CONFLICT (type_id, code) DO NOTHING;

-- COUNTERPARTY
INSERT INTO object_cards (type_id, code, name, status, attrs)
SELECT id, 'CP-EX-01', 'Пример: ООО Ромашка', 'Active', '{"inn": "7707123456", "kpp": "770701001", "counterpartyType": "legal"}'::jsonb
FROM object_types WHERE code = 'COUNTERPARTY'
ON CONFLICT (type_id, code) DO NOTHING;

-- CONTRACT
INSERT INTO object_cards (type_id, code, name, status, attrs)
SELECT id, 'CTR-EX-01', 'Пример: Договор поставки №12/2024', 'Active', '{"number": "12/2024", "date": "2024-01-15", "contractType": "supply", "currency": "RUB", "paymentTerms": "30 дней", "validFrom": "2024-01-15", "validTo": "2025-01-14", "vatIncluded": true}'::jsonb
FROM object_types WHERE code = 'CONTRACT'
ON CONFLICT (type_id, code) DO NOTHING;

-- PROJECT
INSERT INTO object_cards (type_id, code, name, status, attrs)
SELECT id, 'PRJ-EX-01', 'Пример: Проект Внедрение 1С', 'Active', '{"ownerCfoId": null, "manager": "Петров И.И.", "startDate": "2024-01-01", "endDate": "2024-12-31", "status": "in_progress"}'::jsonb
FROM object_types WHERE code = 'PROJECT'
ON CONFLICT (type_id, code) DO NOTHING;

-- CFO
INSERT INTO object_cards (type_id, code, name, status, attrs)
SELECT id, 'CFO-EX-01', 'Пример: Отдел продаж (Москва)', 'Active', '{"parentId": null, "organizationId": null, "head": "Сидорова М.П."}'::jsonb
FROM object_types WHERE code = 'CFO'
ON CONFLICT (type_id, code) DO NOTHING;

-- DEPARTMENT
INSERT INTO object_cards (type_id, code, name, status, attrs)
SELECT id, 'DEPT-EX-01', 'Пример: Отдел продаж', 'Active', '{}'::jsonb
FROM object_types WHERE code = 'DEPARTMENT'
ON CONFLICT (type_id, code) DO NOTHING;

-- COST_CENTER
INSERT INTO object_cards (type_id, code, name, status, attrs)
SELECT id, 'CC-EX-01', 'Пример: МВЗ Продажи регион Москва', 'Active', '{}'::jsonb
FROM object_types WHERE code = 'COST_CENTER'
ON CONFLICT (type_id, code) DO NOTHING;

-- RESPONSIBLE_PERSON (МОЛ)
INSERT INTO object_cards (type_id, code, name, status, attrs)
SELECT id, 'MOL-EX-01', 'Пример: Петров Иван Иванович', 'Active', '{"position": "Менеджер по продажам"}'::jsonb
FROM object_types WHERE code = 'RESPONSIBLE_PERSON'
ON CONFLICT (type_id, code) DO NOTHING;

-- BANK
INSERT INTO object_cards (type_id, code, name, status, attrs)
SELECT id, 'BANK-EX-01', 'Пример: ПАО Сбербанк', 'Active', '{}'::jsonb
FROM object_types WHERE code = 'BANK'
ON CONFLICT (type_id, code) DO NOTHING;

-- BANK_ACCOUNT
INSERT INTO object_cards (type_id, code, name, status, attrs)
SELECT id, 'BA-EX-01', 'Пример: Р/с 40702810000000000001', 'Active', '{}'::jsonb
FROM object_types WHERE code = 'BANK_ACCOUNT'
ON CONFLICT (type_id, code) DO NOTHING;

-- ITEM (Номенклатура)
INSERT INTO object_cards (type_id, code, name, status, attrs)
SELECT id, 'ITEM-EX-01', 'Пример: Товар Канцтовары блок А4', 'Active', '{}'::jsonb
FROM object_types WHERE code = 'ITEM'
ON CONFLICT (type_id, code) DO NOTHING;

-- ITEM_GROUP
INSERT INTO object_cards (type_id, code, name, status, attrs)
SELECT id, 'IG-EX-01', 'Пример: Канцтовары', 'Active', '{}'::jsonb
FROM object_types WHERE code = 'ITEM_GROUP'
ON CONFLICT (type_id, code) DO NOTHING;

-- ORDER (Заказ)
INSERT INTO object_cards (type_id, code, name, status, attrs)
SELECT id, 'ORD-EX-01', 'Пример: Заказ на поставку №100', 'Active', '{}'::jsonb
FROM object_types WHERE code = 'ORDER'
ON CONFLICT (type_id, code) DO NOTHING;

-- COST_ITEM (Статья затрат)
INSERT INTO object_cards (type_id, code, name, status, attrs)
SELECT id, 'COST-EX-01', 'Пример: Зарплата', 'Active', '{}'::jsonb
FROM object_types WHERE code = 'COST_ITEM'
ON CONFLICT (type_id, code) DO NOTHING;

-- CASHFLOW_ITEM (Статья ДДС)
INSERT INTO object_cards (type_id, code, name, status, attrs)
SELECT id, 'CF-EX-01', 'Пример: Поступление от покупателей', 'Active', '{}'::jsonb
FROM object_types WHERE code = 'CASHFLOW_ITEM'
ON CONFLICT (type_id, code) DO NOTHING;

-- UOM (Единица измерения)
INSERT INTO object_cards (type_id, code, name, status, attrs)
SELECT id, 'UOM-EX-01', 'Пример: шт (штука)', 'Active', '{}'::jsonb
FROM object_types WHERE code = 'UOM'
ON CONFLICT (type_id, code) DO NOTHING;

-- INTANGIBLE_ASSET (НМА)
INSERT INTO object_cards (type_id, code, name, status, attrs)
SELECT id, 'NMA-EX-01', 'Пример: Программа 1С:Бухгалтерия', 'Active', '{}'::jsonb
FROM object_types WHERE code = 'INTANGIBLE_ASSET'
ON CONFLICT (type_id, code) DO NOTHING;

-- CONSTRUCTION_OBJECT
INSERT INTO object_cards (type_id, code, name, status, attrs)
SELECT id, 'CO-EX-01', 'Пример: Строительство склада №2', 'Active', '{}'::jsonb
FROM object_types WHERE code = 'CONSTRUCTION_OBJECT'
ON CONFLICT (type_id, code) DO NOTHING;

-- ACTIVITY_DIRECTION
INSERT INTO object_cards (type_id, code, name, status, attrs)
SELECT id, 'AD-EX-01', 'Пример: Оптовая торговля', 'Active', '{}'::jsonb
FROM object_types WHERE code = 'ACTIVITY_DIRECTION'
ON CONFLICT (type_id, code) DO NOTHING;

-- VAT_RATE
INSERT INTO object_cards (type_id, code, name, status, attrs)
SELECT id, 'VAT-20', 'Пример: НДС 20%', 'Active', '{"rate": 20}'::jsonb
FROM object_types WHERE code = 'VAT_RATE'
ON CONFLICT (type_id, code) DO NOTHING;

-- ORG (Организация)
INSERT INTO object_cards (type_id, code, name, status, attrs)
SELECT id, 'ORG-EX-01', 'Пример: Дочка 1', 'Active', '{}'::jsonb
FROM object_types WHERE code = 'ORG'
ON CONFLICT (type_id, code) DO NOTHING;

-- SETTLEMENT_DOCUMENT
INSERT INTO object_cards (type_id, code, name, status, attrs)
SELECT id, 'SD-EX-01', 'Пример: Счёт №45 от 01.02.2024', 'Active', '{}'::jsonb
FROM object_types WHERE code = 'SETTLEMENT_DOCUMENT'
ON CONFLICT (type_id, code) DO NOTHING;

-- STORAGE_CELL
INSERT INTO object_cards (type_id, code, name, status, attrs)
SELECT id, 'SC-EX-01', 'Пример: Стеллаж А-1, ярус 2', 'Active', '{}'::jsonb
FROM object_types WHERE code = 'STORAGE_CELL'
ON CONFLICT (type_id, code) DO NOTHING;

-- BATCH
INSERT INTO object_cards (type_id, code, name, status, attrs)
SELECT id, 'BATCH-EX-01', 'Пример: Партия канцтоваров 01.2024', 'Active', '{}'::jsonb
FROM object_types WHERE code = 'BATCH'
ON CONFLICT (type_id, code) DO NOTHING;

-- SERIES
INSERT INTO object_cards (type_id, code, name, status, attrs)
SELECT id, 'SER-EX-01', 'Пример: Серия товара 2024', 'Active', '{}'::jsonb
FROM object_types WHERE code = 'SERIES'
ON CONFLICT (type_id, code) DO NOTHING;

-- OKOF
INSERT INTO object_cards (type_id, code, name, status, attrs)
SELECT id, 'OKOF-EX-01', 'Пример: 310.29.10.42.111 Автомобили легковые', 'Active', '{}'::jsonb
FROM object_types WHERE code = 'OKOF'
ON CONFLICT (type_id, code) DO NOTHING;

-- OKTMO
INSERT INTO object_cards (type_id, code, name, status, attrs)
SELECT id, 'OKTMO-EX-01', 'Пример: 45000000 Москва', 'Active', '{}'::jsonb
FROM object_types WHERE code = 'OKTMO'
ON CONFLICT (type_id, code) DO NOTHING;

-- KBK
INSERT INTO object_cards (type_id, code, name, status, attrs)
SELECT id, 'KBK-EX-01', 'Пример: 182 1 01 01000 01 1000 110', 'Active', '{}'::jsonb
FROM object_types WHERE code = 'KBK'
ON CONFLICT (type_id, code) DO NOTHING;

-- TAX_AUTHORITY (ИФНС)
INSERT INTO object_cards (type_id, code, name, status, attrs)
SELECT id, 'IFNS-EX-01', 'Пример: ИФНС России №1 по г. Москве', 'Active', '{}'::jsonb
FROM object_types WHERE code = 'TAX_AUTHORITY'
ON CONFLICT (type_id, code) DO NOTHING;

-- VAT_OPERATION_TYPE
INSERT INTO object_cards (type_id, code, name, status, attrs)
SELECT id, 'VAT-OP-01', 'Пример: Реализация облагаемая НДС', 'Active', '{}'::jsonb
FROM object_types WHERE code = 'VAT_OPERATION_TYPE'
ON CONFLICT (type_id, code) DO NOTHING;
