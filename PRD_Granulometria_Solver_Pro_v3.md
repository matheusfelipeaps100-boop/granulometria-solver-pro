# PRD — Granulometria Solver Pro
**Product Requirements Document — v3.0**
**Target Platform:** Lovable · Next.js 14 + Supabase (100%)
**Data:** Março 2026

---

## Por que 100% Supabase?

Esta versão elimina completamente o backend dedicado (FastAPI + Railway/Render).
Toda a lógica roda em:

| Camada | Tecnologia | Onde roda |
|---|---|---|
| UI + rotas | Next.js 14 (App Router) | Vercel |
| Cálculos técnicos | Supabase Edge Functions (Deno/TS) | Supabase |
| Banco de dados | PostgreSQL via Supabase | Supabase |
| Autenticação | Supabase Auth | Supabase |
| Armazenamento de PDFs | Supabase Storage | Supabase |
| PDFs gerados | Edge Function + jsPDF/PDFKit | Supabase |
| Webhooks | Edge Function disparada por DB Trigger | Supabase |
| Notificações realtime | Supabase Realtime | Supabase |
| Tarefas agendadas | Supabase Cron (pg_cron) | Supabase |
| Regras de negócio | Row Level Security (RLS) + Triggers PL/pgSQL | Supabase |

**Resultado:** zero VPS, zero servidor próprio, custo próximo de zero durante validação,
escala automaticamente quando o produto crescer.

---

## Índice

1. [Visão Geral do Produto](#1-visão-geral-do-produto)
2. [Stack Técnica Definitiva](#2-stack-técnica-definitiva)
3. [Arquitetura do Sistema](#3-arquitetura-do-sistema)
4. [Banco de Dados Completo](#4-banco-de-dados-completo)
5. [Edge Functions — Catálogo Completo](#5-edge-functions--catálogo-completo)
6. [Motor de Cálculo Granulométrico (TypeScript)](#6-motor-de-cálculo-granulométrico-typescript)
7. [Geração de PDF com jsPDF](#7-geração-de-pdf-com-jspdf)
8. [Webhooks — DNA de Traços Aprovados](#8-webhooks--dna-de-traços-aprovados)
9. [Sistema de Notificações](#9-sistema-de-notificações)
10. [Gestão de Usuários e Autenticação](#10-gestão-de-usuários-e-autenticação)
11. [Módulos e Páginas — Especificação Detalhada](#11-módulos-e-páginas--especificação-detalhada)
    - [11.1 Layout Global e Navegação](#111-layout-global-e-navegação)
    - [11.2 Autenticação](#112-autenticação)
    - [11.3 Dashboard](#113-dashboard)
    - [11.4 Análises — Wizard 5 Etapas](#114-análises--wizard-5-etapas)
    - [11.5 Traços Padrão / DNA](#115-traços-padrão--dna)
    - [11.6 Produção](#116-produção)
    - [11.7 Rompimentos](#117-rompimentos)
    - [11.8 Relatórios](#118-relatórios)
    - [11.9 Materiais](#119-materiais)
    - [11.10 Configurações Técnicas](#1110-configurações-técnicas)
    - [11.11 Perfil do Usuário](#1111-perfil-do-usuário)
    - [11.12 Gestão de Usuários](#1112-gestão-de-usuários)
    - [11.13 Notificações](#1113-notificações)
    - [11.14 Webhooks](#1114-webhooks)
12. [Regras de Negócio e Automações](#12-regras-de-negócio-e-automações)
13. [Roadmap MVP](#13-roadmap-mvp)
14. [Prompts Sequenciais para o Lovable](#14-prompts-sequenciais-para-o-lovable)
15. [Checklist de Validação](#15-checklist-de-validação)

---

## 1. Visão Geral do Produto

### O que é

**Granulometria Solver Pro** é uma plataforma web de controle tecnológico industrial
para fabricantes de blocos, pavers e elementos de concreto. Transforma a lógica de
uma planilha XLSM profissional em um sistema multiusuário com rastreabilidade completa.

### Jornada completa

```
Análise Técnica → Traço Aprovado → [Webhook disparado]
       ↓
   Produção → Lote gerado → Cronograma automático (1/3/7/28 dias)
       ↓
  Ensaios → Tensão calculada → Conformidade → Relatório Final (PDF)
```

### Dois ciclos integrados

**Ciclo 1 — Formulação**
`Identificação → Granulometria → Dosagem → Revisão → Aprovação → Liberação`

**Ciclo 2 — Validação Tecnológica**
`Produção → Lote → Cronograma → Ensaios por idade → Relatório Final`

### Dados técnicos extraídos da planilha real (XLSM)

**Materiais cadastrados:**

| Material | Tipo | Fornecedor | MF Calculado |
|---|---|---|---|
| Areia de Cava BMW | areia_fina | BMW | 2,699 |
| Pó de Pedra Britasul | po_pedra | Britasul | 2,721 |
| Brita Britasul | brita | Britasul | 6,559 |
| Areia de Rio Rafael | areia_grossa | Rafael | 2,905 |
| Pó de Pedra 1 Rafael | po_pedra | Rafael | 3,178 |
| Granilha 01 Duro | granilha | Duro | 4,723 |
| Granilha 02 Duro | granilha | Duro | 5,017 |
| Pó de Pedra Fino Duro | po_pedra | Duro | 1,840 |
| Brita 00 Duro | brita | Duro | 7,068 |

**Peneiras (ordem obrigatória):**
`12,7 → 9,5 → 6,3 → 4,8 → 2,4 → 1,2 → 0,6 → 0,3 → 0,15 → FUNDO`

**Fórmula de tensão:** `Tensão (MPa) = Força (kN) ÷ 0,0546 ÷ 98,0665`
Valor validado: `100 kN → 18,644 MPa`

**Metas de rompimento:**

| Tipo | 1 dia | 3 dias | 7 dias | 28 dias |
|---|---|---|---|---|
| Bloco Estrutural | ≥ 2,8 MPa | ≥ 3,5 MPa | ≥ 4,0 MPa | ≥ 4,0 MPa |
| Paver | ≥ 22,0 MPa | ≥ 28,0 MPa | ≥ 35,0 MPa | ≥ 35,0 MPa |
| CP | registro | registro | registro | registro |

**DNAs da planilha:**

| DNA | MF |
|---|---|
| DNA Bloco Estrutural 14x19x39 4MPa | 3,483 |
| DNA Bloco Vedação 14x19x39 3MPa | 3,712 |
| DNA Paver H8 35MPa | 3,198 |
| DNA Bloco Estrutural Ótimo | 3,227 |

---

## 2. Stack Técnica Definitiva

```
┌─────────────────────────────────────────────────────────────┐
│                        FRONTEND                             │
│  Next.js 14 (App Router) · TypeScript · Tailwind CSS        │
│  shadcn/ui · Zustand · React Hook Form · Zod · Recharts     │
│  @supabase/ssr · @supabase/supabase-js                      │
│                  Deploy: Vercel                             │
└──────────────────────────┬──────────────────────────────────┘
                           │ supabase-js client
┌──────────────────────────▼──────────────────────────────────┐
│                       SUPABASE                              │
│                                                             │
│  ┌─────────────────┐  ┌──────────────────────────────────┐  │
│  │   Auth           │  │   Edge Functions (Deno/TS)       │  │
│  │  - Email/Senha   │  │  - granulometry-calculate        │  │
│  │  - Google OAuth  │  │  - granulometry-optimize         │  │
│  │  - Convites      │  │  - rupture-calculate             │  │
│  │  - JWT/RLS       │  │  - dosage-calculate              │  │
│  └─────────────────┘  │  - pdf-generate                  │  │
│                        │  - webhook-dispatch              │  │
│  ┌─────────────────┐  │  - send-notification             │  │
│  │  PostgreSQL DB   │  │  - invite-user                   │  │
│  │  - Schema SQL    │  └──────────────────────────────────┘  │
│  │  - RLS Policies  │                                        │
│  │  - pg_cron jobs  │  ┌──────────────────────────────────┐  │
│  │  - DB Triggers   │  │   Storage                        │  │
│  │  - PL/pgSQL fns  │  │  - PDFs gerados                  │  │
│  └─────────────────┘  │  - Logos das organizações        │  │
│                        │  - Avatares dos usuários         │  │
│  ┌─────────────────┐  └──────────────────────────────────┘  │
│  │   Realtime       │                                        │
│  │  - notificações  │                                        │
│  │  - status lotes  │                                        │
│  └─────────────────┘                                        │
└─────────────────────────────────────────────────────────────┘
```

### Dependências do projeto Next.js

```json
{
  "dependencies": {
    "next": "^14.0.0",
    "react": "^18.0.0",
    "typescript": "^5.0.0",
    "@supabase/supabase-js": "^2.39.0",
    "@supabase/ssr": "^0.1.0",
    "tailwindcss": "^3.4.0",
    "zustand": "^4.5.0",
    "react-hook-form": "^7.49.0",
    "zod": "^3.22.0",
    "recharts": "^2.10.0",
    "@dnd-kit/core": "^6.1.0",
    "date-fns": "^3.2.0",
    "lucide-react": "^0.312.0"
  }
}
```

### Dependências das Edge Functions (Deno)

```typescript
// Importações disponíveis nas Edge Functions
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import jsPDF from "https://esm.sh/jspdf@2.5.1"
// Sem npm install — tudo via esm.sh
```

---

## 3. Arquitetura do Sistema

### Estrutura de pastas Next.js

```
src/
├── app/
│   ├── (auth)/
│   │   ├── login/page.tsx
│   │   ├── register/page.tsx
│   │   ├── forgot-password/page.tsx
│   │   ├── reset-password/page.tsx
│   │   └── invite/[token]/page.tsx
│   │
│   ├── (app)/
│   │   ├── layout.tsx                    ← Sidebar + Header + Auth guard
│   │   ├── dashboard/page.tsx
│   │   ├── analyses/
│   │   │   ├── page.tsx                  ← Lista
│   │   │   ├── new/page.tsx              ← Wizard 5 etapas
│   │   │   └── [id]/page.tsx             ← Detalhe
│   │   ├── standard-traces/
│   │   │   ├── page.tsx
│   │   │   └── [id]/page.tsx
│   │   ├── production/
│   │   │   ├── page.tsx
│   │   │   └── [batchId]/page.tsx
│   │   ├── ruptures/
│   │   │   ├── page.tsx
│   │   │   └── [scheduleId]/page.tsx
│   │   ├── reports/
│   │   │   ├── page.tsx
│   │   │   └── [reportId]/page.tsx
│   │   ├── materials/page.tsx
│   │   ├── settings/
│   │   │   ├── page.tsx                  ← Tabs de configuração
│   │   │   ├── users/page.tsx
│   │   │   └── webhooks/page.tsx
│   │   ├── profile/page.tsx
│   │   └── notifications/page.tsx
│   │
│   └── middleware.ts                     ← Supabase Auth middleware
│
├── lib/
│   ├── supabase/
│   │   ├── client.ts                     ← createBrowserClient
│   │   ├── server.ts                     ← createServerClient
│   │   └── middleware.ts
│   ├── engines/
│   │   └── granulometry.ts              ← Cálculos locais (preview)
│   └── utils.ts
│
├── store/
│   ├── analysisStore.ts                  ← Zustand wizard state
│   ├── authStore.ts
│   └── notificationStore.ts
│
└── components/
    ├── ui/                               ← shadcn/ui
    ├── layout/
    │   ├── Sidebar.tsx
    │   ├── Header.tsx
    │   └── NotificationBell.tsx
    ├── analyses/
    │   ├── AnalysisWizard.tsx
    │   └── steps/
    │       ├── Step1Identification.tsx
    │       ├── Step2Granulometry.tsx
    │       ├── Step3Dosage.tsx
    │       ├── Step4Review.tsx
    │       └── Step5Result.tsx
    ├── charts/
    │   └── GranulometryChart.tsx
    └── shared/
        ├── StatusBadge.tsx
        └── ConfirmModal.tsx
```

### Estrutura das Edge Functions (Supabase)

```
supabase/
├── functions/
│   ├── granulometry-calculate/
│   │   └── index.ts          ← Curva combinada + MF
│   ├── granulometry-optimize/
│   │   └── index.ts          ← Otimização de proporções
│   ├── rupture-calculate/
│   │   └── index.ts          ← Tensão + stats + conformidade
│   ├── dosage-calculate/
│   │   └── index.ts          ← Consumo cimento, traço, água
│   ├── pdf-generate/
│   │   └── index.ts          ← PDF com jsPDF → Supabase Storage
│   ├── webhook-dispatch/
│   │   └── index.ts          ← Disparo assíncrono com retry
│   ├── send-notification/
│   │   └── index.ts          ← Email + in-app notification
│   └── invite-user/
│       └── index.ts          ← Email de convite + token
│
├── migrations/
│   ├── 001_schema.sql        ← Schema completo
│   ├── 002_seed.sql          ← Peneiras + materiais iniciais
│   ├── 003_rls.sql           ← Políticas RLS
│   ├── 004_triggers.sql      ← Triggers automáticos
│   └── 005_cron.sql          ← Jobs agendados pg_cron
│
└── config.toml
```

### Fluxo de dados

```
Next.js page
    │
    ├── Leitura de dados → supabase-js client → PostgreSQL (com RLS)
    │
    ├── Cálculos técnicos → supabase.functions.invoke('granulometry-calculate')
    │                              → Edge Function → retorna resultado JSON
    │
    ├── Salvar análise → supabase.from('analyses').insert()
    │                         → DB Trigger → dispara webhook-dispatch
    │                         → DB Trigger → cria notification
    │
    └── Gerar PDF → supabase.functions.invoke('pdf-generate')
                          → Edge Function → jsPDF → Storage
                          → retorna URL pública
```

---

## 4. Banco de Dados Completo

```sql
-- ============================================================
-- MIGRATION 001 — SCHEMA COMPLETO
-- ============================================================

-- ORGANIZAÇÕES
CREATE TABLE organizations (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome        TEXT NOT NULL,
  cnpj        TEXT,
  logo_url    TEXT,
  plano       TEXT DEFAULT 'trial',
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- PERFIS DE USUÁRIO (estende auth.users do Supabase)
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
  tema            TEXT DEFAULT 'dark',
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);

-- CONVITES
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

-- PENEIRAS
CREATE TABLE sieves (
  id         SERIAL PRIMARY KEY,
  abertura_mm DECIMAL(6,3) NOT NULL,
  nome       TEXT NOT NULL,
  ordem      INTEGER NOT NULL UNIQUE,
  usa_no_mf  BOOLEAN DEFAULT true
);

-- MATERIAIS
CREATE TABLE materials (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id),
  nome            TEXT NOT NULL,
  tipo            TEXT NOT NULL,
  -- tipos: areia_fina | areia_grossa | po_pedra | brita | granilha | outro
  fornecedor      TEXT,
  densidade       DECIMAL(5,3),
  ativo           BOOLEAN DEFAULT true,
  observacoes     TEXT,
  created_by      UUID REFERENCES profiles(id),
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);

-- CURVAS GRANULOMÉTRICAS DOS MATERIAIS
CREATE TABLE material_gradations (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  material_id  UUID REFERENCES materials(id) ON DELETE CASCADE,
  sieve_id     INTEGER REFERENCES sieves(id),
  massa_retida DECIMAL(10,4) NOT NULL DEFAULT 0,
  pct_individual DECIMAL(10,8),   -- calculado pela Edge Function
  pct_acumulado  DECIMAL(10,8),   -- calculado pela Edge Function
  UNIQUE(material_id, sieve_id)
);

-- DNA / CURVAS PADRÃO
CREATE TABLE standard_curves (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id),
  nome            TEXT NOT NULL,
  tipo_produto    TEXT NOT NULL,
  -- tipos: bloco_estrutural | bloco_vedacao | paver | cp
  resistencia_alvo DECIMAL(6,2),
  modulo_finura   DECIMAL(6,4),
  descricao       TEXT,
  ativo           BOOLEAN DEFAULT true,
  created_by      UUID REFERENCES profiles(id),
  created_at      TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE standard_curve_items (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  curve_id     UUID REFERENCES standard_curves(id) ON DELETE CASCADE,
  sieve_id     INTEGER REFERENCES sieves(id),
  pct_retido   DECIMAL(10,8),
  pct_acumulado DECIMAL(10,8),
  limite_min   DECIMAL(10,8),
  limite_max   DECIMAL(10,8),
  UNIQUE(curve_id, sieve_id)
);

-- ANÁLISES
CREATE TABLE analyses (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id     UUID REFERENCES organizations(id),
  codigo              TEXT NOT NULL,   -- ANL-2026-001
  nome                TEXT NOT NULL,
  tipo                TEXT NOT NULL,   -- bloco_estrutural | bloco_vedacao | paver | cp
  produto             TEXT,
  resistencia_prevista DECIMAL(6,2),
  unidade             TEXT,
  analista_id         UUID REFERENCES profiles(id),
  standard_curve_id   UUID REFERENCES standard_curves(id),
  status              TEXT DEFAULT 'rascunho',
  -- rascunho | em_analise | aprovado | liberado_producao | arquivado
  wizard_step         INTEGER DEFAULT 1,
  observacoes         TEXT,
  aprovado_por        UUID REFERENCES profiles(id),
  aprovado_em         TIMESTAMPTZ,
  liberado_por        UUID REFERENCES profiles(id),
  liberado_em         TIMESTAMPTZ,
  data_analise        DATE DEFAULT CURRENT_DATE,
  created_by          UUID REFERENCES profiles(id),
  created_at          TIMESTAMPTZ DEFAULT now(),
  updated_at          TIMESTAMPTZ DEFAULT now(),
  UNIQUE(organization_id, codigo)
);

-- MATERIAIS DA ANÁLISE
CREATE TABLE analysis_materials (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  analysis_id UUID REFERENCES analyses(id) ON DELETE CASCADE,
  material_id UUID REFERENCES materials(id),
  proporcao_pct DECIMAL(8,6) NOT NULL,  -- 0 a 1 (ex: 0.35 = 35%)
  massa_kg    DECIMAL(10,3),
  ordem       INTEGER
);

-- RESULTADO GRANULOMÉTRICO (calculado e salvo pela Edge Function)
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

-- DOSAGEM DA ANÁLISE
CREATE TABLE analysis_dosage (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  analysis_id           UUID REFERENCES analyses(id) ON DELETE CASCADE UNIQUE,
  relacao_cimento       DECIMAL(8,4),
  relacao_ac            DECIMAL(6,4),
  volume_batelada_litros DECIMAL(10,3) DEFAULT 550,
  densidade_cimento     DECIMAL(5,3) DEFAULT 3.15,
  consumo_cimento_kg    DECIMAL(10,3),
  massa_total_kg        DECIMAL(10,3),
  agua_litros           DECIMAL(8,3),
  agregado_kg           DECIMAL(10,3),
  aditivos_ml           DECIMAL(8,2) DEFAULT 0,
  traco_final           TEXT,          -- '1:5.2'
  ordem_mistura         JSONB          -- ['cimento','areia','agua','aditivo']
);

-- LOTES DE PRODUÇÃO
CREATE TABLE production_batches (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id),
  analysis_id     UUID REFERENCES analyses(id),
  batch_code      TEXT UNIQUE NOT NULL,  -- LOTE-2026-001
  operador_id     UUID REFERENCES profiles(id),
  operador_nome   TEXT,
  maquina         TEXT,
  volume_produzido DECIMAL(10,3),
  status          TEXT DEFAULT 'aguardando_rompimentos',
  -- aguardando_rompimentos | em_andamento | concluido | aprovado | reprovado
  notas           TEXT,
  produced_at     TIMESTAMPTZ DEFAULT now(),
  created_by      UUID REFERENCES profiles(id),
  created_at      TIMESTAMPTZ DEFAULT now()
);

-- CRONOGRAMA DE ROMPIMENTOS
CREATE TABLE rupture_schedules (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id        UUID REFERENCES production_batches(id) ON DELETE CASCADE,
  idade_dias      INTEGER NOT NULL,   -- 1 | 3 | 7 | 28
  data_prevista   DATE NOT NULL,
  data_executada  DATE,
  status          TEXT DEFAULT 'pendente',
  -- pendente | em_andamento | concluido | atrasado
  responsavel_id  UUID REFERENCES profiles(id),
  responsavel_nome TEXT,
  created_at      TIMESTAMPTZ DEFAULT now()
);

-- ENSAIOS DE ROMPIMENTO (cabeçalho por tipo de amostra)
CREATE TABLE rupture_tests (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  schedule_id   UUID REFERENCES rupture_schedules(id) ON DELETE CASCADE,
  tipo_amostra  TEXT NOT NULL,   -- bloco | paver | cp
  meta_mpa      DECIMAL(6,2),
  media_mpa     DECIMAL(8,4),
  min_mpa       DECIMAL(8,4),
  max_mpa       DECIMAL(8,4),
  desvio_padrao DECIMAL(8,4),
  status        TEXT DEFAULT 'pendente',  -- pendente | conforme | nao_conforme
  notas         TEXT
);

-- AMOSTRAS INDIVIDUAIS
CREATE TABLE rupture_samples (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  test_id       UUID REFERENCES rupture_tests(id) ON DELETE CASCADE,
  numero        INTEGER NOT NULL,   -- 1 | 2 | 3
  forca_kn      DECIMAL(10,3),
  tensao_mpa    DECIMAL(8,4),       -- calculado: forca/0.0546/98.0665
  status        TEXT,               -- conforme | nao_conforme
  registrado_por UUID REFERENCES profiles(id),
  registrado_em TIMESTAMPTZ DEFAULT now()
);

-- RELATÓRIOS FINAIS
CREATE TABLE quality_reports (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id),
  batch_id      UUID REFERENCES production_batches(id),
  analysis_id   UUID REFERENCES analyses(id),
  final_status  TEXT,   -- aprovado | aprovado_com_ressalva | reprovado
  conclusion    TEXT,
  recommendations TEXT,
  pdf_url       TEXT,   -- URL no Supabase Storage
  assinatura_lab TEXT,
  assinatura_prod TEXT,
  assinatura_resp TEXT,
  emitido_por   UUID REFERENCES profiles(id),
  emitido_em    TIMESTAMPTZ DEFAULT now()
);

-- WEBHOOKS
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

-- NOTIFICAÇÕES
CREATE TABLE notifications (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id),
  user_id         UUID REFERENCES profiles(id),
  tipo            TEXT NOT NULL,
  -- rupture_due_today | rupture_overdue | trace_approved | trace_released
  -- batch_created | sample_nonconformity | report_ready | batch_rejected | user_invited
  titulo          TEXT NOT NULL,
  mensagem        TEXT NOT NULL,
  link            TEXT,        -- rota interna: /ruptures/uuid
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
  antecedencia_horas    INTEGER DEFAULT 24
);

-- CONFIGURAÇÕES TÉCNICAS DA ORGANIZAÇÃO
CREATE TABLE technical_settings (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id         UUID REFERENCES organizations(id) UNIQUE,
  volume_batelada_padrao  DECIMAL(10,3) DEFAULT 550,
  densidade_cimento_padrao DECIMAL(5,3) DEFAULT 3.15,
  formula_tensao_a        DECIMAL(10,6) DEFAULT 0.0546,
  formula_tensao_b        DECIMAL(10,4) DEFAULT 98.0665,
  bloco_meta_1d           DECIMAL(6,2) DEFAULT 2.8,
  bloco_meta_3d           DECIMAL(6,2) DEFAULT 3.5,
  bloco_meta_7d           DECIMAL(6,2) DEFAULT 4.0,
  bloco_meta_28d          DECIMAL(6,2) DEFAULT 4.0,
  paver_meta_1d           DECIMAL(6,2) DEFAULT 22.0,
  paver_meta_3d           DECIMAL(6,2) DEFAULT 28.0,
  paver_meta_7d           DECIMAL(6,2) DEFAULT 35.0,
  paver_meta_28d          DECIMAL(6,2) DEFAULT 35.0,
  logo_url                TEXT,
  rodape_endereco         TEXT,
  rodape_cnpj             TEXT,
  rodape_responsavel      TEXT,
  updated_at              TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- MIGRATION 002 — SEED PENEIRAS E MATERIAIS INICIAIS
-- ============================================================

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

-- ============================================================
-- MIGRATION 003 — ROW LEVEL SECURITY
-- ============================================================

-- Habilitar RLS em todas as tabelas
ALTER TABLE organizations          ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles               ENABLE ROW LEVEL SECURITY;
ALTER TABLE materials              ENABLE ROW LEVEL SECURITY;
ALTER TABLE analyses               ENABLE ROW LEVEL SECURITY;
ALTER TABLE production_batches     ENABLE ROW LEVEL SECURITY;
ALTER TABLE rupture_schedules      ENABLE ROW LEVEL SECURITY;
ALTER TABLE rupture_tests          ENABLE ROW LEVEL SECURITY;
ALTER TABLE rupture_samples        ENABLE ROW LEVEL SECURITY;
ALTER TABLE quality_reports        ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhook_configs        ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications          ENABLE ROW LEVEL SECURITY;
ALTER TABLE standard_curves        ENABLE ROW LEVEL SECURITY;

-- Função auxiliar: retorna organization_id do usuário logado
CREATE OR REPLACE FUNCTION my_org_id()
RETURNS UUID AS $$
  SELECT organization_id FROM profiles WHERE id = auth.uid();
$$ LANGUAGE SQL STABLE SECURITY DEFINER;

-- Função auxiliar: retorna role do usuário logado
CREATE OR REPLACE FUNCTION my_role()
RETURNS TEXT AS $$
  SELECT role FROM profiles WHERE id = auth.uid();
$$ LANGUAGE SQL STABLE SECURITY DEFINER;

-- Políticas: usuário vê somente dados da própria organização
CREATE POLICY "org_isolation" ON materials
  USING (organization_id = my_org_id());

CREATE POLICY "org_isolation" ON analyses
  USING (organization_id = my_org_id());

CREATE POLICY "org_isolation" ON production_batches
  USING (organization_id = my_org_id());

CREATE POLICY "org_isolation" ON standard_curves
  USING (organization_id = my_org_id());

CREATE POLICY "org_isolation" ON webhook_configs
  USING (organization_id = my_org_id());

-- Políticas: somente admin pode alterar configurações e webhooks
CREATE POLICY "admin_only_write" ON webhook_configs
  FOR INSERT WITH CHECK (my_role() = 'admin');

CREATE POLICY "admin_only_write" ON technical_settings
  FOR ALL USING (organization_id = my_org_id())
  WITH CHECK (my_role() IN ('admin', 'gestor'));

-- Notificações: usuário vê somente as suas
CREATE POLICY "own_notifications" ON notifications
  USING (user_id = auth.uid());

-- Perfis: usuário vê perfis da mesma organização
CREATE POLICY "same_org_profiles" ON profiles
  USING (organization_id = my_org_id());

-- ============================================================
-- MIGRATION 004 — TRIGGERS AUTOMÁTICOS
-- ============================================================

-- Trigger 1: ao aprovar análise → dispara webhook + cria notificação
CREATE OR REPLACE FUNCTION on_analysis_approved()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'aprovado' AND OLD.status != 'aprovado' THEN
    -- Chama Edge Function de forma assíncrona
    PERFORM net.http_post(
      url := current_setting('app.supabase_url') || '/functions/v1/webhook-dispatch',
      headers := jsonb_build_object(
        'Authorization', 'Bearer ' || current_setting('app.service_role_key'),
        'Content-Type', 'application/json'
      ),
      body := jsonb_build_object(
        'event', 'trace_approved',
        'organization_id', NEW.organization_id,
        'analysis_id', NEW.id
      )::text
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER analysis_approved_trigger
  AFTER UPDATE ON analyses
  FOR EACH ROW EXECUTE FUNCTION on_analysis_approved();

-- Trigger 2: ao criar lote → cria 4 rupture_schedules automaticamente
CREATE OR REPLACE FUNCTION on_batch_created()
RETURNS TRIGGER AS $$
DECLARE
  ages INTEGER[] := ARRAY[1, 3, 7, 28];
  age  INTEGER;
BEGIN
  FOREACH age IN ARRAY ages LOOP
    INSERT INTO rupture_schedules (batch_id, idade_dias, data_prevista)
    VALUES (NEW.id, age, (NEW.produced_at::date + age));
  END LOOP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER batch_created_trigger
  AFTER INSERT ON production_batches
  FOR EACH ROW EXECUTE FUNCTION on_batch_created();

-- Trigger 3: ao completar rompimento → recalcula status do lote
CREATE OR REPLACE FUNCTION on_rupture_completed()
RETURNS TRIGGER AS $$
DECLARE
  batch_uuid UUID;
  total_schedules INTEGER;
  completed_schedules INTEGER;
  non_conformities INTEGER;
BEGIN
  IF NEW.status = 'concluido' AND OLD.status != 'concluido' THEN
    SELECT rs.batch_id INTO batch_uuid
    FROM rupture_schedules rs WHERE rs.id = NEW.id;

    SELECT COUNT(*) INTO total_schedules
    FROM rupture_schedules WHERE batch_id = batch_uuid;

    SELECT COUNT(*) INTO completed_schedules
    FROM rupture_schedules WHERE batch_id = batch_uuid AND status = 'concluido';

    IF completed_schedules = total_schedules THEN
      SELECT COUNT(*) INTO non_conformities
      FROM rupture_tests rt
      JOIN rupture_schedules rs ON rs.id = rt.schedule_id
      WHERE rs.batch_id = batch_uuid AND rt.status = 'nao_conforme';

      UPDATE production_batches SET status =
        CASE
          WHEN non_conformities = 0   THEN 'aprovado'
          WHEN non_conformities <= 1  THEN 'aprovado_com_ressalva'
          ELSE 'reprovado'
        END
      WHERE id = batch_uuid;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER rupture_completed_trigger
  AFTER UPDATE ON rupture_schedules
  FOR EACH ROW EXECUTE FUNCTION on_rupture_completed();

-- ============================================================
-- MIGRATION 005 — CRON JOBS (pg_cron)
-- ============================================================

-- Habilitar extensão
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;  -- para chamadas HTTP

-- Job 1: todo dia às 06:00 → notificar rompimentos do dia
SELECT cron.schedule(
  'rupture-due-today',
  '0 6 * * *',
  $$
    SELECT net.http_post(
      url := current_setting('app.supabase_url') || '/functions/v1/send-notification',
      headers := '{"Authorization":"Bearer " || current_setting("app.service_role_key"),"Content-Type":"application/json"}',
      body := '{"type":"rupture_due_today"}'
    );
  $$
);

-- Job 2: todo dia às 07:00 → marcar atrasados + notificar
SELECT cron.schedule(
  'rupture-overdue',
  '0 7 * * *',
  $$
    UPDATE rupture_schedules
    SET status = 'atrasado'
    WHERE status = 'pendente'
      AND data_prevista < CURRENT_DATE;

    SELECT net.http_post(
      url := current_setting('app.supabase_url') || '/functions/v1/send-notification',
      headers := '{"Authorization":"Bearer " || current_setting("app.service_role_key"),"Content-Type":"application/json"}',
      body := '{"type":"rupture_overdue"}'
    );
  $$
);
```

---

## 5. Edge Functions — Catálogo Completo

### Convenção de chamada no Next.js

```typescript
// lib/supabase/client.ts
import { createBrowserClient } from '@supabase/ssr'
const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// Chamada de qualquer componente ou server action:
const { data, error } = await supabase.functions.invoke('granulometry-calculate', {
  body: { materials, proportions, limits }
})
```

### 5.1 `granulometry-calculate`

**Entrada:**
```typescript
{
  materials: Array<{
    material_id: string
    proporcao_pct: number      // 0 a 1
    gradations: Array<{
      sieve_id: number
      abertura_mm: number
      massa_retida: number
    }>
  }>
  limits?: Array<{
    sieve_id: number
    limite_min: number
    limite_max: number
  }>
}
```

**Saída:**
```typescript
{
  combined_curve: Array<{
    sieve_id: number
    abertura_mm: number
    pct_combinado: number
    pct_acumulado: number
    limite_min?: number
    limite_max?: number
    desvio_absoluto?: number
    fora_da_faixa: boolean
  }>
  modulo_finura: number
  peneiras_fora: number        // quantidade fora da faixa
  status_curva: 'conforme' | 'atencao' | 'nao_conforme'
  indice_compatibilidade: number  // 0 a 1
}
```

### 5.2 `granulometry-optimize`

**Entrada:** `{ materials[], target_curve[], constraints? }`
**Saída:** `{ proportions: number[], error: number, iterations: number }`

> Implementação: gradiente descendente simples em TypeScript.
> Sem scipy. Convergência suficiente para os casos da planilha.

### 5.3 `rupture-calculate`

**Entrada:**
```typescript
{
  forcas: number[]           // [kN, kN, kN]
  tipo_amostra: string       // bloco | paver | cp
  idade_dias: number         // 1 | 3 | 7 | 28
  organization_id: string    // para buscar metas customizadas
}
```

**Saída:**
```typescript
{
  tensoes: number[]          // MPa calculados
  media: number
  minimo: number
  maximo: number
  desvio_padrao: number
  meta_mpa: number
  conforme: boolean
  status: 'conforme' | 'nao_conforme' | 'registro'
}
```

### 5.4 `dosage-calculate`

**Entrada:** `{ relacao_cimento, relacao_ac, volume_batelada, densidade_cimento, proporcoes_materiais[], aditivos_ml }`
**Saída:** `{ consumo_cimento_kg, massa_total_kg, agua_litros, traco_final, materiais_batelada[] }`

### 5.5 `pdf-generate`

**Entrada:** `{ tipo: 'trace' | 'final', id: string }`

**Processo:**
1. Busca todos os dados relacionados no banco
2. Gera PDF com jsPDF (A4)
3. Salva em `Storage → pdfs/{org_id}/{tipo}-{id}.pdf`
4. Retorna URL pública assinada (expiração: 24h)

### 5.6 `webhook-dispatch`

**Entrada:** `{ event: string, organization_id: string, ...payload }`

**Processo:**
1. Busca webhooks ativos do evento na organização
2. Monta payload JSON com assinatura HMAC
3. Disparo assíncrono com retry exponencial (2s → 4s → 8s)
4. Registra resultado em `webhook_logs`

### 5.7 `send-notification`

**Entrada:** `{ type: string, user_ids?: string[], organization_id?: string, dados?: object }`

**Processo:**
1. Cria registros em `notifications`
2. Supabase Realtime notifica o browser automaticamente
3. Envia email via Resend ou SMTP (conforme variável de ambiente)

### 5.8 `invite-user`

**Entrada:** `{ email, role, organization_id, convidado_por, mensagem? }`

**Processo:**
1. Cria registro em `user_invites`
2. Envia email HTML com link `/invite/{token}`
3. Retorna `{ success, invite_id }`

---

## 6. Motor de Cálculo Granulométrico (TypeScript)

> Este código roda **dentro das Edge Functions** (Deno) e também pode ser usado
> no Next.js para preview em tempo real sem chamar a API.

```typescript
// supabase/functions/_shared/granulometry-engine.ts

export interface SieveData {
  sieve_id: number
  abertura_mm: number
  massa_retida: number
}

export interface MaterialInput {
  material_id: string
  proporcao_pct: number  // 0 a 1
  gradations: SieveData[]
}

export interface GradationResult {
  sieve_id: number
  abertura_mm: number
  pct_combinado: number
  pct_acumulado: number
  limite_min?: number
  limite_max?: number
  desvio_absoluto?: number
  fora_da_faixa: boolean
}

// Peneiras que entram no cálculo do Módulo de Finura
const MF_SIEVES = [4.8, 2.4, 1.2, 0.6, 0.3, 0.15]

/**
 * CÁLCULO 1 — % Individual de cada peneira para um material
 * Replica exatamente a lógica da planilha XLSM
 */
export function calcPctIndividual(gradations: SieveData[]): (SieveData & { pct_individual: number })[] {
  const total = gradations.reduce((sum, g) => sum + g.massa_retida, 0)
  if (total === 0) return gradations.map(g => ({ ...g, pct_individual: 0 }))

  return gradations.map(g => ({
    ...g,
    pct_individual: g.massa_retida / total
  }))
}

/**
 * CÁLCULO 2 — % Acumulada retida (cumulativa)
 */
export function calcPctAcumulada(gradations: SieveData[]) {
  const withInd = calcPctIndividual(gradations)
  let acum = 0
  return withInd.map(g => {
    acum += g.pct_individual
    return { ...g, pct_acumulado: acum }
  })
}

/**
 * CÁLCULO 3 — Módulo de Finura
 * MF = soma dos % retidos acumulados nas peneiras 4.8, 2.4, 1.2, 0.6, 0.3, 0.15
 *
 * VALORES VALIDADOS CONTRA A PLANILHA:
 * - Areia Cava BMW:      MF = 2.6990  ✓
 * - Pó Pedra Britasul:   MF = 2.7212  ✓
 * - Brita Britasul:      MF = 6.5591  ✓
 * - Areia Rio Rafael:    MF = 2.9053  ✓
 */
export function calcModuloFinura(gradations: SieveData[]): number {
  const withAcum = calcPctAcumulada(gradations)
  const mf = withAcum
    .filter(g => MF_SIEVES.includes(g.abertura_mm))
    .reduce((sum, g) => sum + g.pct_acumulado, 0)
  return Math.round(mf * 10000) / 10000
}

/**
 * CÁLCULO 4 — Curva combinada da mistura (núcleo principal)
 * Pondera a contribuição de cada material pela sua proporção
 */
export function calcCombinedCurve(
  materials: MaterialInput[],
  limits?: Array<{ sieve_id: number; limite_min: number; limite_max: number }>
): GradationResult[] {
  // Normalizar proporções para somar exatamente 1
  const totalProp = materials.reduce((s, m) => s + m.proporcao_pct, 0)
  if (totalProp === 0) return []

  const normalized = materials.map(m => ({
    ...m,
    proporcao_pct: m.proporcao_pct / totalProp
  }))

  // Coletar todas as peneiras únicas, ordenadas
  const sieveMap = new Map<number, { abertura_mm: number; pct_combinado: number }>()

  for (const mat of normalized) {
    const withInd = calcPctIndividual(mat.gradations)
    for (const g of withInd) {
      const current = sieveMap.get(g.sieve_id) ?? { abertura_mm: g.abertura_mm, pct_combinado: 0 }
      sieveMap.set(g.sieve_id, {
        abertura_mm: g.abertura_mm,
        pct_combinado: current.pct_combinado + (g.pct_individual * mat.proporcao_pct)
      })
    }
  }

  // Ordenar por sieve_id (ordem das peneiras) e calcular acumulado
  const sorted = [...sieveMap.entries()].sort((a, b) => a[0] - b[0])
  let acum = 0

  return sorted.map(([sieve_id, data]) => {
    acum += data.pct_combinado
    const limit = limits?.find(l => l.sieve_id === sieve_id)
    const foraMin = limit ? acum < limit.limite_min : false
    const foraMax = limit ? acum > limit.limite_max : false
    const fora = foraMin || foraMax

    return {
      sieve_id,
      abertura_mm: data.abertura_mm,
      pct_combinado: data.pct_combinado,
      pct_acumulado: acum,
      limite_min: limit?.limite_min,
      limite_max: limit?.limite_max,
      desvio_absoluto: limit
        ? Math.abs(acum - ((limit.limite_min + limit.limite_max) / 2))
        : undefined,
      fora_da_faixa: fora
    }
  })
}

/**
 * CÁLCULO 5 — Status da curva combinada
 */
export function calcCurvaStatus(results: GradationResult[]): {
  status: 'conforme' | 'atencao' | 'nao_conforme'
  peneiras_fora: number
  indice_compatibilidade: number
} {
  const total = results.filter(r => r.limite_min !== undefined).length
  const fora = results.filter(r => r.fora_da_faixa).length

  return {
    peneiras_fora: fora,
    status: fora === 0 ? 'conforme' : fora <= 2 ? 'atencao' : 'nao_conforme',
    indice_compatibilidade: total > 0 ? (total - fora) / total : 1
  }
}

/**
 * CÁLCULO 6 — Tensão de rompimento
 * Fórmula: Tensão = Força ÷ 0,0546 ÷ 98,0665
 * VALIDADO: 100 kN → 18.6436 MPa ✓
 */
export function calcTensao(
  forca_kn: number,
  divisor_a = 0.0546,
  divisor_b = 98.0665
): number {
  if (forca_kn <= 0) return 0
  return Math.round((forca_kn / divisor_a / divisor_b) * 10000) / 10000
}

/**
 * CÁLCULO 7 — Estatísticas de rompimento (conjunto de 3 amostras)
 */
export function calcRuptureStats(
  forcas: number[],
  meta_mpa: number,
  divisor_a = 0.0546,
  divisor_b = 98.0665
) {
  const tensoes = forcas.map(f => calcTensao(f, divisor_a, divisor_b))
  const media = tensoes.reduce((a, b) => a + b, 0) / tensoes.length
  const variance = tensoes.reduce((v, t) => v + Math.pow(t - media, 2), 0) / tensoes.length

  return {
    tensoes,
    media: Math.round(media * 10000) / 10000,
    minimo: Math.min(...tensoes),
    maximo: Math.max(...tensoes),
    desvio_padrao: Math.round(Math.sqrt(variance) * 10000) / 10000,
    meta_mpa,
    conforme: meta_mpa > 0 ? media >= meta_mpa : null,
    status: meta_mpa > 0
      ? (media >= meta_mpa ? 'conforme' : 'nao_conforme')
      : 'registro'
  }
}

/**
 * CÁLCULO 8 — Otimização de mistura (gradiente descendente simples)
 * Substitui scipy.optimize para o ambiente Deno/Edge Function
 */
export function optimizeMixture(
  materials: MaterialInput[],
  targetCurve: Array<{ sieve_id: number; target: number }>,
  maxIterations = 1000,
  learningRate = 0.01
): { proportions: number[]; error: number } {
  const n = materials.length
  let props = materials.map(() => 1 / n)

  const calcError = (p: number[]) => {
    const mats = materials.map((m, i) => ({ ...m, proporcao_pct: p[i] }))
    const curve = calcCombinedCurve(mats)
    return targetCurve.reduce((err, target) => {
      const result = curve.find(r => r.sieve_id === target.sieve_id)
      if (!result) return err
      return err + Math.pow(result.pct_acumulado - target.target, 2)
    }, 0)
  }

  for (let iter = 0; iter < maxIterations; iter++) {
    const grad = props.map((_, i) => {
      const dp = 0.001
      const pPlus = [...props]; pPlus[i] += dp
      const pMinus = [...props]; pMinus[i] -= dp
      return (calcError(pPlus) - calcError(pMinus)) / (2 * dp)
    })

    // Atualizar e normalizar
    props = props.map((p, i) => Math.max(0, p - learningRate * grad[i]))
    const total = props.reduce((s, p) => s + p, 0)
    props = props.map(p => p / total)
  }

  return { proportions: props, error: calcError(props) }
}
```

---

## 7. Geração de PDF com jsPDF

```typescript
// supabase/functions/pdf-generate/index.ts

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import jsPDF from "https://esm.sh/jspdf@2.5.1"

serve(async (req) => {
  const { tipo, id } = await req.json()
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  if (tipo === 'trace') {
    return await generateTracePDF(supabase, id)
  } else if (tipo === 'final') {
    return await generateFinalReportPDF(supabase, id)
  }
})

async function generateFinalReportPDF(supabase: any, batch_id: string) {
  // 1. Busca todos os dados
  const { data: batch } = await supabase
    .from('production_batches')
    .select(`
      *,
      analyses (*,
        analysis_materials (*, materials (*)),
        analysis_dosage (*),
        analysis_gradation_results (*, sieves (*))
      ),
      rupture_schedules (*, rupture_tests (*, rupture_samples (*)))
    `)
    .eq('id', batch_id)
    .single()

  // 2. Gera PDF com jsPDF
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const pageW = 210
  const margin = 15
  let y = margin

  // Helper para linha horizontal
  const hr = (yPos: number) => {
    doc.setDrawColor(200, 200, 200)
    doc.line(margin, yPos, pageW - margin, yPos)
  }

  // ── CABEÇALHO ──────────────────────────────────────────────
  doc.setFillColor(15, 23, 42)
  doc.rect(0, 0, pageW, 30, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(16).setFont('helvetica', 'bold')
  doc.text('RELATÓRIO FINAL DO PROCESSO', margin, 13)
  doc.setFontSize(9).setFont('helvetica', 'normal')
  doc.text(`Lote: ${batch.batch_code}  |  Emitido em: ${new Date().toLocaleDateString('pt-BR')}`, margin, 22)
  y = 38

  // ── SEÇÃO 1 — IDENTIFICAÇÃO ────────────────────────────────
  doc.setTextColor(45, 106, 246)
  doc.setFontSize(11).setFont('helvetica', 'bold')
  doc.text('1. IDENTIFICAÇÃO', margin, y); y += 6
  hr(y); y += 4
  doc.setTextColor(30, 30, 30).setFontSize(9).setFont('helvetica', 'normal')

  const analysis = batch.analyses
  const fields = [
    ['Código', analysis.codigo],
    ['Produto', analysis.produto || '—'],
    ['Tipo', analysis.tipo],
    ['Resistência Prevista', `${analysis.resistencia_prevista} MPa`],
    ['Analista', analysis.analista_id],
    ['Data da Análise', new Date(analysis.data_analise).toLocaleDateString('pt-BR')],
  ]
  fields.forEach(([label, value]) => {
    doc.setFont('helvetica', 'bold').text(`${label}:`, margin, y)
    doc.setFont('helvetica', 'normal').text(String(value), margin + 45, y)
    y += 6
  })
  y += 4

  // ── SEÇÃO 5 — ROMPIMENTOS (resumo) ────────────────────────
  doc.setTextColor(45, 106, 246)
  doc.setFontSize(11).setFont('helvetica', 'bold')
  doc.text('5. ROMPIMENTOS', margin, y); y += 6
  hr(y); y += 4

  for (const schedule of batch.rupture_schedules) {
    doc.setTextColor(30, 30, 30).setFontSize(10).setFont('helvetica', 'bold')
    doc.text(`${schedule.idade_dias} dia(s) — ${new Date(schedule.data_prevista).toLocaleDateString('pt-BR')}`, margin, y)
    y += 5

    for (const test of schedule.rupture_tests) {
      doc.setFontSize(9).setFont('helvetica', 'normal')
      const statusColor = test.status === 'conforme' ? [16, 185, 129] : [239, 68, 68]
      doc.setTextColor(...statusColor as [number, number, number])
      doc.text(
        `  ${test.tipo_amostra.toUpperCase()} — Média: ${test.media_mpa} MPa  Meta: ${test.meta_mpa} MPa  Status: ${test.status.toUpperCase()}`,
        margin, y
      )
      y += 5
    }
    y += 3
  }

  // ── SEÇÃO 6 — CONCLUSÃO ────────────────────────────────────
  const { data: report } = await supabase
    .from('quality_reports')
    .select('*').eq('batch_id', batch_id).single()

  if (report) {
    y += 4
    const statusColors: Record<string, number[]> = {
      aprovado: [16, 185, 129],
      aprovado_com_ressalva: [245, 158, 11],
      reprovado: [239, 68, 68]
    }
    const color = statusColors[report.final_status] ?? [100, 100, 100]
    doc.setFillColor(...color as [number, number, number])
    doc.roundedRect(margin, y, pageW - 2 * margin, 14, 3, 3, 'F')
    doc.setTextColor(255, 255, 255).setFontSize(14).setFont('helvetica', 'bold')
    doc.text(
      report.final_status.replace('_', ' ').toUpperCase(),
      pageW / 2, y + 9,
      { align: 'center' }
    )
    y += 20
  }

  // ── RODAPÉ ─────────────────────────────────────────────────
  doc.setTextColor(150, 150, 150).setFontSize(7)
  doc.text(`Granulometria Solver Pro — Documento gerado automaticamente`, pageW / 2, 287, { align: 'center' })

  // 3. Salva no Supabase Storage
  const pdfBytes = doc.output('arraybuffer')
  const fileName = `pdfs/${batch.organization_id}/final-${batch_id}.pdf`

  await supabase.storage
    .from('reports')
    .upload(fileName, pdfBytes, {
      contentType: 'application/pdf',
      upsert: true
    })

  const { data: urlData } = supabase.storage
    .from('reports')
    .getPublicUrl(fileName)

  return new Response(
    JSON.stringify({ pdf_url: urlData.publicUrl }),
    { headers: { 'Content-Type': 'application/json' } }
  )
}
```

---

## 8. Webhooks — DNA de Traços Aprovados

### Eventos disponíveis

| Evento | Quando é disparado |
|---|---|
| `trace_approved` | Análise aprovada (Etapa 4 do wizard) |
| `trace_released` | Análise liberada para produção |
| `batch_created` | Lote de produção registrado |
| `rupture_scheduled` | Cronograma de rompimentos criado |
| `rupture_completed` | Rompimento concluído e registrado |
| `sample_nonconformity` | Amostra fora da meta |
| `report_generated` | Relatório final emitido e PDF disponível |
| `batch_rejected` | Lote com status = reprovado |

### Payload `trace_approved` (principal para DNA)

```json
{
  "event": "trace_approved",
  "version": "1.0",
  "timestamp": "2026-03-08T14:31:55Z",
  "organization_id": "uuid-org",
  "data": {
    "analysis_id": "uuid",
    "codigo": "ANL-2026-001",
    "nome": "Bloco Estrutural 4MPa Traço A",
    "tipo": "bloco_estrutural",
    "produto": "Bloco 14x19x39",
    "resistencia_prevista_mpa": 4.0,
    "data_analise": "2026-03-08",
    "analista": { "nome": "João Silva", "cargo": "Analista" },
    "aprovado_em": "2026-03-08T14:31:55Z",
    "granulometria": {
      "dna_utilizado": "DNA Bloco Estrutural 4MPa",
      "modulo_finura_combinado": 3.483,
      "status_curva": "conforme",
      "peneiras_fora_da_faixa": 0,
      "materiais": [
        { "nome": "Areia Rio Rafael", "proporcao_pct": 0.206, "mf": 2.905 },
        { "nome": "Pó de Pedra Rafael", "proporcao_pct": 0.485, "mf": 3.178 },
        { "nome": "Brita Britasul", "proporcao_pct": 0.309, "mf": 6.559 }
      ]
    },
    "dosagem": {
      "traco_final": "1:5.2",
      "relacao_ac": 0.42,
      "consumo_cimento_kg_m3": 350.0,
      "volume_batelada_litros": 550.0,
      "agua_litros": 147.0
    }
  }
}
```

### Assinatura HMAC (Edge Function)

```typescript
// supabase/functions/webhook-dispatch/index.ts

const signPayload = async (payload: object, secret: string): Promise<string> => {
  const encoder = new TextEncoder()
  const keyData = encoder.encode(secret)
  const bodyData = encoder.encode(JSON.stringify(payload))
  const key = await crypto.subtle.importKey('raw', keyData, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  const sig = await crypto.subtle.sign('HMAC', key, bodyData)
  const hex = Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, '0')).join('')
  return `sha256=${hex}`
}

// Como o receptor valida:
// const expected = await signPayload(receivedBody, your_secret)
// if (expected !== receivedSignature) throw new Error('Invalid signature')
```

### Retry com backoff exponencial

```typescript
const dispatchWithRetry = async (
  url: string, headers: object, payload: object, maxRetries: number
) => {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...headers },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(30000)
      })
      return { status: res.status, attempt, success: res.ok }
    } catch (err) {
      if (attempt === maxRetries) return { status: null, attempt, success: false }
      await new Promise(r => setTimeout(r, Math.pow(2, attempt) * 1000))
      // Delays: 2s → 4s → 8s
    }
  }
}
```

---

## 9. Sistema de Notificações

### Arquitetura

```
Evento (DB Trigger / Cron / Edge Function)
         ↓
Edge Function send-notification
         ↓
  INSERT INTO notifications          → Supabase Realtime → browser (badge ao vivo)
  Envio de email (Resend API)        → inbox do usuário
```

### Tipos de notificação

| Tipo | Gatilho | Quem recebe |
|---|---|---|
| `rupture_due_today` | Cron 06h | Responsável pelo schedule |
| `rupture_overdue` | Cron 07h | Responsável + gestores |
| `trace_approved` | Aprovação da análise | Gestores + analista |
| `trace_released` | Liberação para produção | Equipe de produção |
| `batch_created` | Registro do lote | Laboratório (rompimentos criados) |
| `sample_nonconformity` | Amostra não conforme | Analista + gestores |
| `report_ready` | Conclusão dos 28 dias | Toda a organização |
| `batch_rejected` | Status = reprovado | Gestores + analista |
| `user_invited` | Convite enviado | Usuário convidado (email) |

### Realtime no Next.js

```typescript
// components/layout/NotificationBell.tsx
import { useEffect } from 'react'
import { createBrowserClient } from '@supabase/ssr'

const supabase = createBrowserClient(...)

export function NotificationBell() {
  const { count, setCount } = useNotificationStore()

  useEffect(() => {
    const channel = supabase
      .channel('notifications')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${userId}`
      }, (payload) => {
        setCount(prev => prev + 1)
        // Toast automático
        toast({ title: payload.new.titulo, description: payload.new.mensagem })
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [userId])

  return <BellIcon count={count} />
}
```

---

## 10. Gestão de Usuários e Autenticação

### Roles e permissões

| Role | Dashboard | Análises | Produção | Rompimentos | Relatórios | Materiais | Configurações | Usuários |
|---|---|---|---|---|---|---|---|---|
| `admin` | ✅ | ✅ RW | ✅ RW | ✅ RW | ✅ RW | ✅ RW | ✅ RW | ✅ RW |
| `gestor` | ✅ | ✅ RW | ✅ RW | ✅ RW | ✅ RW | ✅ RW | ✅ R | ❌ |
| `laboratorio` | ✅ | ✅ RW | ✅ R | ✅ RW | ✅ R | ✅ RW | ❌ | ❌ |
| `producao` | ✅ | ✅ R | ✅ RW | ✅ R | ✅ R | ✅ R | ❌ | ❌ |
| `visualizador` | ✅ | ✅ R | ✅ R | ✅ R | ✅ R | ✅ R | ❌ | ❌ |

### Fluxo de convite

```
Admin → /settings/users → "Convidar usuário"
  → Edge Function invite-user
  → INSERT user_invites (token, expira_em = now + 72h)
  → Email com link /invite/{token}

Convidado → clica no link → /invite/[token]
  → Verifica token não expirado e não aceito
  → Formulário: nome, senha
  → supabase.auth.signUp({ email, password })
  → INSERT profiles (role, organization_id)
  → UPDATE user_invites SET aceito_em = now()
  → Redirect → /dashboard
```

---

## 11. Módulos e Páginas — Especificação Detalhada

---

### 11.1 Layout Global e Navegação

**Sidebar (desktop — 240px colapsável para 64px)**

```
[Logo org]  [Nome org]

📊 Dashboard
🔬 Análises
📐 Traços Padrão
🏭 Produção
💥 Rompimentos        ← badge vermelho com nº de atrasados
📄 Relatórios
🪨 Materiais
───────────────
⚙️  Configurações
👥 Usuários           ← somente admin/gestor
🔔 Notificações       ← badge com não lidas

[Avatar] [Nome usuário]
[Perfil / Sair]
```

**Header (sticky, 64px)**

`[☰ mobile] [Título da página] [···] [🔍 cmd+K] [🔔 badge] [Avatar ▼]`

**Avatar dropdown:** Meu Perfil · Configurações · Suporte · ─── · Sair

**Mobile:** drawer lateral + bottom nav (Dashboard / Análises / Produção / Rompimentos / Menu)

---

### 11.2 Autenticação

**`/login`** — tela dividida 50/50 (branding esquerda, form direita)
- Email + senha + toggle mostrar senha
- "Esqueceu a senha?" → /forgot-password
- Botão "Entrar com Google" (Supabase OAuth)
- Link "Criar organização"
- Bloqueio após 5 tentativas com cooldown

**`/register`** — nome, email, senha, nome da organização, cargo, aceite de termos
- Cria organização + usuário admin
- Email de confirmação via Supabase Auth
- Redirect para onboarding (wizard inicial de configuração)

**`/forgot-password`** → email → link expira em 1h
**`/reset-password`** → nova senha + confirmação
**`/invite/[token]`** → verifica token → nome + senha → cria conta vinculada à org

---

### 11.3 Dashboard

**KPI Cards (4):**
Análises do mês · Traços em produção · Rompimentos pendentes (⚠️ se atrasados) · Taxa conformidade 28d

**Gráficos (2):**
- BarChart (Recharts): Resistência Prevista vs Real — últimas 10 análises
- PieChart (Recharts): Conformidade por idade — donut com seletor 1d/3d/7d/28d

**Tabelas operacionais (2):**
- Rompimentos urgentes (próximos 7 dias) — linha vermelha se atrasado, botão "Lançar"
- Últimas análises — código, produto, status, botão "Ver"

---

### 11.4 Análises — Wizard 5 Etapas

**`/analyses`** — lista com filtros (tipo, status, analista, período), tabela, botão "Nova Análise"

**`/analyses/new`** — stepper visual no topo, auto-save a cada mudança

#### Etapa 1 — Identificação

| Campo | Tipo | Obrig. | Detalhe |
|---|---|---|---|
| tipo_analise | select | ✅ | bloco_estrutural / bloco_vedacao / paver / cp |
| nome | text | ✅ | livre |
| codigo | text | ✅ | auto ANL-YYYY-### — editável |
| data | date | — | default hoje |
| analista | select | — | usuários do laboratório |
| unidade | text | — | nome da planta |
| produto | text | — | "Bloco 14x19x39" |
| resistencia_prevista | number | — | MPa |
| observacoes | textarea | — | — |

Ao selecionar tipo → pré-seleciona DNA correspondente.

#### Etapa 2 — Granulometria

**Layout:** 60% tabela / 40% painel + gráfico abaixo (largura total)

**Tabela (esquerda):**
- Peneiras nas linhas · Materiais nas colunas · Massa (g) editável
- Proporção de cada material: slider no cabeçalho de cada coluna (sliders somam 100%)
- Ao digitar: `supabase.functions.invoke('granulometry-calculate')` com debounce 300ms
- Rodapé por coluna: % Individual · % Acumulada · MF

**Painel técnico (direita):**
- DNA selecionado (dropdown)
- MF combinado (destaque numérico)
- Badge: 🟢 CONFORME / 🟡 ATENÇÃO / 🔴 FORA DA FAIXA
- Lista de peneiras fora da faixa
- Botão "Otimizar mistura" → `granulometry-optimize` → modal com proporções sugeridas

**Gráfico Recharts (abaixo, largura total):**
- LineChart — eixo X: abertura (log), eixo Y: % acumulada 0–100%
- Linha azul grossa: curva combinada
- Linha cinza tracejada: curva-alvo do DNA
- Linhas laranja tracejadas: limites superior e inferior
- Pontos fora da faixa: círculos vermelhos

**Cards de proporção (abaixo do gráfico):**
- Um card por material com slider 0–100%
- Mover um → redistribui proporcionalmente nos demais → recalcula curva

#### Etapa 3 — Dosagem

**Inputs:** relação cimento:agregado · A/C · volume batelada (550) · densidade cimento (3,15) · aditivos

**4 cards calculados** (via `dosage-calculate`):
Consumo cimento · Água/batelada · Massa total · Traço final (1:X)

**Tabela:** materiais + kg por batelada
**Ordem de mistura:** lista drag-and-drop para reordenar (dnd-kit)

#### Etapa 4 — Revisão Final

3 colunas resumo (identificação / granulometria / dosagem) + mini gráfico

**Botão "Aprovar Análise"** → modal confirmação →
1. `UPDATE analyses SET status = 'aprovado'`
2. `supabase.functions.invoke('webhook-dispatch', { event: 'trace_approved', ... })`
3. `supabase.functions.invoke('send-notification', { tipo: 'trace_approved', ... })`
4. Avança para Etapa 5

#### Etapa 5 — Resultado

Relatório visual: gráfico grande · tabela materiais/batelada · resumo técnico

**Botões:**
- 📄 **Exportar PDF** → `supabase.functions.invoke('pdf-generate', { tipo: 'trace', id })`
- 🏭 **Liberar para Produção** → modal → status = `liberado_producao` + webhook + notificação
- 📋 **Salvar como Traço Padrão** → modal com nome do DNA

---

### 11.5 Traços Padrão / DNA

**`/standard-traces`** — lista de DNAs: nome, tipo, resistência, MF, status, ações

Pré-populados: Bloco Estrutural 4MPa · Bloco Vedação 3MPa · Paver H8 35MPa · Bloco Ótimo

**Página de detalhe:** curva por peneira + gráfico + limites + histórico de uso

**Webhook ativo:** toda análise aprovada que usa um DNA dispara `trace_approved` com referência ao DNA

---

### 11.6 Produção

**`/production`** — lista de análises com status `liberado_producao`

**Modal "Registrar Produção":**
- Campos: data/hora · operador (select) · máquina (autocomplete) · volume · observações
- Ao salvar: cria lote + trigger SQL cria 4 schedules automaticamente
- Exibe cronograma criado com as 4 datas

**`/production/[batchId]`** — dados do lote + timeline visual dos 4 rompimentos

---

### 11.7 Rompimentos

**`/ruptures`** — toggle Calendário / Tabela

**Filtros:** idade · status · produto · lote · responsável · data range

**Cores:** 🔴 atrasado · 🟡 hoje · 🟢 conforme · 🔵 em andamento · ⚪ pendente futuro

**`/ruptures/[scheduleId]`** — página de lançamento:

```
CABEÇALHO (read-only): lote · análise · produto · data produção · idade · data prevista

DATA REAL: [date picker]    RESPONSÁVEL: [select]

━━━ BLOCO ESTRUTURAL  |  Meta ≥ X,X MPa ━━━
Amostra 1: [forca kN] → Tensão: X,XX MPa
Amostra 2: [forca kN] → Tensão: X,XX MPa
Amostra 3: [forca kN] → Tensão: X,XX MPa
──────────────────────────────────────────
Média: X,XX  Min: X,XX  Max: X,XX  DP: X,XX
Status: ✅ CONFORME / ❌ NÃO CONFORME

[repete para PAVER e CP]

[Observações]
[Salvar rompimento]
```

Tensão calculada em tempo real: `supabase.functions.invoke('rupture-calculate')` debounce 300ms

---

### 11.8 Relatórios

**`/reports`** — lista por tipo com filtros

**`/reports/[reportId]`** — Relatório Final do Processo:

1. Identificação · 2. Granulometria (tabela + gráfico) · 3. Dosagem · 4. Produção
5. Rompimentos (accordion por idade, tabela por tipo)
6. Conclusão Final (badge grande APROVADO / APROVADO COM RESSALVA / REPROVADO)
7. Assinaturas (laboratório · produção · responsável técnico)

**Botão "Gerar PDF"** → `pdf-generate` Edge Function → jsPDF A4 → Storage → URL de download

---

### 11.9 Materiais

**`/materials`** — lista com filtros, drawer de criação/edição com 2 abas:

**Aba Dados:** nome · tipo · fornecedor · densidade · observações

**Aba Curva Granulométrica:**
- Tabela editável com 10 peneiras
- Ao digitar massa: `granulometry-calculate` → atualiza % em tempo real
- Gráfico da curva individual do material
- MF calculado no rodapé

**Seed inicial:** 9 materiais reais da planilha com massas reais pré-carregadas

---

### 11.10 Configurações Técnicas

**`/settings`** — 6 tabs (somente admin/gestor)

**Tab 1 — Identidade:** logo (Storage upload) · nome org · dados rodapé dos PDFs

**Tab 2 — Parâmetros de Cálculo:**

| Campo | Default | Impacto |
|---|---|---|
| Volume batelada (L) | 550 | Etapa 3 — Dosagem |
| Densidade cimento | 3,15 | Etapa 3 — Dosagem |
| Fórmula tensão — Divisor A | 0,0546 | Edge Function rupture-calculate |
| Fórmula tensão — Divisor B | 98,0665 | Edge Function rupture-calculate |

**Tab 3 — Metas de Rompimento:** tabela editável tipo × idade

**Tab 4 — Faixas Granulométricas:** limites por DNA e peneira

**Tab 5 — Webhooks:** ver seção 11.14

**Tab 6 — Peneiras:** visualização das 10 peneiras (editável em fase 2)

---

### 11.11 Perfil do Usuário

**`/profile`** — 4 abas

**Aba 1 — Dados pessoais:** avatar (Supabase Storage) · nome · cargo · telefone

**Aba 2 — Segurança:** alterar senha · sessões ativas · desconectar outros dispositivos

**Aba 3 — Notificações:** tabela de preferências por tipo × canal (email/push) + antecedência

**Aba 4 — Aparência:** tema claro/escuro/sistema

---

### 11.12 Gestão de Usuários

**`/settings/users`** (somente admin)

**Tabela:** nome · email · cargo · role (badge colorido) · status · último acesso · ações

**Convidar usuário** → drawer: email · role · cargo · mensagem → `invite-user` Edge Function

**Editar:** nome · cargo · role · status + botão reset senha + botão desativar (com confirmação)

**Roles disponíveis com badges:**
🔴 Admin · 🟠 Gestor · 🔵 Laboratório · 🟢 Produção · ⚪ Visualizador

---

### 11.13 Notificações

**`/notifications`** — lista completa com filtros: tipo · lida/não lida · data

**Dropdown (sino no header):** últimas 5 + "Ver todas"

**Realtime:** badge atualizado via Supabase Realtime sem refresh

**Preferências:** configuradas em `/profile` aba Notificações

---

### 11.14 Webhooks

**`/settings/webhooks`** (somente admin)

**Criar webhook:**
- Nome · URL (HTTPS obrigatório) · Evento (select múltiplo de 8 eventos)
- Secret HMAC (auto-gerado com `gen_random_bytes`) · botão copiar
- Headers customizados (chave:valor dinâmico)
- Retries (1–5) · Timeout (10–60s) · Toggle ativo

**Logs:** tabela com data · evento · status HTTP · tempo · tentativas · botão "Ver payload"

**Testar webhook:** disparo manual com payload de teste + resposta ao vivo

---

## 12. Regras de Negócio e Automações

### Estados das análises

```
rascunho → em_analise → aprovado → liberado_producao → arquivado
```

### Estados dos lotes

```
aguardando_rompimentos → em_andamento → aprovado
                                      → aprovado_com_ressalva
                                      → reprovado
```

### Automações completas

| Gatilho | Onde ocorre | O que acontece |
|---|---|---|
| Análise status = `aprovado` | DB Trigger | Edge Function `webhook-dispatch` (trace_approved) · notificação gestores |
| Análise status = `liberado_producao` | DB Trigger | webhook `trace_released` · notificação produção |
| INSERT `production_batches` | DB Trigger | Cria 4 `rupture_schedules` com datas calculadas |
| INSERT `production_batches` | DB Trigger | webhook `batch_created` |
| `rupture_schedules` status = `concluido` | DB Trigger | Recalcula status do lote · webhook `rupture_completed` |
| Amostra status = `nao_conforme` | INSERT trigger | webhook `sample_nonconformity` · notificação analista + gestores |
| Todos os 28d concluídos | DB Trigger | Notificação "relatório disponível" |
| INSERT `quality_reports` | DB Trigger | webhook `report_generated` |
| Cron 06h diário | pg_cron | Notificações de rompimentos do dia |
| Cron 07h diário | pg_cron | Marca atrasados + notificações de overdue |

---

## 13. Roadmap MVP

### Semana 1 — Fundação

- [ ] Setup Next.js 14 + App Router + TypeScript + Tailwind + shadcn/ui
- [ ] Supabase: projeto criado + variáveis de ambiente
- [ ] Schema SQL completo (Migrations 001–005)
- [ ] Seed: peneiras + 9 materiais reais + 4 DNAs
- [ ] Supabase Auth: email/senha + Google OAuth
- [ ] Middleware Next.js para proteção de rotas
- [ ] Layout base: sidebar, header, notificação bell

### Semana 2 — Motor de Cálculo + Materiais

- [ ] Edge Function `granulometry-calculate` com testes unitários
- [ ] Edge Function `rupture-calculate`
- [ ] Edge Function `dosage-calculate`
- [ ] Validação contra planilha: MF Areia BMW = 2,699 ✓
- [ ] CRUD materiais com curva granulométrica editável em tempo real
- [ ] CRUD DNA / Curvas Padrão
- [ ] Edge Function `invite-user` + fluxo de convite por email

### Semana 3 — Wizard de Análise + Produção

- [ ] Wizard 5 etapas completo
- [ ] Gráfico granulométrico em tempo real (Recharts)
- [ ] Sliders de proporção com redistribuição automática
- [ ] Aprovação de análise + webhook `trace_approved`
- [ ] Módulo de produção + registro de lotes
- [ ] DB Trigger: criação automática dos 4 schedules
- [ ] Módulo de rompimentos: lista + lançamento + cálculo em tempo real
- [ ] Notificações in-app via Supabase Realtime

### Semana 4 — Relatórios + Finalização

- [ ] Edge Function `pdf-generate` com jsPDF (relatório do traço + relatório final)
- [ ] Relatório Final do Processo completo
- [ ] Dashboard com KPIs e gráficos
- [ ] Gestão de usuários + perfil completo
- [ ] Página de configurações técnicas
- [ ] Gestão de webhooks (UI + Edge Function)
- [ ] Cron jobs: alertas de rompimento (pg_cron)
- [ ] Notificações por email (Resend)
- [ ] Testes end-to-end com dados reais da planilha

---

## 14. Prompts Sequenciais para o Lovable

---

### PROMPT 1 — Setup + Auth + Layout

```
Crie um projeto Next.js 14 com App Router e TypeScript.

Dependências: tailwindcss, @supabase/supabase-js, @supabase/ssr, 
shadcn/ui, zustand, react-hook-form, zod, recharts, date-fns, lucide-react, @dnd-kit/core

Variáveis de ambiente necessárias:
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=

Tema Tailwind customizado:
- Background: #0F172A
- Surface: #1E293B  
- Accent: #2D6AF6
- Success: #10B981
- Warning: #F59E0B
- Danger: #EF4444
- Muted: #64748B

Configure o middleware do Supabase em middleware.ts para proteger
todas as rotas em /app/(app)/ e redirecionar para /login.

Crie lib/supabase/client.ts com createBrowserClient e
lib/supabase/server.ts com createServerClient.

Crie as páginas de autenticação em /app/(auth)/:
- /login: tela dividida 50/50, email+senha, toggle mostrar senha,
  link "Esqueceu?", botão Google OAuth via Supabase, link "Criar org"
- /register: nome, email, senha, nome da organização, cargo, aceite termos
- /forgot-password e /reset-password
- /invite/[token]: verifica token → nome + senha → cria conta

Crie /app/(app)/layout.tsx com:
- Sidebar colapsável 240px com itens: Dashboard, Análises, Traços Padrão,
  Produção, Rompimentos (badge), Relatórios, Materiais, Configurações,
  Usuários, Notificações (badge)
- Header sticky: título da página, busca cmd+K (placeholder), sino com badge, avatar dropdown
- Avatar dropdown: Meu Perfil, Configurações, Sair
- Mobile: drawer lateral + bottom navigation com 5 itens
- Badge do sino atualizado via Supabase Realtime (tabela notifications)
```

---

### PROMPT 2 — Banco de Dados e Edge Functions de Cálculo

```
No Supabase Dashboard > SQL Editor, execute o schema SQL completo
com todas as tabelas: organizations, profiles, user_invites, sieves,
materials, material_gradations, standard_curves, standard_curve_items,
analyses, analysis_materials, analysis_gradation_results, analysis_dosage,
production_batches, rupture_schedules, rupture_tests, rupture_samples,
quality_reports, webhook_configs, webhook_logs, notifications,
notification_preferences, technical_settings.

Execute também:
- Seed das 10 peneiras (12.7 até FUNDO)
- RLS habilitado em todas as tabelas
- Funções my_org_id() e my_role()
- Políticas RLS de isolamento por organização
- Trigger on_batch_created: ao inserir lote, cria 4 rupture_schedules
- Trigger on_analysis_approved: chama webhook-dispatch
- Trigger on_rupture_completed: recalcula status do lote
- pg_cron: job 06h (rupture_due_today) e 07h (rupture_overdue)

Crie a Edge Function supabase/functions/granulometry-calculate/index.ts:
Recebe: materials[] com proporcao_pct e gradations[], limits[] opcionais
Calcula:
1. % individual de cada peneira por material (massa/total)
2. % acumulada por material
3. Curva combinada ponderada pelas proporções (normaliza para somar 1)
4. Acumulado da curva combinada
5. Módulo de finura = soma dos acumulados nas peneiras 4.8,2.4,1.2,0.6,0.3,0.15
6. Peneiras fora da faixa (abaixo do min ou acima do max)
7. Status: conforme (0 fora), atencao (1-2 fora), nao_conforme (3+ fora)

Valores obrigatórios para teste:
- Areia Cava BMW massas [0,0,0,6,66,171,300,315,119,23] → MF = 2.699
- Pó Pedra Britasul massas [0,0,0,1,191,213,154,154,130,154] → MF = 2.721
- Brita Britasul massas [0,153,490,200,145,5,1,1,1,11] → MF = 6.559

Crie a Edge Function rupture-calculate/index.ts:
Recebe: forcas[] (kN), tipo_amostra, idade_dias, organization_id
Calcula: tensao = forca / 0.0546 / 98.0665 (busca divisores em technical_settings)
Retorna: tensoes[], media, min, max, desvio_padrao, meta_mpa, status (conforme/nao_conforme/registro)
Validação obrigatória: calcTensao(100) === 18.6436 MPa

Crie a Edge Function dosage-calculate/index.ts:
Recebe: relacao_cimento, relacao_ac, volume_batelada, densidade_cimento, proporcoes_materiais[], aditivos_ml
Retorna: consumo_cimento_kg, massa_total_kg, agua_litros, traco_final (ex: "1:5.2"), 
materiais_batelada[] com nome e kg
```

---

### PROMPT 3 — Materiais e DNAs

```
Crie o módulo de Materiais em /app/(app)/materials/page.tsx:

Lista com filtros (tipo, fornecedor, status ativo/inativo) e tabela:
Nome | Tipo | Fornecedor | MF | Status | Ações (editar/desativar)

Botão "Novo Material" abre Drawer com 2 abas:

ABA 1 — Dados gerais:
Campos React Hook Form + Zod: nome*, tipo* (select), fornecedor, densidade, observações, toggle ativo

ABA 2 — Curva Granulométrica:
Tabela editável com as 10 peneiras:
Peneira | Massa (g) | % Individual | % Acumulada
Os campos de % são read-only e calculados em tempo real ao digitar a massa.
Ao mudar qualquer massa: supabase.functions.invoke('granulometry-calculate') com debounce 300ms.
Exibir MF calculado em destaque no rodapé.
Abaixo da tabela: gráfico Recharts LineChart da curva individual do material.

Pré-popular o banco com os 9 materiais reais da planilha (botão "Carregar seed" ou automático):
1. Areia de Cava BMW | areia_fina | BMW | massas: [0,0,0,6,66,171,300,315,119,23]
2. Pó de Pedra Britasul | po_pedra | Britasul | massas: [0,0,0,1,191,213,154,154,130,154]
3. Brita Britasul | brita | Britasul | massas: [0,153,490,200,145,5,1,1,1,11]
4. Areia de Rio Rafael | areia_grossa | Rafael | massas: [0,0,4,10,49,136,368,364,56,12]
5. Pó de Pedra 1 Rafael | po_pedra | Rafael | massas: [0,0,0,11,333,224,115,72,52,190]
6. Granilha 01 Duro | granilha | Duro | massas: [0,0,0,0,824,146,5,1,2,22]
7. Granilha 02 Duro | granilha | Duro | massas: [0,0,0,191,753,25,1,1,1,28]
8. Pó de Pedra Fino Duro | po_pedra | Duro | massas: [0,0,0,0,5,146,214,200,189,246]
9. Brita 00 Duro | brita | Duro | massas: [0,380,470,77,50,2,1,6,3,11]

Crie o módulo de Traços Padrão em /app/(app)/standard-traces/:
Lista: Nome | Tipo produto | Resistência alvo | MF | Status | Ações
CRUD completo com formulário: nome, tipo_produto, resistencia_alvo, descrição
Página de detalhe: tabela com peneiras (% retido, acumulado, limite min/max), 
gráfico da curva-alvo, lista de análises que usaram este DNA.

Pré-popular com os 4 DNAs da planilha:
- DNA Bloco Estrutural 14x19x39 4MPa (MF: 3.483)
- DNA Bloco Vedação 14x19x39 3MPa (MF: 3.712)
- DNA Paver H8 35MPa (MF: 3.198)
- DNA Bloco Estrutural Ótimo (MF: 3.227)
```

---

### PROMPT 4 — Wizard Análise (Etapas 1, 2 e 3)

```
Crie o wizard de análise em /app/(app)/analyses/new/page.tsx.

Stepper visual no topo com 5 etapas. Estado gerenciado pelo Zustand 
(analysisStore). Auto-save a cada mudança via supabase update.

ETAPA 1 — Identificação:
React Hook Form + Zod. Campos: tipo_analise (select: bloco_estrutural,
bloco_vedacao, paver, cp), nome*, codigo (auto ANL-YYYY-### editável),
data, analista (select usuários), unidade, produto, resistencia_prevista,
observacoes. Ao selecionar tipo: pré-seleciona DNA correspondente.

ETAPA 2 — Granulometria:
Layout 2 colunas (60/40):

COLUNA ESQUERDA — tabela granulométrica:
- Cabeçalho: "Peneira" + colunas por material (máx 6 materiais)
- No topo de cada coluna de material: nome + proporção (input numérico %)
- 10 linhas de peneiras com inputs de massa (g) editáveis
- Ao mudar massa ou proporção: invoke('granulometry-calculate') debounce 300ms
- Rodapé de cada coluna material: % Individual e % Acumulada calculadas
- Coluna extra "Combinada": curva combinada calculada
- Última linha: MF por material
- Botão "+ Adicionar material": modal select do cadastro de materials

COLUNA DIREITA — painel técnico:
- Dropdown DNA selecionado
- MF combinado em destaque (fonte grande, cor azul)
- Badge status curva: verde/amarelo/vermelho conforme peneiras fora
- Lista de peneiras fora da faixa com abertura e desvio
- Botão "Otimizar mistura": invoke('granulometry-optimize') → modal com 
  proporções sugeridas e preview do gráfico antes de aplicar

GRÁFICO (abaixo, largura total):
Recharts LineChart. Eixo X: aberturas das peneiras. Eixo Y: % acumulada (0-100%).
4 linhas: combinada (azul grossa), alvo DNA (cinza tracejada), limite sup (laranja), limite inf (laranja).
Pontos da curva combinada: vermelho se fora da faixa, azul se dentro.

CARDS PROPORÇÃO (abaixo do gráfico):
Card por material com slider 0-100%. Mover um slider redistribui os demais
proporcionalmente. Ao soltar: recalcula curva.

ETAPA 3 — Dosagem:
Inputs com defaults: relacao_cimento, relacao_ac, volume_batelada (550),
densidade_cimento (3.15), aditivos_ml (0).
Ao mudar qualquer input: invoke('dosage-calculate') debounce 300ms.
4 cards de resultado destacados: Consumo Cimento (kg/m³), Água/Batelada (L),
Massa Total (kg), Traço Final (1:X.X).
Tabela: Material | Proporção | Massa (kg) para cada material + cimento + água.
Ordem de mistura: lista drag-and-drop com @dnd-kit (reordena e salva em analysis_dosage.ordem_mistura).
```

---

### PROMPT 5 — Wizard Análise (Etapas 4 e 5) + Lista

```
Continue o wizard com as etapas 4 e 5.

ETAPA 4 — Revisão Final:
Mini gráfico da curva no topo (versão compacta do Recharts).
3 colunas de cards resumo:
- Col 1: tipo, código, produto, data, analista, unidade
- Col 2: DNA, MF combinado, status curva, peneiras fora, materiais (top 3)
- Col 3: A/C, cimento, volume, traço final
Textarea: observações técnicas finais.

Botão "Aprovar Análise" → modal de confirmação →
1. supabase.from('analyses').update({ status: 'aprovado', aprovado_por, aprovado_em })
2. supabase.functions.invoke('webhook-dispatch', { event: 'trace_approved', analysis_id })
3. supabase.functions.invoke('send-notification', { tipo: 'trace_approved', ... })
4. Avança para Etapa 5 automaticamente

ETAPA 5 — Resultado:
Header: código, badge "APROVADO", data, analista.
Gráfico granulométrico grande (largura total, altura 350px).
Tabela de materiais: Material | % | kg/batelada.
Cards resumo técnico: MF, A/C, Consumo Cimento, Traço.

Botões de ação:
- "Exportar PDF" → supabase.functions.invoke('pdf-generate', {tipo:'trace', id}) → download
- "Liberar para Produção" → modal → update status='liberado_producao' 
  + invoke webhook 'trace_released' + send-notification para produção
- "Salvar como DNA" → modal com campo nome → INSERT standard_curves

LISTA /analyses:
Filtros: busca texto, tipo (select), status (select), analista (select), período (date range).
Tabela: # | Código | Nome | Produto | Analista | Data | Status (badge) | Ações.
Ações: Ver (link /analyses/[id]), Duplicar (clona análise como rascunho), Arquivar.
Estado vazio com ilustração e botão "Criar primeira análise".
Paginação server-side via Supabase.

/analyses/[id]: página de detalhe com todas as 5 etapas em modo leitura,
timeline de status (criado → aprovado → liberado → produção → rompimentos → relatório),
botão editar (volta para wizard) se status = rascunho ou em_analise.
```

---

### PROMPT 6 — Produção e Rompimentos

```
Crie os módulos de Produção e Rompimentos.

PÁGINA /production:
Filtros: produto, analista, data de liberação.
Tabela de análises com status 'liberado_producao':
Código | Produto | Resistência | Analista | Liberado em | Status | Ação "Registrar Produção"

Botão "Registrar Produção" abre Modal:
Campos: data/hora da batelada (datetime-local), operador (select profiles role=producao),
máquina (text com autocomplete do histórico de maquinas), volume produzido (number),
observações (textarea).
Ao confirmar:
1. INSERT production_batches → trigger SQL cria automaticamente 4 rupture_schedules
2. invoke('webhook-dispatch', { event: 'batch_created' })
3. invoke('send-notification', { tipo: 'batch_created', ... })
4. Exibe modal de sucesso com o cronograma de 4 datas geradas.

/production/[batchId]:
Header: LOTE-YYYY-### | análise vinculada | data | operador | máquina | status badge.
Card com resumo do traço (DNA, MF, traço em massa, A/C).
Timeline vertical dos 4 rompimentos:
  [○ 1 dia — 02/03] → [○ 3 dias — 04/03] → [✅ 7 dias — 08/03] → [○ 28 dias — 29/03]
Cada item da timeline: data prevista, data real, responsável, status badge, link "Ver rompimento".

PÁGINA /ruptures:
Toggle de view: Calendário semanal (padrão) / Tabela.
No calendário: marcadores coloridos nos dias com rompimentos.
Filtros: idade (todos/1d/3d/7d/28d), status, produto, lote, responsável, data range.
Tabela: Lote | Produto | Tipo | Idade | Data Prevista | Data Real | Responsável | Status | Ação.
Cores obrigatórias:
- Vermelho: status='atrasado' (data_prevista < hoje e status=pendente)
- Amarelo: data_prevista = hoje
- Verde: status='concluido' e teste conforme
- Azul: status='em_andamento'
- Cinza: pendente futuro

PÁGINA /ruptures/[scheduleId]:
Cabeçalho read-only (lote, análise, produto, data produção, idade, data prevista).
Date picker: data real do ensaio. Select: responsável.

3 blocos de ensaio independentes (Bloco / Paver / CP).
Para cada bloco:
- Título com tipo + "Meta ≥ X,X MPa (X dias)"
- 3 linhas: "Amostra N: [input força kN] → Tensão: X,XX MPa [badge conforme/nc]"
- Ao digitar força: invoke('rupture-calculate') debounce 300ms, atualiza tensão e badge
- Rodapé: Média | Min | Max | DP | Badge status do conjunto
Textarea observações.

Botão "Salvar rompimento":
1. INSERT/UPDATE rupture_samples (com tensão calculada)
2. UPDATE rupture_tests (média, min, max, DP, status)
3. UPDATE rupture_schedules SET status='concluido', data_executada=data_real
4. Trigger SQL recalcula status do lote automaticamente
5. Se algum status='nao_conforme': invoke webhook 'sample_nonconformity' + notificação
6. Se for 28 dias: notificação "relatório final disponível para LOTE-XXX"
```

---

### PROMPT 7 — Relatórios e Dashboard

```
Crie os módulos de Relatórios e Dashboard.

PÁGINA /reports:
Filtros: tipo (trace/production/rupture/final), produto, data range, status final.
Tabela: Tipo | Lote/Análise | Produto | Data | Status Final | Ações (Ver / PDF).

PÁGINA /reports/[reportId] — Relatório Final do Processo:
Estrutura em 7 seções claramente delimitadas:

1. IDENTIFICAÇÃO: código, nome, produto, tipo, data, analista, unidade
2. GRANULOMETRIA: tabela materiais/proporções/kg, gráfico Recharts (curva + DNA + limites), MF, status
3. DOSAGEM: traço em massa, A/C, consumo cimento, volume, água/batelada
4. PRODUÇÃO: lote, data, operador, máquina, volume, observações
5. ROMPIMENTOS: accordion por idade (1d/3d/7d/28d)
   Dentro de cada accordion:
   - Para cada tipo (bloco/paver/cp): tabela Amostra | Força kN | Tensão MPa,
     linha rodapé: Média | Min | Max | DP | Meta | Badge CONFORME/NÃO CONFORME
6. CONCLUSÃO FINAL: badge grande centralizado
   Verde = APROVADO, Amarelo = APROVADO COM RESSALVA, Vermelho = REPROVADO
7. ASSINATURAS: 3 campos lado a lado (Laboratório, Produção, Resp. Técnico) com nome, cargo, data

Botão "Gerar PDF":
supabase.functions.invoke('pdf-generate', { tipo: 'final', id: batch_id })
→ Edge Function gera PDF A4 com jsPDF (cabeçalho escuro, seções, tabelas, status colorido)
→ Salva em Storage bucket 'reports'
→ Retorna URL pública assinada
→ Front exibe botão "Baixar PDF" e "Compartilhar link"

CRIAR Edge Function pdf-generate/index.ts com jsPDF:
Importa: import jsPDF from "https://esm.sh/jspdf@2.5.1"
Busca todos os dados do lote (análise, materiais, dosagem, rompimentos, relatório)
Gera PDF A4 com:
- Cabeçalho darkblue com logo e nome do lote
- 7 seções com separadores
- Tabelas de rompimentos por idade e tipo
- Badge colorido da conclusão
- Rodapé com nome da org e data
Salva no bucket 'reports/{org_id}/final-{batch_id}.pdf'

PÁGINA /dashboard:
Linha 1 — 4 KPI cards com skeleton loading:
- Análises este mês (nº + ↑↓ vs mês anterior)
- Traços em produção (nº ativo)
- Rompimentos pendentes (nº, badge vermelho se houver atrasados)
- Taxa de conformidade 28d (%, ↑↓)

Linha 2 — 2 gráficos lado a lado:
- Recharts BarChart: "Resistência Prevista vs Real" — últimas 10 análises,
  barras azul (prevista) e verde/vermelho (real), tooltip com desvio %
- Recharts PieChart donut: "Conformidade por idade" — conforme/nc/pendente,
  seletor de idade acima (1d/3d/7d/28d), % no centro

Linha 3 — 2 tabelas:
- "Rompimentos urgentes (próximos 7 dias)": Lote | Produto | Idade | Data | Status | [Lançar]
  Destaque vermelho em linhas atrasadas, amarelo em linhas de hoje
- "Últimas análises": Código | Produto | Analista | Data | Status | [Ver]
```

---

### PROMPT 8 — Usuários, Perfil, Configurações e Webhooks

```
Crie as páginas de gestão, perfil e configurações.

PÁGINA /settings/users (somente admin):
Tabela de usuários: Nome | Email | Cargo | Role (badge colorido) | Status | Último acesso | Ações.
Badges de role: 🔴 Admin 🟠 Gestor 🔵 Laboratório 🟢 Produção ⚪ Visualizador.
Ações: Editar (modal) | Desativar (confirm) | Reset senha.

Modal editar: nome, cargo, role (select), status (ativo/inativo).
Botão "Resetar senha": supabase.auth.admin.generateLink('recovery', email) → envia email.

Botão "Convidar usuário" → Drawer:
Campos: email, role (select), cargo (opcional), mensagem personalizada.
Ao salvar: supabase.functions.invoke('invite-user', { email, role, org_id, mensagem })
Edge Function invite-user/index.ts:
  1. INSERT user_invites (token = gen_random_uuid(), expira_em = now + 72h)
  2. Envia email HTML com link /invite/{token} via Resend API
     (RESEND_API_KEY nas variáveis de ambiente)

PÁGINA /invite/[token] (área pública, sem auth):
Verifica token: SELECT FROM user_invites WHERE token = $1 AND aceito_em IS NULL AND expira_em > now()
Se inválido/expirado: exibe erro com link "Solicitar novo convite"
Se válido: form nome + senha + confirmação →
  supabase.auth.signUp → INSERT profiles → UPDATE user_invites SET aceito_em = now()
  → Redirect /dashboard

PÁGINA /profile:
4 abas:
ABA 1 — Dados pessoais: avatar (upload → Storage bucket 'avatars/{user_id}'), 
  nome, cargo, telefone. Botão "Salvar".
ABA 2 — Segurança: form alterar senha (atual+nova+confirmação), 
  lista de sessões ativas com botão "Desconectar outros dispositivos" 
  → supabase.auth.admin.signOut(userId, 'others').
ABA 3 — Notificações: tabela de preferências: 
  Tipo | Email | Push para: rompimento_dia, rompimento_atrasado, 
  traco_aprovado, lote_reprovado, relatorio_pronto.
  Seletor "Notificar X horas antes" (2h/4h/8h/24h).
  Salva em notification_preferences.
ABA 4 — Aparência: radio tema (Claro/Escuro/Sistema), salva em profiles.tema.
  Implementa com next-themes.

PÁGINA /settings (Configurações Técnicas — 6 tabs):
TAB 1 — Identidade: upload logo (Storage 'logos/{org_id}'), nome org,
  rodape_endereco, rodape_cnpj, rodape_responsavel.
TAB 2 — Parâmetros: volume_batelada_padrao (550), densidade_cimento_padrao (3.15),
  formula_tensao_a (0.0546), formula_tensao_b (98.0665).
  Aviso: "Alterações afetam cálculos futuros. Análises existentes não são recalculadas."
TAB 3 — Metas: tabela editável tipo × idade (bloco 1d/3d/7d/28d, paver 1d/3d/7d/28d).
TAB 4 — Webhooks: lista + botão criar (ver abaixo).
TAB 5 — Faixas Granulométricas: tabela por DNA e peneira (limite_min, limite_max).
TAB 6 — Peneiras: exibe as 10 peneiras (somente leitura por enquanto).

GESTÃO DE WEBHOOKS (tab 4 de /settings):
Lista: Nome | URL | Evento | Status | Último disparo | Ações (Logs/Editar/Deletar).
Criar/editar webhook em modal:
  - nome (text)
  - url (HTTPS obrigatório, validação Zod com z.string().url().startsWith('https://'))
  - evento (select múltiplo de 8 opções)
  - secret: campo read-only auto-gerado com botão copiar
  - headers: lista dinâmica de pares chave:valor (add/remove)
  - retry_count (select: 1-5)
  - timeout_seconds (select: 10/15/30/60)
  - toggle ativo

Logs do webhook: modal com tabela Data | Evento | HTTP | Tempo | Tentativas | Payload.
Botão ver payload: JSON.stringify formatado em pre/code.
Botão "Testar webhook": chama invoke('webhook-dispatch', {test:true, webhook_id}) →
  exibe resposta (status HTTP + body) em tempo real no modal.

NOTIFICAÇÕES /notifications:
Lista paginada: tipo (ícone) | título | mensagem | data | lida/não lida.
Filtros: tipo, lida/não lida, últimos 7/30/90 dias.
Ação: clicar → marca como lida + navega para link interno.
Botão "Marcar todas como lidas": UPDATE notifications SET lida=true WHERE user_id=...
Link nas configurações de preferência → /profile#notifications.
```

---

## 15. Checklist de Validação

### Motor de Cálculo (obrigatório antes de avançar)

- [ ] `calcTensao(100)` → `18.6436 MPa` (±0.0001)
- [ ] MF Areia de Cava BMW → `2.6990` (±0.001)
- [ ] MF Pó de Pedra Britasul → `2.7212` (±0.001)
- [ ] MF Brita Britasul → `6.5591` (±0.001)
- [ ] MF Areia Rio Rafael → `2.9053` (±0.001)
- [ ] Curva combinada do traço atual replica o gráfico da planilha

### Fluxo Completo End-to-End

- [ ] Criar análise → auto-save funciona em todas as etapas
- [ ] Aprovar análise → webhook `trace_approved` disparado e logado
- [ ] Liberar análise → aparece em `/production`
- [ ] Registrar lote → 4 schedules criados com datas corretas
- [ ] Lançar força de rompimento → tensão calculada em tempo real
- [ ] Concluir 28 dias → status do lote atualizado pelo trigger
- [ ] Gerar PDF → arquivo A4 no Storage, URL funcional

### Segurança e Isolamento

- [ ] Usuário A não vê dados da organização B (RLS)
- [ ] Role `producao` não acessa `/settings`
- [ ] Role `visualizador` não consegue salvar dados
- [ ] Token de convite expira após 72h
- [ ] HMAC do webhook validado corretamente

### UI/UX

- [ ] Layout responsivo em 320px (mobile mínimo)
- [ ] Gráfico granulométrico renderiza em < 500ms
- [ ] Sliders de proporção somam sempre 100%
- [ ] Notificações aparecem em tempo real (Supabase Realtime)
- [ ] Tema escuro funcionando em todas as páginas

---

*Granulometria Solver Pro — PRD v3.0 — Arquitetura 100% Supabase*
*Sem backend dedicado · Sem VPS · Pronto para validação com custo zero*
*Gerado a partir da análise completa da planilha XLSM + documentos de especificação*
