-- ============================================================
-- MIGRATION 026 — Rastreabilidade de cimento/aditivo passa a
-- referenciar o cadastro de Materiais (produtos) em vez da tabela
-- separada material_brands, que ficava dessincronizada do cadastro
-- real de materiais (nome/fornecedor duplicados em dois lugares).
-- ============================================================
-- cimento_marca_id/aditivo_marca_id continuam nullable e opcionais;
-- referências antigas para material_brands.id que não existam em
-- materials.id são zeradas para não quebrar a constraint.
-- ============================================================

ALTER TABLE analysis_dosage
  DROP CONSTRAINT IF EXISTS analysis_dosage_cimento_marca_id_fkey,
  DROP CONSTRAINT IF EXISTS analysis_dosage_aditivo_marca_id_fkey;

UPDATE analysis_dosage
  SET cimento_marca_id = NULL
  WHERE cimento_marca_id IS NOT NULL
    AND NOT EXISTS (SELECT 1 FROM materials m WHERE m.id = analysis_dosage.cimento_marca_id);

UPDATE analysis_dosage
  SET aditivo_marca_id = NULL
  WHERE aditivo_marca_id IS NOT NULL
    AND NOT EXISTS (SELECT 1 FROM materials m WHERE m.id = analysis_dosage.aditivo_marca_id);

ALTER TABLE analysis_dosage
  ADD CONSTRAINT analysis_dosage_cimento_marca_id_fkey
    FOREIGN KEY (cimento_marca_id) REFERENCES materials(id),
  ADD CONSTRAINT analysis_dosage_aditivo_marca_id_fkey
    FOREIGN KEY (aditivo_marca_id) REFERENCES materials(id);
