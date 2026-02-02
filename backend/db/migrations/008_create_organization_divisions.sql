-- Подразделения организаций (из 1С УХ)
CREATE TABLE IF NOT EXISTS organization_divisions (
  id UUID PRIMARY KEY,
  code VARCHAR(100),
  name VARCHAR(500) NOT NULL,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  data JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_organization_divisions_organization_id 
  ON organization_divisions(organization_id);
CREATE INDEX IF NOT EXISTS idx_organization_divisions_name 
  ON organization_divisions(name);
CREATE INDEX IF NOT EXISTS idx_organization_divisions_code 
  ON organization_divisions(code);
