-- Предзаполнение каталога аналитик холдинга (типовой полный набор для 1С/бухучёта).
-- Это "виды аналитик" (субконто/разрезы), которые затем организации могут подключать по подписке.

INSERT INTO analytics_types (code, name, direction_id, is_active)
VALUES
  -- Организационная структура
  ('ORG', 'Организация', NULL, true),
  ('DEPARTMENT', 'Подразделение', NULL, true),
  ('CFO', 'ЦФО (центр финансовой ответственности)', NULL, true),
  ('COST_CENTER', 'МВЗ / Центр затрат', NULL, true),
  ('ACTIVITY_DIRECTION', 'Направление деятельности', NULL, true),
  ('PROJECT', 'Проект', NULL, true),
  ('ORDER', 'Заказ / Объект калькулирования', NULL, true),
  ('RESPONSIBLE_PERSON', 'Ответственный / МОЛ', NULL, true),

  -- Контрагенты и договоры
  ('COUNTERPARTY', 'Контрагент', NULL, true),
  ('CONTRACT', 'Договор', NULL, true),
  ('SETTLEMENT_DOCUMENT', 'Документ расчётов', NULL, true),

  -- Денежные средства и ДДС
  ('BANK', 'Банк', NULL, true),
  ('BANK_ACCOUNT', 'Банковский счёт', NULL, true),
  ('CASH_DESK', 'Касса', NULL, true),
  ('CASHFLOW_ITEM', 'Статья ДДС', NULL, true),

  -- Запасы / склад / номенклатура
  ('ITEM', 'Номенклатура', NULL, true),
  ('ITEM_GROUP', 'Номенклатурная группа', NULL, true),
  ('WAREHOUSE', 'Склад', NULL, true),
  ('STORAGE_CELL', 'Ячейка / Место хранения', NULL, true),
  ('BATCH', 'Партия', NULL, true),
  ('SERIES', 'Серия', NULL, true),
  ('CHARACTERISTIC', 'Характеристика номенклатуры', NULL, true),
  ('UOM', 'Единица измерения', NULL, true),

  -- Производство / затраты / себестоимость
  ('COST_ITEM', 'Статья затрат', NULL, true),
  ('PRODUCT_GROUP', 'Группа продукции', NULL, true),
  ('PRODUCTION_STAGE', 'Передел / Этап производства', NULL, true),
  ('SPECIFICATION', 'Спецификация (BOM)', NULL, true),

  -- Внеоборотные активы
  ('FIXED_ASSET', 'Основное средство', NULL, true),
  ('INTANGIBLE_ASSET', 'Нематериальный актив', NULL, true),
  ('CONSTRUCTION_OBJECT', 'Объект строительства / Капвложения', NULL, true),

  -- Продажи / закупки (как аналитические разрезы, часто используемые в управленческом учёте)
  ('SALES_CHANNEL', 'Канал продаж', NULL, true),
  ('MANAGER', 'Менеджер', NULL, true),
  ('REGION', 'Регион', NULL, true),

  -- Налоги / НДС / бюджет
  ('VAT_OPERATION_TYPE', 'Вид операции НДС', NULL, true),
  ('VAT_RATE', 'Ставка НДС', NULL, true),
  ('TAX', 'Налог / взнос', NULL, true),
  ('TAX_AUTHORITY', 'ИФНС', NULL, true),
  ('KBK', 'КБК', NULL, true),
  ('OKTMO', 'ОКТМО', NULL, true),

  -- Прочие доходы/расходы, финансовые инструменты
  ('OTHER_INCOME_EXPENSE_ITEM', 'Статья прочих доходов/расходов', NULL, true),
  ('LOAN_CONTRACT', 'Договор займа/кредита', NULL, true),
  ('SECURITY', 'Ценная бумага', NULL, true),
  ('PORTFOLIO', 'Портфель', NULL, true),
  ('RESERVE_TYPE', 'Вид резерва', NULL, true),

  -- Холдинг / консолидация
  ('INTERCOMPANY_PARTNER', 'Внутригрупповой контрагент', NULL, true),
  ('CONSOLIDATION_PERIMETER', 'Периметр консолидации', NULL, true),
  ('IFRS_SEGMENT', 'Сегмент (МСФО)', NULL, true),
  ('REPORTING_STANDARD', 'Стандарт учёта (РСБУ/МСФО/УПР)', NULL, true)
ON CONFLICT (code) DO NOTHING;

