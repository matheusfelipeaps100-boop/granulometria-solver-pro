-- =============================================================================
-- AJUSTE — Faixa de referência (min/máx) do preset "Traço/Curva Protendida Concreart"
-- =============================================================================
-- Registro histórico: este preset (granulometry_presets, id fixo abaixo) foi
-- salvo originalmente com dna_selecionado vazio, então limites_curva havia
-- capturado por engano a faixa normativa de BLOCO ESTRUTURAL (vibroprensado),
-- que não tem nenhuma relação com Laje Protendida — análises de laje não
-- devem conciliar parâmetros de bloco/paver (são produtos diferentes).
--
-- Ajustado nesta migration (aplicada primeiro diretamente via API, replicada
-- aqui para registro/reprodutibilidade) para uma faixa própria de Laje,
-- calculada como ±10 pontos percentuais em torno da CURVA REAL combinada dos
-- 3 materiais reais da Concreart (Areia Barranco 812kg, Brita 0 963kg, Pó de
-- Pedra 85kg — mesmas proporções e granulometrias já cadastradas), usando o
-- mesmo algoritmo de curva combinada do sistema (calcCombinedCurve,
-- granulometry-engine.ts). Não é uma faixa normativa ABNT — é uma referência
-- interna "ideal" ancorada no traço real da Concreart, para comparação,
-- sem ser definida como padrão obrigatório de nenhuma análise.
-- =============================================================================

UPDATE granulometry_presets
SET limites_curva = '[
  {"sieve_id": 2,  "limite_min": 0.0361, "limite_max": 0.2361},
  {"sieve_id": 3,  "limite_min": 0.2795, "limite_max": 0.4795},
  {"sieve_id": 4,  "limite_min": 0.3556, "limite_max": 0.5556},
  {"sieve_id": 5,  "limite_min": 0.4262, "limite_max": 0.6262},
  {"sieve_id": 6,  "limite_min": 0.4380, "limite_max": 0.6380},
  {"sieve_id": 7,  "limite_min": 0.4451, "limite_max": 0.6451},
  {"sieve_id": 8,  "limite_min": 0.6480, "limite_max": 0.8480},
  {"sieve_id": 9,  "limite_min": 0.8560, "limite_max": 1.0000},
  {"sieve_id": 10, "limite_min": 1.0000, "limite_max": 1.0000}
]'::jsonb
WHERE id = '1edd0f28-0e53-4859-bb43-93257fabd5ba';
