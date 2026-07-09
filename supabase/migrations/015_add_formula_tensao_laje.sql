-- Adiciona fórmula de tensão específica para Laje aos parâmetros técnicos
-- Resultado = (TF / formula_tensao_laje) * 100
ALTER TABLE technical_settings
  ADD COLUMN IF NOT EXISTS formula_tensao_laje NUMERIC DEFAULT 78.54;
