-- Искусственные (тестовые) значения аналитик для демонстрации и тестирования.
-- Заполняем несколько видов аналитик примерами.

-- Исправление возможных NULL в object_type_schemas.is_unique (если остались от старых миграций)
UPDATE object_type_schemas SET is_unique = false WHERE is_unique IS NULL;

-- Контрагенты
INSERT INTO analytics_values (type_id, code, name, attrs, is_active)
SELECT id, 'CP-001', 'ООО "Ромашка"', '{"inn": "7707123456", "kpp": "770701001", "address": "г. Москва, ул. Цветочная, д. 1"}'::jsonb, true
FROM analytics_types WHERE code = 'COUNTERPARTY'
ON CONFLICT (type_id, code) DO UPDATE SET name = EXCLUDED.name, attrs = EXCLUDED.attrs, updated_at = now();

INSERT INTO analytics_values (type_id, code, name, attrs, is_active)
SELECT id, 'CP-002', 'ИП Иванов П.С.', '{"inn": "772812345678", "address": "г. Москва, ул. Садовая, д. 5"}'::jsonb, true
FROM analytics_types WHERE code = 'COUNTERPARTY'
ON CONFLICT (type_id, code) DO UPDATE SET name = EXCLUDED.name, attrs = EXCLUDED.attrs, updated_at = now();

INSERT INTO analytics_values (type_id, code, name, attrs, is_active)
SELECT id, 'CP-003', 'ООО "СтройИнвест"', '{"inn": "7705987654", "kpp": "770501001"}'::jsonb, true
FROM analytics_types WHERE code = 'COUNTERPARTY'
ON CONFLICT (type_id, code) DO UPDATE SET name = EXCLUDED.name, attrs = EXCLUDED.attrs, updated_at = now();

INSERT INTO analytics_values (type_id, code, name, attrs, is_active)
SELECT id, 'CP-004', 'АО "ТоргСервис"', '{"inn": "7701234567"}'::jsonb, true
FROM analytics_types WHERE code = 'COUNTERPARTY'
ON CONFLICT (type_id, code) DO UPDATE SET name = EXCLUDED.name, attrs = EXCLUDED.attrs, updated_at = now();

INSERT INTO analytics_values (type_id, code, name, attrs, is_active)
SELECT id, 'CP-005', 'ООО "ЛогистикПлюс"', '{"inn": "7709876543"}'::jsonb, true
FROM analytics_types WHERE code = 'COUNTERPARTY'
ON CONFLICT (type_id, code) DO UPDATE SET name = EXCLUDED.name, attrs = EXCLUDED.attrs, updated_at = now();

-- ЦФО (центры финансовой ответственности)
INSERT INTO analytics_values (type_id, code, name, attrs, is_active)
SELECT id, 'CFO-01', 'Отдел продаж (Москва)', '{}'::jsonb, true FROM analytics_types WHERE code = 'CFO'
ON CONFLICT (type_id, code) DO UPDATE SET name = EXCLUDED.name, updated_at = now();

INSERT INTO analytics_values (type_id, code, name, attrs, is_active)
SELECT id, 'CFO-02', 'Бухгалтерия', '{}'::jsonb, true FROM analytics_types WHERE code = 'CFO'
ON CONFLICT (type_id, code) DO UPDATE SET name = EXCLUDED.name, updated_at = now();

INSERT INTO analytics_values (type_id, code, name, attrs, is_active)
SELECT id, 'CFO-03', 'Складской комплекс', '{}'::jsonb, true FROM analytics_types WHERE code = 'CFO'
ON CONFLICT (type_id, code) DO UPDATE SET name = EXCLUDED.name, updated_at = now();

INSERT INTO analytics_values (type_id, code, name, attrs, is_active)
SELECT id, 'CFO-04', 'ИТ-отдел', '{}'::jsonb, true FROM analytics_types WHERE code = 'CFO'
ON CONFLICT (type_id, code) DO UPDATE SET name = EXCLUDED.name, updated_at = now();

INSERT INTO analytics_values (type_id, code, name, attrs, is_active)
SELECT id, 'CFO-05', 'Отдел закупок', '{}'::jsonb, true FROM analytics_types WHERE code = 'CFO'
ON CONFLICT (type_id, code) DO UPDATE SET name = EXCLUDED.name, updated_at = now();

-- Проекты
INSERT INTO analytics_values (type_id, code, name, attrs, is_active)
SELECT id, 'PRJ-001', 'Проект "Внедрение 1С"', '{"startDate": "2024-01-01", "manager": "Петров И.И."}'::jsonb, true
FROM analytics_types WHERE code = 'PROJECT'
ON CONFLICT (type_id, code) DO UPDATE SET name = EXCLUDED.name, attrs = EXCLUDED.attrs, updated_at = now();

INSERT INTO analytics_values (type_id, code, name, attrs, is_active)
SELECT id, 'PRJ-002', 'Проект "Рекламная кампания Q1"', '{}'::jsonb, true
FROM analytics_types WHERE code = 'PROJECT'
ON CONFLICT (type_id, code) DO UPDATE SET name = EXCLUDED.name, updated_at = now();

INSERT INTO analytics_values (type_id, code, name, attrs, is_active)
SELECT id, 'PRJ-003', 'Строительство склада №2', '{}'::jsonb, true
FROM analytics_types WHERE code = 'PROJECT'
ON CONFLICT (type_id, code) DO UPDATE SET name = EXCLUDED.name, updated_at = now();

INSERT INTO analytics_values (type_id, code, name, attrs, is_active)
SELECT id, 'PRJ-004', 'Разработка продукта "Модуль УХ"', '{}'::jsonb, true
FROM analytics_types WHERE code = 'PROJECT'
ON CONFLICT (type_id, code) DO UPDATE SET name = EXCLUDED.name, updated_at = now();

-- Статьи затрат
INSERT INTO analytics_values (type_id, code, name, attrs, is_active)
SELECT id, 'COST-01', 'Зарплата', '{}'::jsonb, true FROM analytics_types WHERE code = 'COST_ITEM'
ON CONFLICT (type_id, code) DO UPDATE SET name = EXCLUDED.name, updated_at = now();

INSERT INTO analytics_values (type_id, code, name, attrs, is_active)
SELECT id, 'COST-02', 'Аренда помещений', '{}'::jsonb, true FROM analytics_types WHERE code = 'COST_ITEM'
ON CONFLICT (type_id, code) DO UPDATE SET name = EXCLUDED.name, updated_at = now();

INSERT INTO analytics_values (type_id, code, name, attrs, is_active)
SELECT id, 'COST-03', 'Эксплуатация транспорта', '{}'::jsonb, true FROM analytics_types WHERE code = 'COST_ITEM'
ON CONFLICT (type_id, code) DO UPDATE SET name = EXCLUDED.name, updated_at = now();

INSERT INTO analytics_values (type_id, code, name, attrs, is_active)
SELECT id, 'COST-04', 'Канцтовары и расходники', '{}'::jsonb, true FROM analytics_types WHERE code = 'COST_ITEM'
ON CONFLICT (type_id, code) DO UPDATE SET name = EXCLUDED.name, updated_at = now();

INSERT INTO analytics_values (type_id, code, name, attrs, is_active)
SELECT id, 'COST-05', 'Реклама и маркетинг', '{}'::jsonb, true FROM analytics_types WHERE code = 'COST_ITEM'
ON CONFLICT (type_id, code) DO UPDATE SET name = EXCLUDED.name, updated_at = now();

-- Подразделения
INSERT INTO analytics_values (type_id, code, name, attrs, is_active)
SELECT id, 'DEP-01', 'Отдел продаж', '{}'::jsonb, true FROM analytics_types WHERE code = 'DEPARTMENT'
ON CONFLICT (type_id, code) DO UPDATE SET name = EXCLUDED.name, updated_at = now();

INSERT INTO analytics_values (type_id, code, name, attrs, is_active)
SELECT id, 'DEP-02', 'Бухгалтерия', '{}'::jsonb, true FROM analytics_types WHERE code = 'DEPARTMENT'
ON CONFLICT (type_id, code) DO UPDATE SET name = EXCLUDED.name, updated_at = now();

INSERT INTO analytics_values (type_id, code, name, attrs, is_active)
SELECT id, 'DEP-03', 'Склад', '{}'::jsonb, true FROM analytics_types WHERE code = 'DEPARTMENT'
ON CONFLICT (type_id, code) DO UPDATE SET name = EXCLUDED.name, updated_at = now();

-- Склады
INSERT INTO analytics_values (type_id, code, name, attrs, is_active)
SELECT id, 'WH-01', 'Основной склад (Москва)', '{"address": "г. Москва, складской комплекс №1"}'::jsonb, true
FROM analytics_types WHERE code = 'WAREHOUSE'
ON CONFLICT (type_id, code) DO UPDATE SET name = EXCLUDED.name, attrs = EXCLUDED.attrs, updated_at = now();

INSERT INTO analytics_values (type_id, code, name, attrs, is_active)
SELECT id, 'WH-02', 'Склад отгрузки (Подольск)', '{}'::jsonb, true
FROM analytics_types WHERE code = 'WAREHOUSE'
ON CONFLICT (type_id, code) DO UPDATE SET name = EXCLUDED.name, updated_at = now();

-- Каналы продаж
INSERT INTO analytics_values (type_id, code, name, attrs, is_active)
SELECT id, 'CH-01', 'Розничная сеть', '{}'::jsonb, true FROM analytics_types WHERE code = 'SALES_CHANNEL'
ON CONFLICT (type_id, code) DO UPDATE SET name = EXCLUDED.name, updated_at = now();

INSERT INTO analytics_values (type_id, code, name, attrs, is_active)
SELECT id, 'CH-02', 'Оптовые продажи', '{}'::jsonb, true FROM analytics_types WHERE code = 'SALES_CHANNEL'
ON CONFLICT (type_id, code) DO UPDATE SET name = EXCLUDED.name, updated_at = now();

INSERT INTO analytics_values (type_id, code, name, attrs, is_active)
SELECT id, 'CH-03', 'Интернет-магазин', '{}'::jsonb, true FROM analytics_types WHERE code = 'SALES_CHANNEL'
ON CONFLICT (type_id, code) DO UPDATE SET name = EXCLUDED.name, updated_at = now();

-- Менеджеры
INSERT INTO analytics_values (type_id, code, name, attrs, is_active)
SELECT id, 'MGR-01', 'Петров Иван Иванович', '{"email": "petrov@example.com"}'::jsonb, true
FROM analytics_types WHERE code = 'MANAGER'
ON CONFLICT (type_id, code) DO UPDATE SET name = EXCLUDED.name, attrs = EXCLUDED.attrs, updated_at = now();

INSERT INTO analytics_values (type_id, code, name, attrs, is_active)
SELECT id, 'MGR-02', 'Сидорова Мария Петровна', '{}'::jsonb, true
FROM analytics_types WHERE code = 'MANAGER'
ON CONFLICT (type_id, code) DO UPDATE SET name = EXCLUDED.name, updated_at = now();

INSERT INTO analytics_values (type_id, code, name, attrs, is_active)
SELECT id, 'MGR-03', 'Козлов Алексей Сергеевич', '{}'::jsonb, true
FROM analytics_types WHERE code = 'MANAGER'
ON CONFLICT (type_id, code) DO UPDATE SET name = EXCLUDED.name, updated_at = now();

-- Регионы
INSERT INTO analytics_values (type_id, code, name, attrs, is_active)
SELECT id, 'REG-01', 'Москва', '{}'::jsonb, true FROM analytics_types WHERE code = 'REGION'
ON CONFLICT (type_id, code) DO UPDATE SET name = EXCLUDED.name, updated_at = now();

INSERT INTO analytics_values (type_id, code, name, attrs, is_active)
SELECT id, 'REG-02', 'Московская область', '{}'::jsonb, true FROM analytics_types WHERE code = 'REGION'
ON CONFLICT (type_id, code) DO UPDATE SET name = EXCLUDED.name, updated_at = now();

INSERT INTO analytics_values (type_id, code, name, attrs, is_active)
SELECT id, 'REG-03', 'Санкт-Петербург', '{}'::jsonb, true FROM analytics_types WHERE code = 'REGION'
ON CONFLICT (type_id, code) DO UPDATE SET name = EXCLUDED.name, updated_at = now();

-- Ставка НДС
INSERT INTO analytics_values (type_id, code, name, attrs, is_active)
SELECT id, '20', 'НДС 20%', '{"rate": 20}'::jsonb, true FROM analytics_types WHERE code = 'VAT_RATE'
ON CONFLICT (type_id, code) DO UPDATE SET name = EXCLUDED.name, attrs = EXCLUDED.attrs, updated_at = now();

INSERT INTO analytics_values (type_id, code, name, attrs, is_active)
SELECT id, '10', 'НДС 10%', '{"rate": 10}'::jsonb, true FROM analytics_types WHERE code = 'VAT_RATE'
ON CONFLICT (type_id, code) DO UPDATE SET name = EXCLUDED.name, attrs = EXCLUDED.attrs, updated_at = now();

INSERT INTO analytics_values (type_id, code, name, attrs, is_active)
SELECT id, '0', 'Без НДС', '{"rate": 0}'::jsonb, true FROM analytics_types WHERE code = 'VAT_RATE'
ON CONFLICT (type_id, code) DO UPDATE SET name = EXCLUDED.name, attrs = EXCLUDED.attrs, updated_at = now();
