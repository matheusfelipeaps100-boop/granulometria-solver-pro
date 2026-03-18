-- ============================================================
-- MIGRATION 001 — SCHEMA COMPLETO
-- Granulometria Solver Pro — Supabase PostgreSQL
-- Projeto: lhfxcjwpsjnpmgyyhbxi
-- ============================================================

-- Extensões necessárias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS pg_net;

-- ============================================================
-- ORGANIZAÇÕES
-- ============================================================
CREATE TABLE organizations (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome       TEXT NOT NULL,
  cnpj       TEXT,
  logo_url   TEXT,
  plano      TEXT DEFAULT 'trial', -- trial | pro | enterprise
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- PERFIS DE USUÁRIO (estende auth.users do Supabase)
-- ============================================================
CREATE TABLE profiles (
  id              UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES organizations(id),
  nome            TEXT NOT NULL,
  cargo           TEXT,
  telefone        TEXT,
  avatar_url      TEXT,
  role            TEXT NOT NULL DEFAULT 'laboratorio',
  -- roles: admin | gestor | laboratorio | producao | visualizador
  ativo           BOOLEAN DEFAULT true,
  tema            TEXT DEFAULT 'dark', -- dark | light | system
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- CONVITES
-- ============================================================
CREATE TABLE user_invites (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id),
  email           TEXT NOT NULL,
  role            TEXT NOT NULL,
  token           TEXT UNIQUE NOT NULL DEFAULT gen_random_uuid()::text,
  convidado_por   UUID REFERENCES profiles(id),
  aceito_em       TIMESTAMPTZ,
  expira_em       TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '72 hours'),
  created_at      TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- PENEIRAS
-- ============================================================
CREATE TABLE sieves (
  id          SERIAL PRIMARY KEY,
  abertura_mm DECIMAL(6,3) NOT NULL,
  nome        TEXT NOT NULL,
  ordem       INTEGER NOT NULL UNIQUE,
  usa_no_mf   BOOLEAN DEFAULT true
);

-- ============================================================
-- MATERIAIS
-- ============================================================
CREATE TABLE materials (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id),
  nome            TEXT NOT NULL,
  tipo            TEXT NOT NULL,
  -- tipos: areia_fina | areia_grossa | po_pedra | brita | granilha | outro
  fornecedor      TEXT,
  densidade       DECIMAL(5,3),
  mf              DECIMAL(5,3),
  ativo           BOOLEAN DEFAULT true,
  observacoes     TEXT,
  created_by      UUID REFERENCES profiles(id),
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- CURVAS GRANULOMÉTRICAS DOS MATERIAIS
-- ============================================================
CREATE TABLE material_gradations (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  material_id    UUID REFERENCES materials(id) ON DELETE CASCADE,
  sieve_id       INTEGER REFERENCES sieves(id),
  massa_retida   DECIMAL(10,4) NOT NULL DEFAULT 0,
  pct_individual DECIMAL(10,8), -- calculado pela Edge Function
  pct_acumulado  DECIMAL(10,8), -- calculado pela Edge Function
  UNIQUE(material_id, sieve_id)
);

-- ============================================================
-- DNA / CURVAS PADRÃO
-- ============================================================
CREATE TABLE standard_curves (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id  UUID REFERENCES organizations(id),
  nome             TEXT NOT NULL,
  tipo_produto     TEXT NOT NULL,
  -- tipos: bloco_estrutural | bloco_vedacao | paver | cp
  resistencia_alvo DECIMAL(6,2),
  modulo_finura    DECIMAL(6,4),
  descricao        TEXT,
  ativo            BOOLEAN DEFAULT true,
  created_by       UUID REFERENCES profiles(id),
  created_at       TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE standard_curve_items (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  curve_id      UUID REFERENCES standard_curves(id) ON DELETE CASCADE,
  sieve_id      INTEGER REFERENCES sieves(id),
  pct_retido    DECIMAL(10,8),
  pct_acumulado DECIMAL(10,8),
  limite_min    DECIMAL(10,8),
  limite_max    DECIMAL(10,8),
  UNIQUE(curve_id, sieve_id)
);

-- ============================================================
-- ANÁLISES (WIZARD 5 ETAPAS)
-- ============================================================
CREATE TABLE analyses (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id      UUID REFERENCES organizations(id),
  codigo               TEXT NOT NULL,   -- ANL-2026-001
  nome                 TEXT NOT NULL,
  tipo                 TEXT NOT NULL,   -- bloco_estrutural | bloco_vedacao | paver | cp
  produto              TEXT,
  resistencia_prevista DECIMAL(6,2),
  unidade              TEXT,
  analista_id          UUID REFERENCES profiles(id),
  standard_curve_id    UUID REFERENCES standard_curves(id),
  status               TEXT DEFAULT 'rascunho',
  -- rascunho | em_analise | aprovado | liberado_producao | arquivado
  wizard_step          INTEGER DEFAULT 1,
  observacoes          TEXT,
  aprovado_por         UUID REFERENCES profiles(id),
  aprovado_em          TIMESTAMPTZ,
  liberado_por         UUID REFERENCES profiles(id),
  liberado_em          TIMESTAMPTZ,
  data_analise         DATE DEFAULT CURRENT_DATE,
  created_by           UUID REFERENCES profiles(id),
  created_at           TIMESTAMPTZ DEFAULT now(),
  updated_at           TIMESTAMPTZ DEFAULT now(),
  UNIQUE(organization_id, codigo)
);

-- ============================================================
-- MATERIAIS DA ANÁLISE
-- ============================================================
CREATE TABLE analysis_materials (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  analysis_id   UUID REFERENCES analyses(id) ON DELETE CASCADE,
  material_id   UUID REFERENCES materials(id),
  proporcao_pct DECIMAL(8,6) NOT NULL, -- 0 a 1 (ex: 0.35 = 35%)
  massa_kg      DECIMAL(10,3),
  ordem         INTEGER
);

CREATE TABLE analysis_material_gradations (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  analysis_material_id UUID REFERENCES analysis_materials(id) ON DELETE CASCADE,
  sieve_id             INTEGER REFERENCES sieves(id),
  massa_retida         DECIMAL(10,3),
  UNIQUE(analysis_material_id, sieve_id)
);


-- ============================================================
-- RESULTADO GRANULOMÉTRICO (calculado pela Edge Function)
-- ============================================================
CREATE TABLE analysis_gradation_results (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  analysis_id     UUID REFERENCES analyses(id) ON DELETE CASCADE,
  sieve_id        INTEGER REFERENCES sieves(id),
  pct_combinado   DECIMAL(10,8),
  pct_acumulado   DECIMAL(10,8),
  target_pct      DECIMAL(10,8),
  limite_min      DECIMAL(10,8),
  limite_max      DECIMAL(10,8),
  desvio_absoluto DECIMAL(10,8),
  fora_da_faixa   BOOLEAN DEFAULT false,
  UNIQUE(analysis_id, sieve_id)
);

-- ============================================================
-- DOSAGEM DA ANÁLISE
-- ============================================================
CREATE TABLE analysis_dosage (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  analysis_id            UUID REFERENCES analyses(id) ON DELETE CASCADE UNIQUE,
  relacao_cimento        DECIMAL(8,4),
  relacao_ac             DECIMAL(6,4),
  volume_batelada_litros DECIMAL(10,3) DEFAULT 550,
  densidade_cimento      DECIMAL(5,3) DEFAULT 3.15,
  consumo_cimento_kg     DECIMAL(10,3),
  massa_total_kg         DECIMAL(10,3),
  agua_litros            DECIMAL(8,3),
  agregado_kg            DECIMAL(10,3),
  aditivos_ml            DECIMAL(8,2) DEFAULT 0,
  traco_final            TEXT,         -- '1:5.2'
  ordem_mistura          JSONB         -- ['cimento','areia','agua','aditivo']
);

-- ============================================================
-- LOTES DE PRODUÇÃO
-- ============================================================
CREATE TABLE production_batches (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id  UUID REFERENCES organizations(id),
  analysis_id      UUID REFERENCES analyses(id),
  batch_code       TEXT UNIQUE NOT NULL, -- LOTE-2026-001
  operador_id      UUID REFERENCES profiles(id),
  operador_nome    TEXT, -- desnormalizado para rastreabilidade histórica
  maquina          TEXT,
  volume_produzido DECIMAL(10,3),
  status           TEXT DEFAULT 'aguardando_rompimentos',
  -- aguardando_rompimentos | em_andamento | aprovado | aprovado_com_ressalva | reprovado
  notas            TEXT,
  produced_at      TIMESTAMPTZ DEFAULT now(),
  created_by       UUID REFERENCES profiles(id),
  created_at       TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- CRONOGRAMA DE ROMPIMENTOS
-- ============================================================
CREATE TABLE rupture_schedules (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id         UUID REFERENCES production_batches(id) ON DELETE CASCADE,
  idade_dias       INTEGER NOT NULL, -- 1 | 3 | 7 | 28
  data_prevista    DATE NOT NULL,
  data_executada   DATE,
  status           TEXT DEFAULT 'pendente',
  -- pendente | em_andamento | concluido | atrasado
  responsavel_id   UUID REFERENCES profiles(id),
  responsavel_nome TEXT, -- desnormalizado
  created_at       TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- ENSAIOS DE ROMPIMENTO
-- ============================================================
CREATE TABLE rupture_tests (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  schedule_id   UUID REFERENCES rupture_schedules(id) ON DELETE CASCADE,
  tipo_amostra  TEXT NOT NULL, -- bloco | paver | cp
  meta_mpa      DECIMAL(6,2),
  media_mpa     DECIMAL(8,4),  -- calculado
  min_mpa       DECIMAL(8,4),  -- calculado
  max_mpa       DECIMAL(8,4),  -- calculado
  desvio_padrao DECIMAL(8,4),  -- calculado
  status        TEXT DEFAULT 'pendente', -- pendente | conforme | nao_conforme
  notas         TEXT
);

-- ============================================================
-- AMOSTRAS INDIVIDUAIS (3 por ensaio)
-- ============================================================
CREATE TABLE rupture_samples (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  test_id        UUID REFERENCES rupture_tests(id) ON DELETE CASCADE,
  numero         INTEGER NOT NULL, -- 1 | 2 | 3
  forca_kn       DECIMAL(10,3),
  tensao_mpa     DECIMAL(8,4),    -- calculado: forca/0.0546/98.0665
  status         TEXT,             -- conforme | nao_conforme
  registrado_por UUID REFERENCES profiles(id),
  registrado_em  TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- RELATÓRIOS FINAIS DE QUALIDADE
-- ============================================================
CREATE TABLE quality_reports (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id),
  batch_id        UUID REFERENCES production_batches(id),
  analysis_id     UUID REFERENCES analyses(id),
  final_status    TEXT, -- aprovado | aprovado_com_ressalva | reprovado
  conclusion      TEXT,
  recommendations TEXT,
  pdf_url         TEXT, -- URL no Supabase Storage
  assinatura_lab  TEXT,
  assinatura_prod TEXT,
  assinatura_resp TEXT,
  emitido_por     UUID REFERENCES profiles(id),
  emitido_em      TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- WEBHOOKS
-- ============================================================
CREATE TABLE webhook_configs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id),
  nome            TEXT NOT NULL,
  url             TEXT NOT NULL,
  evento          TEXT NOT NULL,
  -- trace_approved | trace_released | batch_created | rupture_scheduled
  -- rupture_completed | sample_nonconformity | report_generated | batch_rejected
  secret          TEXT NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex'),
  ativo           BOOLEAN DEFAULT true,
  headers         JSONB DEFAULT '{}',
  retry_count     INTEGER DEFAULT 3,
  timeout_seconds INTEGER DEFAULT 30,
  created_by      UUID REFERENCES profiles(id),
  created_at      TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE webhook_logs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  webhook_id      UUID REFERENCES webhook_configs(id),
  evento          TEXT NOT NULL,
  payload         JSONB,
  response_status INTEGER,
  response_body   TEXT,
  tentativas      INTEGER DEFAULT 1,
  sucesso         BOOLEAN,
  disparado_em    TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- NOTIFICAÇÕES (Realtime via Supabase)
-- ============================================================
CREATE TABLE notifications (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id),
  user_id         UUID REFERENCES profiles(id),
  tipo            TEXT NOT NULL,
  -- rupture_due_today | rupture_overdue | trace_approved | trace_released
  -- batch_created | sample_nonconformity | report_ready | batch_rejected | user_invited | system
  titulo          TEXT NOT NULL,
  mensagem        TEXT NOT NULL,
  link            TEXT, -- rota interna: /ruptures/uuid
  lida            BOOLEAN DEFAULT false,
  dados           JSONB DEFAULT '{}',
  created_at      TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE notification_preferences (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               UUID REFERENCES profiles(id) UNIQUE,
  rupture_due_email     BOOLEAN DEFAULT true,
  rupture_due_push      BOOLEAN DEFAULT true,
  rupture_overdue_email BOOLEAN DEFAULT true,
  rupture_overdue_push  BOOLEAN DEFAULT true,
  trace_approved_email  BOOLEAN DEFAULT true,
  batch_rejected_email  BOOLEAN DEFAULT true,
  report_ready_email    BOOLEAN DEFAULT true,
  report_ready_push     BOOLEAN DEFAULT true,
  antecedencia_horas    INTEGER DEFAULT 24 -- 2 | 4 | 8 | 24
);

-- ============================================================
-- CONFIGURAÇÕES TÉCNICAS DA ORGANIZAÇÃO (1:1)
-- ============================================================
CREATE TABLE technical_settings (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id          UUID REFERENCES organizations(id) UNIQUE,

  -- Parâmetros de cálculo
  volume_batelada_padrao   DECIMAL(10,3) DEFAULT 550,
  densidade_cimento_padrao DECIMAL(5,3) DEFAULT 3.15,
  formula_tensao_a         DECIMAL(10,6) DEFAULT 0.0546,
  -- Tensão = Força ÷ formula_tensao_a ÷ formula_tensao_b
  formula_tensao_b         DECIMAL(10,4) DEFAULT 98.0665,

  -- Metas de rompimento — Bloco Estrutural (MPa)
  bloco_meta_1d  DECIMAL(6,2) DEFAULT 2.8,
  bloco_meta_3d  DECIMAL(6,2) DEFAULT 3.5,
  bloco_meta_7d  DECIMAL(6,2) DEFAULT 4.0,
  bloco_meta_28d DECIMAL(6,2) DEFAULT 4.0,

  -- Metas de rompimento — Paver (MPa)
  paver_meta_1d  DECIMAL(6,2) DEFAULT 22.0,
  paver_meta_3d  DECIMAL(6,2) DEFAULT 28.0,
  paver_meta_7d  DECIMAL(6,2) DEFAULT 35.0,
  paver_meta_28d DECIMAL(6,2) DEFAULT 35.0,

  -- Identidade visual e rodapé dos PDFs
  logo_url          TEXT,
  rodape_endereco   TEXT,
  rodape_cnpj       TEXT,
  rodape_responsavel TEXT,

  updated_at TIMESTAMPTZ DEFAULT now()
);
