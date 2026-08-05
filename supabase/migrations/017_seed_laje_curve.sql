-- Migration 017: Curva normativa de sistema para Lajes Protendidas
-- Objetivo: adicionar uma 2ª curva de referência (máxima compacidade para
-- concreto seco de extrusão), independente da curva de vibroprensados
-- (bloco_estrutural / paver), sem alterar nenhuma curva existente.

DO $$
DECLARE
  v_laje_id uuid;
BEGIN
  INSERT INTO standard_curves (organization_id, nome, tipo_produto, resistencia_alvo, descricao, ativo, is_system)
  VALUES (NULL, 'ABNT — Laje Protendida', 'laje', NULL,
          'Curva de máxima compacidade para concreto seco de extrusão — Lajes Protendidas',
          true, true)
  RETURNING id INTO v_laje_id;

  INSERT INTO standard_curve_items (curve_id, sieve_id, limite_min, limite_max, pct_acumulado, pct_retido) VALUES
    (v_laje_id, 2,  0.00, 0.13, 0.05, 0.05),
    (v_laje_id, 3,  0.10, 0.26, 0.18, 0.13),
    (v_laje_id, 4,  0.20, 0.36, 0.28, 0.10),
    (v_laje_id, 5,  0.34, 0.50, 0.42, 0.14),
    (v_laje_id, 6,  0.50, 0.66, 0.58, 0.16),
    (v_laje_id, 7,  0.66, 0.82, 0.74, 0.16),
    (v_laje_id, 8,  0.80, 0.96, 0.88, 0.14),
    (v_laje_id, 9,  0.88, 1.00, 0.96, 0.08),
    (v_laje_id, 10, 1.00, 1.00, 1.00, 0.04);
END $$;
