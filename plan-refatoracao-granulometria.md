# Plano de Refatoração da Granulometria

**Objetivo:** Adaptar a tela atual de Granulometria do aplicativo para que tenha exata paridade visual e funcional com o design de referência, adicionando controles interativos (sliders), botões de ação e exibição refinada de dados (MF no cabeçalho e limites no gráfico).

## 1. ANALYSIS (Concluído)
Foi identificada a necessidade de 4 frentes principais de refatoração na UI/UX:
- Controles de Cabeçalho (Camadas e Alertas)
- Cabeçalho da Tabela (Botão de remover material e dados embutidos)
- Gráfico e Resultados (Envelope de limites e Badge de Compatibilidade)
- Controles de Dosagem (Sliders arrastáveis, Toggle %/KG, Botões Quentes)

## 2. PLANNING (Definição de Tarefas)

### Fase 1: Atualização dos Cabeçalhos e Alertas
- [ ] Adicionar Switcher de "CAMADA BASE" e "CAMADA FACE" no topo.
- [ ] Adicionar Badge Condicional "FORA DA CURVA" ou "DENTRO DA FAIXA".
- [ ] Relocar o botão "COMBINAR DNA" para o topo do form, à direita.

### Fase 2: Tabela Granulométrica (Colunas)
- [ ] Implementar botão `[X]` no cabeçalho de cada coluna para remover o material da mistura atual.
- [ ] Exibir o Módulo de Finura (MF) e a porcentagem (%) atuais do material logo abaixo do nome/banco no cabeçalho da tabela.

### Fase 3: Gráfico de Curva Combinada
- [ ] Atualizar o componente de gráfico (`GranulometryChart.tsx`) para receber e renderizar os limites superior e inferior (linhas tracejadas azuis).
- [ ] Adicionar o card/badge de "COMPAT. XX%" ao lado do valor do Módulo de Finura Total.

### Fase 4: Controles de Proporção (Dosagem Interativa)
- [ ] Substituir os cards numéricos estáticos por componentes de **Slider** (`Slider.tsx` do shadcn/ui) com a bolinha vermelha estilizada.
- [ ] Adicionar Toggle Button grupo ( `[ % ] [ KG ]` ) para alternar a unidade exibida.
- [ ] Adicionar botões de ação "NORMALIZAR MISTURA (100%)" e "OTIMIZAR TRAÇO (CENTRO DA FAIXA)" abaixo dos sliders.

## 3. SOLUTIONING (Arquitetura Visual)
- **Componentes Afetados:** Identificar sub-componentes em `StepGranulometry.tsx` e `GranulometryChart.tsx`.
- **Estado (State):** O estado da mistura (proporções) já existe no store, mas precisará ser atualizado em tempo real onDrag/onChange dos sliders.
- **Lógica de Remoção:** A função de remover agregado `[X]` precisará atualizar o estado filtrando o array de materiais ativos e recalcular 100% da mistura (ou manter a soma atual e alertar para normalizar).

## 4. IMPLEMENTATION (Próximo Passo)
- **Executor:** `@frontend-specialist`.
- Após aprovação deste plano, o front-end assumirá para modificar os arquivos React/Tailwind.

---
> ⚠️ Aguardando aprovação do Operador para seguir à etapa de Implementação.
