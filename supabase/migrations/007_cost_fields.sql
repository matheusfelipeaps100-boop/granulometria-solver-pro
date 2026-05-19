-- ============================================================
-- MIGRATION 007 — Campos de custo em analysis_dosage
-- Snapshot do custo no momento da aprovação/criação
-- ============================================================

ALTER TABLE analysis_dosage
  ADD COLUMN IF NOT EXISTS custo_cimento_ton  DECIMAL(10,2),
  ADD COLUMN IF NOT EXISTS custo_aditivo_lt   DECIMAL(10,2),
  ADD COLUMN IF NOT EXISTS custo_total_m3     DECIMAL(10,2),
  ADD COLUMN IF NOT EXISTS custo_total_batelada DECIMAL(10,2);

-- Índice para queries de métricas por organização e período
CREATE INDEX IF NOT EXISTS idx_analyses_org_date
  ON analyses (organization_id, data_analise);
