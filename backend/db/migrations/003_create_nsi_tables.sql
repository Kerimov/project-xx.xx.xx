-- Таблицы для НСИ (нормативно-справочная информация)

-- Контрагенты (синхронизируются из УХ)
CREATE TABLE IF NOT EXISTS counterparties (
    id UUID PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    inn VARCHAR(20),
    data JSONB, -- дополнительные данные из УХ
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_counterparties_inn ON counterparties(inn);
CREATE INDEX idx_counterparties_name ON counterparties(name);

-- Договоры (синхронизируются из УХ)
CREATE TABLE IF NOT EXISTS contracts (
    id UUID PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    organization_id UUID REFERENCES organizations(id),
    counterparty_id UUID REFERENCES counterparties(id),
    data JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_contracts_organization ON contracts(organization_id);
CREATE INDEX idx_contracts_counterparty ON contracts(counterparty_id);

-- Счета (синхронизируются из УХ)
CREATE TABLE IF NOT EXISTS accounts (
    id UUID PRIMARY KEY,
    code VARCHAR(50),
    name VARCHAR(255) NOT NULL,
    organization_id UUID REFERENCES organizations(id),
    type VARCHAR(50), -- расчетный, валютный и т.д.
    data JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_accounts_organization ON accounts(organization_id);
CREATE INDEX idx_accounts_code ON accounts(code);

-- Склады (синхронизируются из УХ)
CREATE TABLE IF NOT EXISTS warehouses (
    id UUID PRIMARY KEY,
    code VARCHAR(50),
    name VARCHAR(255) NOT NULL,
    organization_id UUID REFERENCES organizations(id),
    data JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_warehouses_organization ON warehouses(organization_id);
CREATE INDEX idx_warehouses_code ON warehouses(code);

-- Состояние синхронизации НСИ
CREATE TABLE IF NOT EXISTS nsi_sync_state (
    version INTEGER PRIMARY KEY,
    items_synced INTEGER DEFAULT 0,
    synced_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Триггеры для обновления updated_at
CREATE TRIGGER update_counterparties_updated_at BEFORE UPDATE ON counterparties
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_contracts_updated_at BEFORE UPDATE ON contracts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_accounts_updated_at BEFORE UPDATE ON accounts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_warehouses_updated_at BEFORE UPDATE ON warehouses
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
