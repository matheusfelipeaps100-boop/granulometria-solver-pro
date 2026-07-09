-- Adiciona o multiplicador da fórmula de tensão da Laje
-- Resultado = (TF / formula_tensao_laje) * formula_tensao_laje_mult
ALTER TABLE technical_settings
  ADD COLUMN IF NOT EXISTS formula_tensao_laje_mult NUMERIC DEFAULT 100;
