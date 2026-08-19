-- =============================================================================
-- ESTUDO DE DOSAGEM — LAJE PROTENDIDA (WET CASTING)
-- =============================================================================
-- Schema para o motor de geração/ranqueamento de traços candidatos
-- (src/lib/wet-cast-optimizer.ts). Independente do modelo 1 análise = 1 traço
-- do wizard atual (analyses/analysis_materials/analysis_dosage) — um mesmo
-- produto pode ter vários experimentos/candidatos aqui.
--
-- Não altera rupture_schedules/idade em dias: resultado real de resistência
-- é gravado diretamente no próprio registro do experimento/candidato.
-- Sem seed nesta migration — os Experimentos A e B reais entram depois, por
-- uma migration/RPC separada, após mapeamento dos materiais reais cadastrados.
-- =============================================================================

-- Nota: sem FK para "produto" — não existe hoje uma tabela products
-- persistida no banco (PRODUTOS_DISPONIVEIS ainda é TODO/mock em
-- src/lib/analysis-data.ts). produto_nome fica desnormalizado, mesmo
-- padrão de production_batches.operador_nome; troca para FK quando
-- useProducts() for implementado.
CREATE TABLE dosage_experiments (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id           UUID REFERENCES organizations(id),
  produto_nome              TEXT,
  codigo                    TEXT NOT NULL,   -- "A", "B", "CAND-001"...
  origem                    TEXT NOT NULL,   -- EXPERIMENTO_REAL | CANDIDATO_GERADO
  status                    TEXT NOT NULL DEFAULT 'SIMULACAO',
  -- SIMULACAO | CANDIDATO_PARA_ENSAIO | EM_ENSAIO | VALIDADO_EXPERIMENTALMENTE | REPROVADO

  -- Composição por batelada (kg/litros) — cimento/água/aditivo isolados;
  -- agregados ficam em dosage_experiment_materials (array dinâmico de papéis).
  cimento_kg                DECIMAL(10,3) NOT NULL,
  agua_kg                   DECIMAL(10,3) NOT NULL,
  aditivo_kg                DECIMAL(10,3) NOT NULL DEFAULT 0,
  relacao_ac                DECIMAL(6,4),          -- calculado: agua_kg / cimento_kg
  aditivo_pct_cimento       DECIMAL(6,4),           -- calculado: aditivo_kg / cimento_kg
  densidade_cimento         DECIMAL(5,3) DEFAULT 3.15,
  volume_batelada_m3        DECIMAL(10,4),

  -- Resistência
  resultado_resistencia_mpa DECIMAL(6,2),           -- ensaio real registrado (24h)
  resistencia_estimada_mpa  DECIMAL(6,2),            -- estimativa do modelo (sempre rotulada "não validada" na UI)
  confianca_estimativa      TEXT,                    -- baixa | media | alta (sempre "baixa" nesta entrega)
  erro_estimado_vs_real_pct DECIMAL(6,2),

  -- Score/alertas/extrapolação do motor (recalculados no cliente; persistidos para histórico)
  score                     DECIMAL(12,4),
  extrapolacao              BOOLEAN DEFAULT false,
  extrapolacao_motivo       TEXT,
  alertas                   JSONB DEFAULT '[]'::jsonb,

  -- Experimento real com causa conhecida (execução/cura/adensamento) que
  -- explica um resultado fora do esperado: fica no histórico/comparação mas
  -- é excluído da calibragem cimento×resistência e da região de busca de
  -- candidatos (ver experimentosParaCalibragem em wet-cast-optimizer.ts).
  usar_na_calibragem        BOOLEAN NOT NULL DEFAULT true,
  motivo_exclusao_calibragem TEXT,

  -- Campos de registro simples (sem motor de cálculo em cima, ver plano)
  tipo_cimento              TEXT,
  tipo_cura                 TEXT,
  slump_cm                  DECIMAL(5,2),
  segregacao_observada      BOOLEAN,
  exsudacao_observada       BOOLEAN,
  observacoes               TEXT,

  registrado_por            UUID REFERENCES profiles(id),
  created_at                TIMESTAMPTZ DEFAULT now(),
  updated_at                TIMESTAMPTZ DEFAULT now(),
  UNIQUE(organization_id, codigo)
);

-- ============================================================
-- MATERIAIS DO EXPERIMENTO (array dinâmico, mesmo padrão de analysis_materials)
-- ============================================================
CREATE TABLE dosage_experiment_materials (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  experiment_id   UUID REFERENCES dosage_experiments(id) ON DELETE CASCADE,
  material_id     UUID REFERENCES materials(id),
  papel           TEXT,   -- graudo | areia | po_de_pedra | indefinido (classificarPapelAgregado)
  proporcao_kg    DECIMAL(10,3) NOT NULL,
  ordem           INTEGER
);

CREATE INDEX idx_dosage_experiments_org ON dosage_experiments(organization_id);
CREATE INDEX idx_dosage_experiments_status ON dosage_experiments(status);
CREATE INDEX idx_dosage_experiment_materials_experiment ON dosage_experiment_materials(experiment_id);

-- ============================================================
-- RLS — mesmo padrão de analyses/analysis_materials (003_rls.sql)
-- ============================================================
ALTER TABLE dosage_experiments           ENABLE ROW LEVEL SECURITY;
ALTER TABLE dosage_experiment_materials  ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org_isolation" ON dosage_experiments
  USING (organization_id = my_org_id());

CREATE POLICY "org_isolation" ON dosage_experiment_materials
  USING (
    experiment_id IN (
      SELECT id FROM dosage_experiments WHERE organization_id = my_org_id()
    )
  );

-- updated_at automático, mesmo padrão/função de 004_triggers.sql (set_updated_at)
CREATE TRIGGER set_updated_at_dosage_experiments
  BEFORE UPDATE ON dosage_experiments
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();
