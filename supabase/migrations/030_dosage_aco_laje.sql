-- Aço da laje na dosagem (por pista, opcional — bloco e paver não usam).
-- aco_material_id referencia o cadastro de Materiais (tipo 'aco'); sem material
-- selecionado, o aço é informado por texto em aco_descricao.
ALTER TABLE analysis_dosage
  ADD COLUMN IF NOT EXISTS aco_material_id UUID REFERENCES materials(id),
  ADD COLUMN IF NOT EXISTS aco_quantidade_kg DECIMAL(10,2),
  ADD COLUMN IF NOT EXISTS aco_descricao TEXT;
