-- Файловые вложения для карточек объектов учета
-- Аналогично document_files, но для object_cards

CREATE TABLE IF NOT EXISTS object_card_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  card_id UUID NOT NULL REFERENCES object_cards(id) ON DELETE CASCADE,
  file_name VARCHAR(500) NOT NULL,
  file_path TEXT NOT NULL,
  file_size BIGINT NOT NULL,
  mime_type VARCHAR(255),
  hash_sha256 VARCHAR(64),
  uploaded_by VARCHAR(255),
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_object_card_files_card ON object_card_files(card_id);
CREATE INDEX IF NOT EXISTS idx_object_card_files_hash ON object_card_files(hash_sha256);
