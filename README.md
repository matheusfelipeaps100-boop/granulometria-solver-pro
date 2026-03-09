# Granulometria Solver Pro — LAJEFORRO SISTEMAS

## Stack Técnica

- **Frontend:** React 18 + Vite + TypeScript
- **UI:** Tailwind CSS + shadcn/ui + Poppins font
- **Gráficos:** Recharts
- **Paleta:** Vermelho primário extraído da logo Lajeforro

---

## Implementações

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
  - `calcPctIndividual` — % individual por peneira
  - `calcPctAcumulada` — % acumulada retida
  - `calcModuloFinura` — MF (validado contra planilha)
  - `calcCombinedCurve` — Curva combinada da mistura
  - `calcCurvaStatus` — Status conforme/atenção/não conforme
  - `calcTensao` — Tensão de rompimento
  - `calcRuptureStats` — Estatísticas de rompimento
  - `calcDosage` — Cálculo de dosagem
- [x] **Dados Mock** (`src/lib/analysis-data.ts`)
  - 10 peneiras padrão, 4 materiais com massas reais, 3 DNAs com limites
- [x] **Stepper Visual** (`src/components/WizardStepper.tsx`)
- [x] **Etapa 1 — Identificação** — Formulário completo (tipo, código auto, nome, analista, produto, resistência, observações)
- [x] **Etapa 2 — Granulometria** — Tabela editável 10×4, sliders de proporção, painel técnico (MF, status, peneiras fora), gráfico LineChart com limites
- [x] **Etapa 3 — Dosagem** — 5 inputs, 4 cards calculados, tabela materiais/batelada
- [x] **Etapa 4 — Revisão** — 3 colunas resumo + mini gráfico + modal aprovar
- [x] **Etapa 5 — Resultado** — Banner aprovado, gráfico final, tabela batelada, resumo técnico, botões (PDF, Liberar, Salvar DNA)
- [x] **Lista de Análises** — Filtros por tipo, status e busca por texto

### ✅ Fase 3 — Sistema de Produtos Dinâmico

- [x] **Interface Product** — ID, nome, tipo, dimensões, resistência referência
- [x] **Catalog Mock Data** — 8 produtos pré-cadastrados por tipo (bloco estrutural, vedação, paver, cp)
- [x] **Store CRUD** — addProduct, updateProduct, deleteProduct no Zustand
- [x] **Settings Integration** — Aba "Produtos" com tabela, filtro e modal CRUD
- [x] **Wizard Update** — Select dinâmico filtrado por tipo_analise com auto-fill resistência
- [x] **Field Migration** — produto (string) → produto_id + produto_nome
- [x] **Compatibilidade** — PDF e Review compatíveis com nova estrutura

---

## Estrutura de Arquivos

```
src/
├── lib/
│   ├── granulometry-engine.ts    # Motor de cálculo (8 funções)
│   ├── analysis-data.ts          # Dados mock, tipos, constantes
│   └── utils.ts                  # Utilitários CN
├── components/
│   ├── analysis/
│   │   ├── StepIdentification.tsx    # Select dinâmico de produtos
│   │   ├── StepGranulometry.tsx
│   │   ├── StepDosage.tsx
│   │   ├── StepReview.tsx            # Usa produto_nome
│   │   └── StepResult.tsx
│   ├── settings/
│   │   ├── ProductsTab.tsx           # Aba produtos com CRUD
│   │   └── ProductModal.tsx          # Modal criar/editar produto
│   ├── WizardStepper.tsx
│   ├── StatusBadge.tsx
│   ├── AppLayout.tsx
│   ├── AppHeader.tsx
│   ├── AppSidebar.tsx
│   └── ui/                       # shadcn/ui components
├── pages/
│   ├── Dashboard.tsx
│   ├── AnalysesPage.tsx
│   ├── NewAnalysisPage.tsx       # Wizard 5 etapas
│   ├── MaterialsPage.tsx
│   ├── StandardTracesPage.tsx
│   ├── ProductionPage.tsx
│   ├── RupturesPage.tsx
│   ├── ReportsPage.tsx
│   └── SettingsPage.tsx              # Aba Produtos como primeira aba
└── store/
    └── useAppStore.ts                # Products CRUD actions
└── App.tsx                       # Rotas
```

---

## Roadmap

### Próximas Etapas

- [ ] Ativar Lovable Cloud (banco de dados + auth)
- [ ] CRUD completo de Materiais com curva granulométrica
- [ ] Página de Login/Registro
- [ ] Persistência das análises no banco
- [ ] Edge Functions para cálculos server-side
- [ ] Geração de PDF com jsPDF
- [ ] Sistema de notificações realtime
- [ ] Webhooks para traços aprovados
- [ ] Gestão de usuários com roles (admin, gestor, laboratório, produção, visualizador)
