-- Исправление структуры таблицы object_type_schemas
-- Добавление DEFAULT для is_unique и исправление NULL значений

-- Сначала временно убираем NOT NULL ограничение (если оно есть)
DO $$
BEGIN
  -- Проверяем, есть ли ограничение NOT NULL
  IF EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public'
      AND table_name = 'object_type_schemas' 
      AND column_name = 'is_unique' 
      AND is_nullable = 'NO'
  ) THEN
    -- Временно убираем NOT NULL
    ALTER TABLE object_type_schemas ALTER COLUMN is_unique DROP NOT NULL;
  END IF;
END $$;

-- Обновляем все NULL значения на false
UPDATE object_type_schemas SET is_unique = false WHERE is_unique IS NULL;

-- Добавляем DEFAULT и ставим NOT NULL обратно
ALTER TABLE object_type_schemas 
  ALTER COLUMN is_unique SET DEFAULT false,
  ALTER COLUMN is_unique SET NOT NULL;
