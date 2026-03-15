# PRD — Módulo de Granulometria (Extração Técnica)

Este documento detalha exclusivamente a etapa de **Granulometria e Mistura Técnica** do sistema de Curva de Consumo & Dosagem.

## 1. Visão Geral da Etapa
A etapa de Granulometria é o "coração" técnico do sistema. Nela, o usuário define a composição física dos agregados (areias, pedras, etc.) para criar uma **Curva Combinada** que servirá de base para o cálculo de dosagem de cimento.

---

## 2. UX / UI (User Experience & Interface)

### Desktop (Tabela Técnica)
- **Tabela de Peneiras:** Exibição horizontal dos materiais e vertical das peneiras padrão (12.5mm a Fundo).
- **Entrada de Dados:** Inputs numéricos otimizados para teclado numérico, com auto-seleção de texto ao focar.
- **Banco de Agregados:** Atalho direto em cada coluna de material para importar dados salvos no banco.
- **DNA (Receita Alvo):** Botão de destaque para carregar uma curva de referência (Gabarito).

### Mobile (Cards de Fluxo)
- **Navegação por Tabs:** Switcher no topo para alternar entre materiais (Areia Fina, Brita, etc.).
- **Lista de Inputs:** Cards verticais para preenchimento rápido em campo.
- **Visualização Fixa:** Gráfico e MF (Módulo de Finura) acessíveis sem perder o contexto do preenchimento.

### Elementos Visuais (Shadcn/UI + Tailwind)
- **Feedback em Tempo Real:** MF e Curva Combinada atualizam a cada mudança de input (debounce de 300ms).
- **Status de Compatibilidade:** Badges coloridos (Verde/Amarelo/Vermelho) indicando proximidade com o DNA alvo.

---

## 3. Motor de Cálculos (Engines)

### Cálculos Básicos ([granulometry.ts](file:///c:/Users/Laje%20Forro/Documents/app/src/lib/calculations/granulometry.ts))
1. **Retida Acumulada:**
   `Soma sucessiva das porcentagens retidas individuais em cada peneira.`
2. **Módulo de Finura (MF):**
   `Soma das retidas acumuladas nas peneiras da série normal (9.5, 4.8, 2.4, 1.2, 0.6, 0.3, 0.15) / 100.`
3. **Curva Combinada:**
   `Σ (Retida Acumulada do Material * Proporção do Material / 100)` para cada peneira.

### Solver de Otimização ([solver-engine.ts](file:///c:/Users/Laje%20Forro/Documents/app/src/lib/calculations/solver-engine.ts))
- **Algoritmo:** *Coordinate Descent* (Descida de Coordenadas).
- **Objetivo:** Minimizar o **MSE (Mean Squared Error)** entre a Curva Combinada e o DNA Alvo.
- **Variáveis:** Proporções de cada agregado (0 a 100%).
- **Resultado:** Sugestão automática de mistura que melhor se adapta à curva ideal.

---

## 4. Visual Engine (Modelo do Gráfico)

### Gráfico de Curva Granulométrica (`Recharts`)
- **Eixo X:** Abertura das peneiras (Escala logarítmica ou nominal inversa).
- **Eixo Y:** Porcentagem Retida Acumulada (0 a 100%).
- **Camadas (Layers):**
  1. **Zona Normativa (Area):** Faixa azul clara entre os limites superior e inferior (NBR).
  2. **DNA Alvo (Line Dash):** Linha tracejada âmbar indicando a meta.
  3. **Curva de Estudo (Line Bold):** Linha vermelha sólida com pontos marcadores (resultado atual).
- **Interatividade:** Tooltip customizado mostrando o valor exato em cada peneira.

---

## 5. Tecnologia & Design Stack
- **Framework:** Next.js 14+ (App Router).
- **Linguagem:** TypeScript (Tipagem forte para granulometria).
- **Estilização:** Tailwind CSS v4.
- **Gráficos:** Recharts.
- **Estado Global:** Zustand (para histórico e persistência leve).
- **Ícones:** Lucide React.
- **Banco de Dados:** Supabase (PostgreSQL).
- **ORM (Simulado):** Prisma (ou Direct SQL conforme [supabase_schema.sql](file:///c:/Users/Laje%20Forro/Documents/app/supabase_schema.sql)).

---

## 6. Modelo de Dados & Schema

### Esquema Prisma (Conceitual)
```prisma
model AggregateBank {
  id        String   @id @default(uuid())
  userId    String
  name      String
  density   Decimal
  sieves    AggregateSieve[]
}

model AggregateSieve {
  id              String   @id @default(uuid())
  aggregateId     String
  sieveSize       String   // "9.5", "4.8", etc
  percentRetained Decimal
}

model RecipeDNA {
  id        String   @id @default(uuid())
  userId    String
  name      String
  targetMF  Decimal
  type      String   // "BE" ou "PV"
  sieves    DNASieve[]
}
```

### Tabelas Supabase (PostgreSQL)
- `public.aggregate_bank`: Armazena o nome e densidade do material.
- `public.aggregate_bank_sieve_data`: Armazena os valores de % retida por peneira para cada material do banco.
- `public.recipe_dna`: Armazena as receitas padrão (Gabaritos).
- `public.recipe_dna_sieve_data`: Armazena a curva alvo (% passante) de cada DNA.

---

## 7. Fluxo de Operação
1. **Input:** Usuário digita ou importa do banco dados de 3 a 5 materiais.
2. **Setup:** Define-se o projeto (Bloco ou Paver) para setar os limites normativos.
3. **Alvo:** Carrega um DNA de referência.
4. **Cálculo:** O sistema gera o MF individual e a curva combinada inicial.
5. **Otimização:** Clique em "Solver" para o algoritmo ajustar as porcentagens automaticamente.
6. **Output:** Curva validada pronta para a etapa de Dosagem/Consumo.
