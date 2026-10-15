-- Controle de moldagem (somente laje): preenchido na tela de rompimento
ALTER TABLE production_batches
  ADD COLUMN IF NOT EXISTS moldagem_data DATE,
  ADD COLUMN IF NOT EXISTS moldagem_hora TIME,
  ADD COLUMN IF NOT EXISTS moldagem_temperatura DECIMAL(4,1),
  ADD COLUMN IF NOT EXISTS moldagem_tempo TEXT,
  ADD COLUMN IF NOT EXISTS moldagem_slump_cm DECIMAL(5,1);
