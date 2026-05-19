-- ============================================================
-- MIGRATION 008 — ADD PAVER FORMULA FIELD
-- Granulometria Solver Pro
-- Adiciona campo para fórmula de cálculo específica para pavers
-- ============================================================

-- Adicionar coluna formula_tensao_paver à tabela technical_settings
-- Fórmula para paver: Resultado = Tensão × 1.729
-- Este campo permite que o usuário customize o multiplicador conforme necessário

ALTER TABLE technical_settings
ADD COLUMN IF NOT EXISTS formula_tensao_paver DECIMAL(10,6) DEFAULT 1.729;

-- ============================================================
-- Exemplo de uso:
-- Se a tensão medida for 10 MPa:
-- Resultado = 10 × 1.729 = 17.29
-- 
-- O usuário pode alterar o valor 1.729 para outro valor conforme necessário
-- nas configurações do sistema
-- ============================================================
