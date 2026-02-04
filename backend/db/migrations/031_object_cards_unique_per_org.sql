-- 031_object_cards_unique_per_org.sql
-- Разрешаем один и тот же код объекта для разных организаций.
-- Раньше был UNIQUE(type_id, code) на всю базу.
-- Теперь уникальность: (type_id, code, organization_id).

-- Удаляем старое ограничение уникальности по (type_id, code), если оно существует.
ALTER TABLE object_cards
  DROP CONSTRAINT IF EXISTS object_cards_type_id_code_key;

-- Добавляем новое ограничение: код уникален в рамках типа и организации.
ALTER TABLE object_cards
  ADD CONSTRAINT object_cards_type_id_code_org_key UNIQUE (type_id, code, organization_id);

-- Дополнительный неуникальный индекс, чтобы не потерять быстрый поиск по type_id + code.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE c.relname = 'idx_object_cards_type_code_nonuniq'
      AND n.nspname = 'public'
  ) THEN
    CREATE INDEX idx_object_cards_type_code_nonuniq ON object_cards(type_id, code);
  END IF;
END $$;

