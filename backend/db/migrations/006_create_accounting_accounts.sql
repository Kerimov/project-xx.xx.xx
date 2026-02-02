-- Счета учета (план счетов, синхронизируются из 1С УХ)

CREATE TABLE IF NOT EXISTS accounting_accounts (
    id UUID PRIMARY KEY,
    code VARCHAR(50),
    name VARCHAR(255) NOT NULL,
    data JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_accounting_accounts_code ON accounting_accounts(code);
CREATE INDEX idx_accounting_accounts_name ON accounting_accounts(name);

CREATE TRIGGER update_accounting_accounts_updated_at BEFORE UPDATE ON accounting_accounts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
