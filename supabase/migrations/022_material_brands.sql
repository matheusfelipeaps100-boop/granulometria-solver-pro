-- ============================================================
-- MIGRATION 022 — Rastreabilidade de cimento/aditivo + Relatório Mensal
-- ============================================================
-- Migration puramente aditiva: 2 tabelas novas + colunas novas
-- (nullable, sem default obrigatório) em analysis_dosage.
-- Nenhum dado existente é alterado ou removido.
-- ============================================================

-- ============================================================
-- MARCAS DE CIMENTO/ADITIVO
-- ============================================================
CREATE TABLE material_brands (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  tipo            TEXT NOT NULL CHECK (tipo IN ('cimento', 'aditivo')),
  nome            TEXT NOT NULL,
  fornecedor      TEXT,
  ativo           BOOLEAN NOT NULL DEFAULT true,
  created_by      UUID REFERENCES profiles(id),
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_material_brands_org_tipo ON material_brands(organization_id, tipo);

ALTER TABLE material_brands ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org_isolation" ON material_brands
  USING (organization_id = my_org_id());

CREATE TRIGGER set_updated_at_material_brands
  BEFORE UPDATE ON material_brands
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ============================================================
-- CIMENTO/ADITIVO POR ANÁLISE (aditivo à dosagem já existente)
-- ============================================================
ALTER TABLE analysis_dosage
  ADD COLUMN IF NOT EXISTS cimento_marca_id   UUID REFERENCES material_brands(id),
  ADD COLUMN IF NOT EXISTS cimento_lote       TEXT,
  ADD COLUMN IF NOT EXISTS cimento_observacao TEXT,
  ADD COLUMN IF NOT EXISTS aditivo_marca_id   UUID REFERENCES material_brands(id),
  ADD COLUMN IF NOT EXISTS aditivo_lote       TEXT,
  ADD COLUMN IF NOT EXISTS aditivo_diluicao   TEXT,
  ADD COLUMN IF NOT EXISTS aditivo_observacao TEXT;

-- ============================================================
-- RELATÓRIO MENSAL — conclusão técnica persistida por período
-- ============================================================
-- Os dados agregados (análises, resistência, granulometria etc.)
-- continuam calculados sob demanda a partir das tabelas existentes;
-- aqui só fica a conclusão redigida pelo responsável, um registro
-- por organização/mês.
CREATE TABLE monthly_reports (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id),
  ano             INTEGER NOT NULL,
  mes             INTEGER NOT NULL CHECK (mes BETWEEN 1 AND 12),
  conclusao       TEXT,
  responsavel_id  UUID REFERENCES profiles(id),
  created_by      UUID REFERENCES profiles(id),
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now(),
  UNIQUE(organization_id, ano, mes)
);

CREATE INDEX idx_monthly_reports_org_period ON monthly_reports(organization_id, ano, mes);

ALTER TABLE monthly_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org_isolation" ON monthly_reports
  USING (organization_id = my_org_id());

CREATE TRIGGER set_updated_at_monthly_reports
  BEFORE UPDATE ON monthly_reports
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
