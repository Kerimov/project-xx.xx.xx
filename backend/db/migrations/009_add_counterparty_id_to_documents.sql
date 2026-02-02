-- Добавляем counterparty_id в таблицу documents (по аналогии с organization_id)
ALTER TABLE documents ADD COLUMN IF NOT EXISTS counterparty_id UUID REFERENCES counterparties(id);
CREATE INDEX IF NOT EXISTS idx_documents_counterparty ON documents(counterparty_id);

-- Обратная заливка counterparty_id из версий для существующих документов
UPDATE documents d
SET counterparty_id = (
  SELECT (dv.data->>'counterpartyId')::uuid
  FROM document_versions dv
  WHERE dv.document_id = d.id
  ORDER BY dv.version DESC
  LIMIT 1
)
WHERE d.counterparty_id IS NULL
  AND EXISTS (
    SELECT 1 FROM document_versions dv
    WHERE dv.document_id = d.id AND dv.data->>'counterpartyId' IS NOT NULL
  );
