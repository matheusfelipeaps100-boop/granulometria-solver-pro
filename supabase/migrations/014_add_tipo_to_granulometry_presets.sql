-- Adiciona campo tipo_analise à tabela de presets de granulometria
ALTER TABLE granulometry_presets
  ADD COLUMN IF NOT EXISTS tipo_analise TEXT DEFAULT 'bloco_estrutural';
