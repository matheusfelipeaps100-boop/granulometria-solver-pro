-- =============================================================================
-- SEED — Experimentos reais de Estudo de Dosagem (Wet Casting) — Concreart e Lajeforro
-- =============================================================================
-- Valores confirmados pelo usuário nesta sessão (não são estimativa/mock):
--
--   Concreart: cimento 370 kg | água 175 L | aditivo 2040 ml | resistência real aos 24h: 25 MPa
--   Lajeforro: cimento 500 kg | água 220 L | aditivo 1900 ml | resistência real aos 24h: 16 MPa
--
-- Meta confirmada: resistência > 20 MPa aos 24h (corrigido nesta sessão; o
-- plano original citava 25 MPa).
--
-- Lajeforro (16 MPa, abaixo da meta) tem, segundo o usuário, causa conhecida
-- (execução/cura) para o resultado — fica registrada no histórico/comparação
-- como REPROVADA, mas marcada usar_na_calibragem = false: não é usada para
-- calibrar o modelo cimento×resistência nem delimitar a região de busca de
-- candidatos (ver experimentosParaCalibragem em src/lib/wet-cast-optimizer.ts).
-- Com isso, restou apenas 1 experimento elegível (Concreart) — o motor não
-- gera candidatos até haver um segundo ponto real elegível para calibragem
-- (verificarDadosSuficientes retorna DADOS_INSUFICIENTES nesse caso, por
-- design — não inventa uma calibragem com 1 ponto só).
--
-- Composição de agregados (kg/batelada) obtida dos presets de granulometria
-- já cadastrados: "Traço/Curva Protendida Concreart" e "Traço/Curva Protendida
-- Lajeforro" (granulometry_presets). material_id mapeado a partir de materials
-- cadastrados na organização (consulta feita nesta sessão).
-- =============================================================================

INSERT INTO dosage_experiments (
  organization_id, produto_nome, codigo, origem, status,
  cimento_kg, agua_kg, aditivo_kg, relacao_ac, aditivo_pct_cimento, densidade_cimento,
  resultado_resistencia_mpa, usar_na_calibragem, motivo_exclusao_calibragem, observacoes
) VALUES
(
  '00000000-0000-0000-0000-000000000001', 'Laje Protendida (Wet Casting)', 'CONCREART', 'EXPERIMENTO_REAL', 'VALIDADO_EXPERIMENTALMENTE',
  370, 175, 2.040, 175.0/370.0, 2.040/370.0, 3.15,
  25, true, NULL,
  'Traço real fornecido pela Concreart. Composição de agregados a partir do preset "Traço/Curva Protendida Concreart".'
),
(
  '00000000-0000-0000-0000-000000000001', 'Laje Protendida (Wet Casting)', 'LAJEFORRO', 'EXPERIMENTO_REAL', 'REPROVADO',
  500, 220, 1.900, 220.0/500.0, 1.900/500.0, 3.15,
  16, false, 'Resultado abaixo da meta (16 MPa < 20 MPa) com causa conhecida de execução/cura, segundo relato do usuário — mantido no histórico, excluído da calibragem cimento×resistência.',
  'Traço real de produção própria (Lajeforro). Composição de agregados a partir do preset "Traço/Curva Protendida Lajeforro".'
)
ON CONFLICT (organization_id, codigo) DO NOTHING;

-- Materiais — Concreart (Areia Barranco 812kg, Brita 0 963kg, Pó de Pedra 85kg)
INSERT INTO dosage_experiment_materials (experiment_id, material_id, proporcao_kg, ordem)
SELECT e.id, m.material_id, m.proporcao_kg, m.ordem
FROM dosage_experiments e
CROSS JOIN (VALUES
  ('a65029c7-3c2c-4227-ad44-81baaca65dfc'::uuid, 812, 1), -- Areia Barranco
  ('65a418fe-4e21-4588-8254-3c6f1677a5f6'::uuid, 963, 2), -- Brita 0
  ('b1562dcb-9600-4003-ad54-1bf0b920ba61'::uuid, 85,  3)  -- Pó de Pedra
) AS m(material_id, proporcao_kg, ordem)
WHERE e.codigo = 'CONCREART' AND e.organization_id = '00000000-0000-0000-0000-000000000001';

-- Materiais — Lajeforro (Areia Natural 330kg, Pó de Pedra 530kg, Brita 0 880kg, Areia Barranco 330kg)
INSERT INTO dosage_experiment_materials (experiment_id, material_id, proporcao_kg, ordem)
SELECT e.id, m.material_id, m.proporcao_kg, m.ordem
FROM dosage_experiments e
CROSS JOIN (VALUES
  ('ab59a8f8-5a1c-4409-9e70-cf9055813529'::uuid, 330, 1), -- Areia Natural
  ('b1562dcb-9600-4003-ad54-1bf0b920ba61'::uuid, 530, 2), -- Pó de Pedra
  ('65a418fe-4e21-4588-8254-3c6f1677a5f6'::uuid, 880, 3), -- Brita 0
  ('a65029c7-3c2c-4227-ad44-81baaca65dfc'::uuid, 330, 4)  -- Areia Barranco
) AS m(material_id, proporcao_kg, ordem)
WHERE e.codigo = 'LAJEFORRO' AND e.organization_id = '00000000-0000-0000-0000-000000000001';
