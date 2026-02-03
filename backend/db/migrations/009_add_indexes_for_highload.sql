-- Индексы для повышения производительности в высоконагруженной системе
-- Документы и пакеты

-- Ускоряет выборку документов по пакету и статусу (страницы пакета, массовая отправка)
CREATE INDEX IF NOT EXISTS idx_documents_package_portal_status
  ON documents (package_id, portal_status);

-- Ускоряет выборку документов по организации и дате создания (общие списки, отчёты)
CREATE INDEX IF NOT EXISTS idx_documents_organization_created_at
  ON documents (organization_id, created_at);

-- Ускоряет фильтрацию по статусу и сортировку/фильтрацию по дате
CREATE INDEX IF NOT EXISTS idx_documents_portal_status_created_at
  ON documents (portal_status, created_at);

-- Очередь интеграции с УХ
-- В 001_create_schema уже есть индексы по status и document_id,
-- добавляем составной индекс для частых выборок "по статусу, по времени создания".
CREATE INDEX IF NOT EXISTS idx_uh_queue_status_created_at
  ON uh_integration_queue (status, created_at);

