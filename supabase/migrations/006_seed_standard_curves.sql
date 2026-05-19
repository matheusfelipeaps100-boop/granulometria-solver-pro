-- Seed: Curvas padrão normativas para Blocos Estruturais e Pavers
-- Valores de limites em frações (0-1), fieis à planilha normativa do cliente
-- Referência: prd-reverso-completo.md — seção "Limites Normativos"

DO $$
DECLARE
  v_org_id  uuid := '00000000-0000-0000-0000-000000000001';
  v_bloco_id uuid;
  v_paver_id uuid;
BEGIN
  -- 1. Inserir curva padrão: Bloco Estrutural
  INSERT INTO standard_curves (organization_id, nome, tipo_produto, resistencia_alvo, descricao, ativo)
  VALUES (v_org_id, 'DNA Bloco Estrutural', 'bloco_estrutural', 6, 'Curva normativa padrão para blocos estruturais de concreto', true)
  RETURNING id INTO v_bloco_id;

  -- 2. Inserir curva padrão: Paver
  INSERT INTO standard_curves (organization_id, nome, tipo_produto, resistencia_alvo, descricao, ativo)
  VALUES (v_org_id, 'DNA Paver', 'paver', 35, 'Curva normativa padrão para pavers (pisos intertravados)', true)
  RETURNING id INTO v_paver_id;

  -- 3. Itens da curva Bloco Estrutural (peneiras 9.5mm até Fundo)
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

  -- 4. Itens da curva Paver (peneiras 9.5mm até Fundo)
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
