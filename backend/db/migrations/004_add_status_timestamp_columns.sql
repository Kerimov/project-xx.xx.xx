-- Добавление колонок для отслеживания времени изменения статусов документов
-- Миграция 004

-- Добавляем колонку validated_at для отслеживания времени валидации
ALTER TABLE documents 
ADD COLUMN IF NOT EXISTS validated_at TIMESTAMP WITH TIME ZONE;

-- Добавляем колонку cancelled_at для отслеживания времени отмены
ALTER TABLE documents 
ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMP WITH TIME ZONE;

-- Добавляем индексы для быстрого поиска по статусам
CREATE INDEX IF NOT EXISTS idx_documents_validated_at ON documents(validated_at) WHERE validated_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_documents_cancelled_at ON documents(cancelled_at) WHERE cancelled_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_documents_frozen_at ON documents(frozen_at) WHERE frozen_at IS NOT NULL;
