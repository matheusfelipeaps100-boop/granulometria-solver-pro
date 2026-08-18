-- Dimensão máxima do agregado permitida pelo projeto/geometria da peça,
-- usada na verificação de compatibilidade do otimizador de Laje Protendida
-- (não é um limite normativo — é informado manualmente pelo usuário com
-- base no projeto: menor dimensão da seção, espaçamento entre cordoalhas,
-- cobrimento etc.). Opcional, aplicável sobretudo a DNAs de laje.
ALTER TABLE standard_curves
  ADD COLUMN IF NOT EXISTS dimensao_maxima_permitida_mm DECIMAL(6,2);
