-- Начальные склады (если пропали после очистки НСИ или для тестов).
-- Добавляем по 2 склада для каждой существующей организации (без привязки к конкретным UUID).

INSERT INTO warehouses (id, code, name, organization_id, data)
SELECT gen_random_uuid(), o.code || '-WH-01', 'Основной склад (' || o.name || ')', o.id, '{}'
FROM organizations o
WHERE NOT EXISTS (SELECT 1 FROM warehouses w WHERE w.organization_id = o.id);

INSERT INTO warehouses (id, code, name, organization_id, data)
SELECT gen_random_uuid(), o.code || '-WH-02', 'Склад материалов (' || o.name || ')', o.id, '{}'
FROM organizations o
WHERE NOT EXISTS (SELECT 1 FROM warehouses w WHERE w.organization_id = o.id AND w.code = o.code || '-WH-02');

INSERT INTO warehouses (id, code, name, organization_id, data)
SELECT gen_random_uuid(), o.code || '-WH-03', 'Торговый склад (' || o.name || ')', o.id, '{}'
FROM organizations o
WHERE NOT EXISTS (SELECT 1 FROM warehouses w WHERE w.organization_id = o.id AND w.code = o.code || '-WH-03');
