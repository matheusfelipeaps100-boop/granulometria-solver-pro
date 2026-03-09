# Granulometria Solver Pro — LAJEFORRO SISTEMAS

## Stack Técnica

- **Frontend:** React 18 + Vite + TypeScript
- **UI:** Tailwind CSS + shadcn/ui + Poppins font
- **Gráficos:** Recharts
- **Paleta:** Vermelho primário extraído da logo Lajeforro

---

## Implementações Concluídas

### ✅ Fase 1 — Design System e Layout

- [x] Fonte Poppins configurada globalmente
- [x] Paleta de cores derivada da logo (vermelho HSL 0° 72% 45%)
- [x] Tokens semânticos: success, warning, info, destructive
- [x] Sidebar colapsável com 7 módulos + admin
- [x] Header com avatar, notificações e breadcrumb
- [x] Layout responsivo com `AppLayout` + `Outlet`

### ✅ Fase 1 — Páginas com Dados Mock

- [x] **Dashboard** — 4 KPIs, gráfico barra (previsto vs real), donut conformidade, 2 tabelas
- [x] **Materiais** — Lista de 9 materiais reais da planilha
- [x] **Traços Padrão** — 4 DNAs pré-configurados
- [x] **Produção** — Painel conforme referência visual + dica operacional
- [x] **Rompimentos** — Lista com filtros
- [x] **Relatórios** — Lista com tipos
- [x] **Configurações** — 5 abas (Identidade, Parâmetros, Metas, Webhooks, Peneiras)

### ✅ Fase 2 — Wizard de Análises (5 Etapas)

- [x] **Motor de Cálculo Granulométrico** (`src/lib/granulometry-engine.ts`)
- [x] **Dados Mock** (`src/lib/analysis-data.ts`)
- [x] **Stepper Visual** (`src/components/WizardStepper.tsx`)
- [x] **Etapa 1 — Identificação**
- [x] **Etapa 2 — Granulometria** (versão legada — será substituída)
- [x] **Etapa 3 — Dosagem**
- [x] **Etapa 4 — Revisão**
- [x] **Etapa 5 — Resultado**
- [x] **Lista de Análises**

### ✅ Fase 3 — Sistema de Produtos Dinâmico

- [x] **Catálogo de Produtos** — CRUD completo integrado no Settings
- [x] **Select de Produtos** — Filtro dinâmico por tipo de análise
- [x] **Auto-fill Resistência** — Pré-carrega baseado no produto selecionado
- [x] **8 Produtos Mock** — Pré-cadastrados

---

## 🔄 PLANO DE ATUALIZAÇÃO — Etapa Granulometria v2.0

> **Referência de Design:** App de produção industrial (screenshot anexo)
> **PRD Base:** `prd-granulometria2.md`
> **Status:** 📋 PLANEJADO — Aguardando implementação

### Motivação

A etapa de Granulometria atual é funcional mas ultrapassada. O novo design segue um app de referência industrial já validado em campo, trazendo UX otimizada para operadores de laboratório.

---

### 📊 Análise Comparativa: ATUAL vs NOVO

| Aspecto | ❌ ATUAL | ✅ NOVO (v2.0) |
|---|---|---|
| **Layout tabela** | Tabela simples com inputs básicos | Tabela compacta com cabeçalhos ricos (nome, MF, %, botão banco) |
| **Cabeçalho material** | Só nome + % | Nome + botão "BANCO" + MF individual + % + botão remover (×) |
| **Peneiras** | 10 peneiras (19mm→0.15mm) | 10 peneiras + **FUNDO** (peneira adicional) |
| **Tipo de dado** | Massa retida (g) | **% Retida Individual** (toggle %) |
| **MF no cálculo** | Falta peneira 9.5mm | Inclui 9.5mm na série normal |
| **Painel técnico** | Card separado à direita | **Barra compacta** no topo: MF combinado + Compatibilidade + Definir DNA |
| **Gráfico** | LineChart simples com linhas tracejadas | **3 camadas:** Zona normativa (area azul) + DNA alvo (dash âmbar) + Curva estudo (bold vermelha) |
| **Proporções** | Sliders simples com % | **Cards de material** com kg + % + slider + toggle (%/kg) |
| **Total mistura** | Não existe | **Barra de total** com capacidade da misturadora (ex: 550 kg) |
| **Solver** | ❌ Não existe | ✅ Botão **"OTIMIZAR TRAÇO"** — Coordinate Descent automático |
| **Normalizar** | ❌ Não existe | ✅ Botão **"NORMALIZAR MISTURA (100%)"** |
| **Camada Base/Face** | ❌ Não existe | ✅ **Tabs Camada Base / Camada Face** para pavers |
| **Status visual** | Badge simples | Badge **"FORA DO IDEAL"** em vermelho destaque no topo |
| **Importar do banco** | ❌ Não existe | ✅ Botão "BANCO" em cada coluna para importar agregado salvo |
| **Aviso solver** | ❌ Não existe | ✅ Tooltip no gráfico: "O Solver ajusta as proporções para a curva ficar dentro da faixa" |
| **Nota rodapé** | ❌ Não existe | ✅ "Baseado na capacidade da misturadora: 550 kg. Altere em dosagem se necessário." |
| **Mobile** | Só desktop | **Cards verticais** com tabs por material |
| **Debounce** | Sem debounce | **300ms debounce** nos inputs |
| **Auto-select** | Não tem | **Auto-seleção de texto** ao focar input |

---

### 🏗️ Plano de Implementação (7 Sprints)

#### Sprint 1 — Engine & Dados (sem UI)
> Arquivos: `granulometry-engine.ts`, `analysis-data.ts`

- [ ] **1.1** Corrigir `MF_SIEVES` — adicionar `9.5` à série normal
- [ ] **1.2** Adicionar peneira "Fundo" ao `PENEIRAS_PADRAO`
- [ ] **1.3** Criar `solveOptimalProportions()` — algoritmo Coordinate Descent
  - Input: materiais + limites DNA
  - Output: proporções otimizadas que minimizam MSE vs DNA
  - Restrições: cada proporção 0–100%, soma = 100%
- [ ] **1.4** Criar `normalizeProportions()` — normalizar para soma 100%
- [ ] **1.5** Criar `calcProportionsInKg()` — converter % → kg baseado na capacidade da misturadora
- [ ] **1.6** Adicionar campo `densidade` ao tipo `AnalysisMaterial`
- [ ] **1.7** Testes unitários para solver e MF corrigido

#### Sprint 2 — Refatorar StepGranulometry (Componentes Menores)
> Arquivo atual: `StepGranulometry.tsx` (368 linhas → dividir em ~6 componentes)

- [ ] **2.1** `GranulometryHeader.tsx` — Título + tabs Camada Base/Face + badge status
- [ ] **2.2** `SieveTable.tsx` — Tabela de peneiras com inputs (extraída do componente atual)
- [ ] **2.3** `MaterialColumnHeader.tsx` — Cabeçalho rico: nome, MF, %, botão banco, botão remover
- [ ] **2.4** `TechnicalBar.tsx` — Barra compacta horizontal: MF combinado + Compatibilidade% + Definir DNA
- [ ] **2.5** `GranulometryChart.tsx` — Gráfico com 3 camadas (zona, DNA, curva)
- [ ] **2.6** `ProportionPanel.tsx` — Cards de material com kg/% + slider + total misturadora
- [ ] **2.7** `SolverActions.tsx` — Botões Normalizar + Otimizar Traço + nota rodapé

#### Sprint 3 — Gráfico 3 Camadas
> Arquivo: `GranulometryChart.tsx`

- [ ] **3.1** Camada 1: **Zona Normativa** — `<Area>` azul clara entre limites superior/inferior NBR
- [ ] **3.2** Camada 2: **DNA Alvo** — `<Line>` tracejada âmbar com centro dos limites
- [ ] **3.3** Camada 3: **Curva de Estudo** — `<Line>` vermelha bold com dot markers
- [ ] **3.4** Tooltip customizado com valores exatos por peneira
- [ ] **3.5** Eixo X invertido (maior→menor abertura) conforme referência

#### Sprint 4 — Painel de Proporções (Design Referência)
> Arquivo: `ProportionPanel.tsx`

- [ ] **4.1** Toggle **%** / **kg** para alternar visualização
- [ ] **4.2** Cards por material: ícone colorido + nome + valor (kg ou %) + slider
- [ ] **4.3** Barra de progresso total: `550 / 550 KG` com indicador visual
- [ ] **4.4** Capacidade da misturadora editável (default 550kg do `volume_batelada`)
- [ ] **4.5** Grid responsivo: 2 colunas desktop, 1 coluna mobile

#### Sprint 5 — Solver + Ações
> Arquivos: `SolverActions.tsx`, `granulometry-engine.ts`

- [ ] **5.1** Botão **"NORMALIZAR MISTURA (100%)"** — ajusta proporções para somar 100%
- [ ] **5.2** Botão **"OTIMIZAR TRAÇO (CENTRO DA FAIXA)"** — chama solver engine
- [ ] **5.3** Feedback visual durante otimização (loading spinner)
- [ ] **5.4** Tooltip/alerta no gráfico: "O Solver ajusta as proporções para a curva ficar dentro da faixa"
- [ ] **5.5** Nota rodapé: "Baseado na capacidade da misturadora: X kg. Altere em dosagem se necessário."

#### Sprint 6 — Banco de Agregados (Importar)
> Integração com página de Materiais existente

- [ ] **6.1** Botão "BANCO" no cabeçalho de cada coluna de material
- [ ] **6.2** Modal de seleção: lista materiais do store com dados granulométricos
- [ ] **6.3** Ao selecionar, preenche automaticamente as massas retidas da coluna
- [ ] **6.4** Botão "×" para remover material da análise
- [ ] **6.5** Botão "+" para adicionar novo material (até 6 materiais)

#### Sprint 7 — UX & Responsividade
> Polimento final

- [ ] **7.1** Debounce 300ms em todos os inputs numéricos
- [ ] **7.2** Auto-seleção de texto ao focar input (`onFocus → select()`)
- [ ] **7.3** Layout mobile: tabs por material + cards verticais
- [ ] **7.4** Tabs **Camada Base / Camada Face** (apenas para tipo paver)
- [ ] **7.5** Animações de transição com framer-motion
- [ ] **7.6** Testes visuais e validação cross-browser

---

### 📁 Estrutura de Arquivos (Pós-Atualização)

```
src/
├── lib/
│   ├── granulometry-engine.ts     # Motor + Solver (atualizado)
│   ├── solver-engine.ts           # Coordinate Descent (novo)
│   ├── analysis-data.ts           # Dados + Fundo + densidade (atualizado)
│   └── utils.ts
├── components/
│   ├── analysis/
│   │   ├── StepGranulometry.tsx        # Orquestrador (simplificado)
│   │   ├── GranulometryHeader.tsx      # Título + tabs + status (novo)
│   │   ├── SieveTable.tsx              # Tabela peneiras (novo)
│   │   ├── MaterialColumnHeader.tsx    # Cabeçalho material rico (novo)
│   │   ├── TechnicalBar.tsx            # MF + Compat + DNA (novo)
│   │   ├── GranulometryChart.tsx       # Gráfico 3 camadas (novo)
│   │   ├── ProportionPanel.tsx         # Cards kg/% + total (novo)
│   │   ├── SolverActions.tsx           # Normalizar + Otimizar (novo)
│   │   ├── StepIdentification.tsx
│   │   ├── StepDosage.tsx
│   │   ├── StepReview.tsx
│   │   └── StepResult.tsx
```

---

### 🎨 Diretrizes de Design (Baseado na Referência)

| Elemento | Especificação |
|---|---|
| **Fundo geral** | Cinza claro (`bg-muted/30`) — limpo, industrial |
| **Cards** | Bordas arredondadas, sombra sutil, fundo branco |
| **Badge status** | Vermelho destaque `"FORA DO IDEAL"` / Verde `"CONFORME"` |
| **Tabela** | Compacta, inputs centralizados, header com info rica |
| **Gráfico** | Zona azul semitransparente + linha vermelha bold + dash âmbar |
| **Botão solver** | Vermelho primário, destaque principal, ícone de otimização |
| **Sliders** | Track com cor do material, thumb arredondado |
| **Tipografia** | Bold para títulos/valores, muted para labels |

---

### ⚠️ Regras de Migração

1. **Não quebrar** as etapas 1, 3, 4, 5 do wizard
2. **Manter** compatibilidade com `AnalysisFormData` existente
3. **Manter** PDF generator funcionando
4. **Preservar** dados mock durante migração (substituir gradualmente)
5. **Cada sprint é independente** — pode ser entregue e testado isoladamente

---

## Roadmap Geral

### ✅ Implementado

- [x] Catálogo de Produtos Dinâmico
- [x] Wizard 5 Etapas completo
- [x] Motor de Cálculo Granulométrico
- [x] Configurações (Produtos, Tipos, Rompimentos, Webhooks)

### 🔄 Em Andamento — Granulometria v2.0

- [ ] Sprint 1 — Engine & Dados
- [ ] Sprint 2 — Refatoração componentes
- [ ] Sprint 3 — Gráfico 3 camadas
- [ ] Sprint 4 — Painel proporções
- [ ] Sprint 5 — Solver + ações
- [ ] Sprint 6 — Banco de agregados
- [ ] Sprint 7 — UX & responsividade

### Próximas Etapas (Pós-Granulometria)

- [ ] Ativar Lovable Cloud (banco de dados + auth)
- [ ] CRUD completo de Materiais com curva granulométrica
- [ ] Página de Login/Registro
- [ ] Persistência das análises no banco
- [ ] Edge Functions para cálculos server-side
- [ ] Geração de PDF com jsPDF
- [ ] Sistema de notificações realtime
- [ ] Webhooks para traços aprovados
- [ ] Gestão de usuários com roles
