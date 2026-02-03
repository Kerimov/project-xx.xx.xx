-- Вариант B: подписки должны быть на конкретные аналитики (analytics_types),
-- включая типы объектов учета. Поэтому зеркалим отсутствующие object_types -> analytics_types.

INSERT INTO analytics_types (code, name, direction_id, is_active)
SELECT ot.code, ot.name, ot.direction_id, ot.is_active
FROM object_types ot
WHERE NOT EXISTS (
  SELECT 1 FROM analytics_types at WHERE UPPER(at.code) = UPPER(ot.code)
);

