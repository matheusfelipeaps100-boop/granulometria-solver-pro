-- ============================================================
-- MIGRATION 002 — SEED: PENEIRAS + ORGANIZAÇÃO INICIAL
-- Granulometria Solver Pro
-- ============================================================

-- Peneiras na ordem técnica obrigatória (crítico para cálculo do MF)
-- usa_no_mf = TRUE nas peneiras 4.8, 2.4, 1.2, 0.6, 0.3, 0.15
INSERT INTO sieves (abertura_mm, nome, ordem, usa_no_mf) VALUES
  (12.7, '12,7 mm', 1,  false),
  (9.5,  '9,5 mm',  2,  false),
  (6.3,  '6,3 mm',  3,  false),
  (4.8,  '4,8 mm',  4,  true),
  (2.4,  '2,4 mm',  5,  true),
  (1.2,  '1,2 mm',  6,  true),
  (0.6,  '0,6 mm',  7,  true),
  (0.3,  '0,3 mm',  8,  true),
  (0.15, '0,15 mm', 9,  true),
  (0,    'FUNDO',   10, false);

-- Organização principal — Laje & Forro Matriz
INSERT INTO organizations (id, nome, cnpj, plano) VALUES
  ('00000000-0000-0000-0000-000000000001', 'Laje & Forro Matriz', '', 'pro');

-- Configurações técnicas padrão para a organização
INSERT INTO technical_settings (organization_id) VALUES
  ('00000000-0000-0000-0000-000000000001');
