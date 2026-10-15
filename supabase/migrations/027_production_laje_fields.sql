-- Campos específicos de produção de laje (nullable: bloco e paver não usam)
ALTER TABLE production_batches
  ADD COLUMN IF NOT EXISTS pista TEXT,
  ADD COLUMN IF NOT EXISTS fios INTEGER,
  ADD COLUMN IF NOT EXISTS comprimento_pista_m DECIMAL(10,2),
  ADD COLUMN IF NOT EXISTS volume_concreto_m3 DECIMAL(10,3),
  ADD COLUMN IF NOT EXISTS metros_perda DECIMAL(10,2),
  ADD COLUMN IF NOT EXISTS perda_pct DECIMAL(6,2),
  ADD COLUMN IF NOT EXISTS aproveitamento_pct DECIMAL(6,2);
