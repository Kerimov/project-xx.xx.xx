-- Схема БД портала ЕЦОФ
-- PostgreSQL

-- Таблица организаций (дочерние общества)
CREATE TABLE IF NOT EXISTS organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    inn VARCHAR(20),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Таблица пакетов первички
CREATE TABLE IF NOT EXISTS packages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) UNIQUE NOT NULL,
    organization_id UUID REFERENCES organizations(id),
    period VARCHAR(7) NOT NULL, -- формат: YYYY-MM
    type VARCHAR(100), -- тип пакета (Реализация, Поступление и т.д.)
    status VARCHAR(50) NOT NULL DEFAULT 'New', -- New, InProcessing, Done, Failed, PartiallyFailed
    document_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(100)
);

CREATE INDEX idx_packages_organization ON packages(organization_id);
CREATE INDEX idx_packages_status ON packages(status);
CREATE INDEX idx_packages_period ON packages(period);

-- Таблица документов (основная сущность)
CREATE TABLE IF NOT EXISTS documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    package_id UUID REFERENCES packages(id),
    number VARCHAR(100) NOT NULL,
    date DATE NOT NULL,
    type VARCHAR(100) NOT NULL, -- тип документа (Счёт-фактура, Акт и т.д.)
    organization_id UUID REFERENCES organizations(id),
    counterparty_name VARCHAR(255),
    counterparty_inn VARCHAR(20),
    amount DECIMAL(18, 2),
    currency VARCHAR(3) DEFAULT 'RUB',
    portal_status VARCHAR(50) NOT NULL DEFAULT 'Draft', -- Draft, Validated, Frozen, QueuedToUH, SentToUH
    uh_status VARCHAR(50) DEFAULT NULL, -- None, Accepted, Posted, Error
    uh_document_ref VARCHAR(255), -- ссылка на документ в УХ (если создан)
    uh_error_message TEXT, -- текст ошибки от УХ
    current_version INTEGER DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(100),
    frozen_at TIMESTAMP WITH TIME ZONE,
    sent_to_uh_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_documents_package ON documents(package_id);
CREATE INDEX idx_documents_organization ON documents(organization_id);
CREATE INDEX idx_documents_portal_status ON documents(portal_status);
CREATE INDEX idx_documents_uh_status ON documents(uh_status);
CREATE INDEX idx_documents_number ON documents(number);
CREATE INDEX idx_documents_date ON documents(date);

-- Таблица версий документов (для версионирования и заморозки)
CREATE TABLE IF NOT EXISTS document_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
    version INTEGER NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'Draft', -- Draft, Frozen
    data JSONB NOT NULL, -- JSON с реквизитами документа (гибкая структура)
    frozen_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by VARCHAR(100),
    UNIQUE(document_id, version)
);

CREATE INDEX idx_document_versions_document ON document_versions(document_id);
CREATE INDEX idx_document_versions_status ON document_versions(status);

-- Таблица файлов документов
CREATE TABLE IF NOT EXISTS document_files (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
    version INTEGER, -- версия документа, к которой привязан файл (NULL = текущая)
    file_name VARCHAR(255) NOT NULL,
    file_path VARCHAR(500) NOT NULL, -- путь в файловом хранилище
    file_size BIGINT,
    mime_type VARCHAR(100),
    hash_sha256 VARCHAR(64), -- SHA-256 хэш файла для проверки целостности
    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    uploaded_by VARCHAR(100)
);

CREATE INDEX idx_document_files_document ON document_files(document_id);
CREATE INDEX idx_document_files_version ON document_files(version);

-- Таблица проверок/валидаций документов
CREATE TABLE IF NOT EXISTS document_checks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
    version INTEGER,
    source VARCHAR(50) NOT NULL, -- Портал, УХ
    level VARCHAR(20) NOT NULL, -- error, warning, info
    field VARCHAR(100), -- поле документа, к которому относится проверка
    message TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_document_checks_document ON document_checks(document_id);

-- Таблица истории действий (аудит)
CREATE TABLE IF NOT EXISTS document_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
    version INTEGER,
    action VARCHAR(100) NOT NULL, -- Создан, Заморожен, Отправлен в УХ и т.д.
    user_id VARCHAR(100),
    user_name VARCHAR(255),
    details JSONB, -- дополнительные детали действия
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_document_history_document ON document_history(document_id);
CREATE INDEX idx_document_history_created_at ON document_history(created_at);

-- Таблица операций интеграции с УХ (очередь)
CREATE TABLE IF NOT EXISTS uh_integration_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
    operation_type VARCHAR(50) NOT NULL, -- UpsertDocument, PostDocument
    payload JSONB NOT NULL, -- данные для отправки в УХ
    status VARCHAR(50) NOT NULL DEFAULT 'Pending', -- Pending, Processing, Completed, Failed
    idempotency_key VARCHAR(255) UNIQUE, -- ключ идемпотентности
    error_message TEXT,
    retry_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    processed_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_uh_queue_status ON uh_integration_queue(status);
CREATE INDEX idx_uh_queue_document ON uh_integration_queue(document_id);
CREATE INDEX idx_uh_queue_idempotency ON uh_integration_queue(idempotency_key);

-- Таблица пользователей (базовая, для аутентификации)
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username VARCHAR(100) UNIQUE NOT NULL,
    email VARCHAR(255),
    password_hash VARCHAR(255), -- bcrypt hash
    role VARCHAR(50) NOT NULL DEFAULT 'user', -- ecof_admin, ecof_user, company_user
    organization_id UUID REFERENCES organizations(id),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_organization ON users(organization_id);

-- Функция для автоматического обновления updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Триггеры для автоматического обновления updated_at
CREATE TRIGGER update_organizations_updated_at BEFORE UPDATE ON organizations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_packages_updated_at BEFORE UPDATE ON packages
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_documents_updated_at BEFORE UPDATE ON documents
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
