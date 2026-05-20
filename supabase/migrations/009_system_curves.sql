-- Migration 009: Curvas normativas ABNT como registros de sistema (is_system)
-- Objetivo: separar curvas normativas imutáveis (ABNT) de DNAs criados pelo usuário

-- 1. Adicionar coluna is_system
ALTER TABLE standard_curves
  ADD COLUMN IF NOT EXISTS is_system BOOLEAN NOT NULL DEFAULT false;

-- 2. Atualizar RLS: separar SELECT (inclui sistema) de INSERT/UPDATE/DELETE (só org)

-- Drop políticas existentes
DROP POLICY IF EXISTS "org_isolation" ON standard_curves;
DROP POLICY IF EXISTS "org_isolation" ON standard_curve_items;

-- SELECT: curvas da org OU curvas de sistema (ABNT)
CREATE POLICY "select_standard_curves" ON standard_curves
  FOR SELECT
  USING (organization_id = my_org_id() OR is_system = true);

-- INSERT/UPDATE/DELETE: apenas curvas da própria org (nunca sistema)
CREATE POLICY "write_standard_curves" ON standard_curves
  FOR INSERT
  WITH CHECK (organization_id = my_org_id());

CREATE POLICY "modify_standard_curves" ON standard_curves
  FOR UPDATE
  USING (organization_id = my_org_id());

CREATE POLICY "delete_standard_curves" ON standard_curves
  FOR DELETE
  USING (organization_id = my_org_id() AND is_system = false);

-- standard_curve_items: acompanha a curva pai
CREATE POLICY "select_standard_curve_items" ON standard_curve_items
  FOR SELECT
  USING (
    curve_id IN (
      SELECT id FROM standard_curves
      WHERE organization_id = my_org_id() OR is_system = true
    )
  );

CREATE POLICY "write_standard_curve_items" ON standard_curve_items
  FOR INSERT
  WITH CHECK (
    curve_id IN (
      SELECT id FROM standard_curves WHERE organization_id = my_org_id()
    )
  );

CREATE POLICY "delete_standard_curve_items" ON standard_curve_items
  FOR DELETE
  USING (
    curve_id IN (
      SELECT id FROM standard_curves
      WHERE organization_id = my_org_id() AND is_system = false
    )
  );

-- 3. Remover curvas antigas seedadas (para re-seedar limpas como sistema)
DELETE FROM standard_curves
WHERE nome IN ('DNA Bloco Estrutural', 'DNA Paver', 'DNA Bloco Estrutural 6MPa');

-- 4. Re-inserir curvas ABNT como registros de sistema (organization_id = NULL)
DO $$
DECLARE
  v_bloco_id uuid;
  v_paver_id uuid;
BEGIN
  INSERT INTO standard_curves (organization_id, nome, tipo_produto, resistencia_alvo, descricao, ativo, is_system)
  VALUES (NULL, 'ABNT — Bloco Estrutural', 'bloco_estrutural', 6,
          'Curva normativa ABNT para blocos estruturais de concreto (NBR 12118)', true, true)
  RETURNING id INTO v_bloco_id;

  INSERT INTO standard_curves (organization_id, nome, tipo_produto, resistencia_alvo, descricao, ativo, is_system)
  VALUES (NULL, 'ABNT — Paver', 'paver', 35,
          'Curva normativa ABNT para pavers — pisos intertravados (NBR 9781)', true, true)
  RETURNING id INTO v_paver_id;

  INSERT INTO standard_curve_items (curve_id, sieve_id, limite_min, limite_max, pct_acumulado, pct_retido) VALUES
    (v_bloco_id, 2,  0.00, 0.15, 0.075, 0.075),
    (v_bloco_id, 3,  0.00, 0.25, 0.125, 0.050),
    (v_bloco_id, 4,  0.00, 0.33, 0.165, 0.040),
    (v_bloco_id, 5,  0.19, 0.51, 0.350, 0.185),
    (v_bloco_id, 6,  0.37, 0.66, 0.515, 0.165),
    (v_bloco_id, 7,  0.54, 0.78, 0.660, 0.145),
    (v_bloco_id, 8,  0.72, 0.90, 0.810, 0.150),
    (v_bloco_id, 9,  0.85, 0.97, 0.910, 0.100),
    (v_bloco_id, 10, 1.00, 1.00, 1.000, 0.090);

  INSERT INTO standard_curve_items (curve_id, sieve_id, limite_min, limite_max, pct_acumulado, pct_retido) VALUES
    (v_paver_id, 2,  0.00, 0.00, 0.000, 0.000),
    (v_paver_id, 3,  0.00, 0.15, 0.075, 0.075),
    (v_paver_id, 4,  0.00, 0.22, 0.110, 0.035),
    (v_paver_id, 5,  0.19, 0.40, 0.295, 0.185),
    (v_paver_id, 6,  0.37, 0.61, 0.490, 0.195),
    (v_paver_id, 7,  0.54, 0.78, 0.660, 0.170),
    (v_paver_id, 8,  0.72, 0.92, 0.820, 0.160),
    (v_paver_id, 9,  0.85, 1.00, 0.925, 0.105),
    (v_paver_id, 10, 1.00, 1.00, 1.000, 0.075);
END $$;
