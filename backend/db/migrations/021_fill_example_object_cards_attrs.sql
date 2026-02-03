-- Заполнение аналитических признаков у примеров карточек объектов, у которых attrs пустой.
-- Для уже развернутых БД: обновляет только строки с пустым attrs по (type_id, code) из примеров.

UPDATE object_cards c
SET attrs = sub.attrs
FROM (
  SELECT ot.id AS type_id, vals.code, vals.attrs
  FROM (VALUES
    ('DEPARTMENT', 'DEPT-EX-01', '{"address": "г. Москва, ул. Примерная, 1"}'::jsonb),
    ('COST_CENTER', 'CC-EX-01', '{"description": "МВЗ для учёта затрат по региону"}'::jsonb),
    ('BANK', 'BANK-EX-01', '{"bik": "044525225", "description": "Крупнейший банк РФ"}'::jsonb),
    ('BANK_ACCOUNT', 'BA-EX-01', '{"currency": "RUB", "accountType": "settlement", "isActive": true}'::jsonb),
    ('ITEM', 'ITEM-EX-01', '{"description": "Канцтовары для офиса"}'::jsonb),
    ('ITEM_GROUP', 'IG-EX-01', '{"description": "Группа номенклатуры"}'::jsonb),
    ('ORDER', 'ORD-EX-01', '{"description": "Заказ на поставку товаров"}'::jsonb),
    ('COST_ITEM', 'COST-EX-01', '{"costType": "direct", "isDirect": true}'::jsonb),
    ('CASHFLOW_ITEM', 'CF-EX-01', '{"direction": "inflow", "category": "operating"}'::jsonb),
    ('UOM', 'UOM-EX-01', '{"description": "Штука"}'::jsonb),
    ('INTANGIBLE_ASSET', 'NMA-EX-01', '{"description": "Лицензия на ПО"}'::jsonb),
    ('CONSTRUCTION_OBJECT', 'CO-EX-01', '{"description": "Объект незавершённого строительства"}'::jsonb),
    ('ACTIVITY_DIRECTION', 'AD-EX-01', '{"description": "Направление деятельности"}'::jsonb),
    ('ORG', 'ORG-EX-01', '{"description": "Дочерняя организация холдинга"}'::jsonb),
    ('SETTLEMENT_DOCUMENT', 'SD-EX-01', '{"description": "Счёт на оплату"}'::jsonb),
    ('STORAGE_CELL', 'SC-EX-01', '{"description": "Ячейка хранения на складе"}'::jsonb),
    ('BATCH', 'BATCH-EX-01', '{"description": "Партия товара"}'::jsonb),
    ('SERIES', 'SER-EX-01', '{"description": "Серия выпуска"}'::jsonb),
    ('OKOF', 'OKOF-EX-01', '{"depreciationGroup": "3"}'::jsonb),
    ('OKTMO', 'OKTMO-EX-01', '{"description": "Код территории ОКТМО"}'::jsonb),
    ('KBK', 'KBK-EX-01', '{"description": "Код бюджетной классификации"}'::jsonb),
    ('TAX_AUTHORITY', 'IFNS-EX-01', '{"description": "Инспекция по месту учёта"}'::jsonb),
    ('VAT_OPERATION_TYPE', 'VAT-OP-01', '{"description": "Вид операции для НДС"}'::jsonb)
  ) AS vals(type_code, code, attrs)
  JOIN object_types ot ON ot.code = vals.type_code
) sub
WHERE c.type_id = sub.type_id AND c.code = sub.code
  AND (c.attrs = '{}'::jsonb OR c.attrs IS NULL);
