-- Номенклатура (синхронизируется из УХ)
CREATE TABLE IF NOT EXISTS nomenclature (
    id UUID PRIMARY KEY,
    code VARCHAR(100),
    name VARCHAR(500) NOT NULL,
    data JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_nomenclature_code ON nomenclature(code);
CREATE INDEX idx_nomenclature_name ON nomenclature(name);

CREATE TRIGGER update_nomenclature_updated_at BEFORE UPDATE ON nomenclature
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
