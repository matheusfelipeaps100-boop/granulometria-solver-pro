# Plano de Integração: Frontend → Supabase

## Overview
O sistema de segurança e esquema do Supabase está implementado (Tabelas, RLS e Auth). O objetivo atual é migrar o Frontend (atualmente usando mock data via Zustand) para consumir dados reais do Supabase. O projeto é do tipo **WEB** (React/Vite). As requisições serão geradas via React Query.

## Success Criteria
- [ ] Telas consultando, criando e atualizando dados diretamente do Supabase
- [ ] Cache local e revalidações transparentes com `react-query`
- [ ] Zustand utilizado apenas para estados efêmeros da UI
- [ ] Segurança por RLS funcionando corretamente nas chamadas da API

## Tech Stack
- **Banco de Dados:** Supabase
- **Cliente HTTP:** `@supabase/supabase-js`
- **Gerenciamento de Estado Async:** `@tanstack/react-query` (já instalado e configurado no App.tsx)

## File Structure (Hooks de Data Fetching)
Os hooks ficarão organizados na pasta `src/hooks/api/`:
- `useMaterials.ts`
- `useSieves.ts`
- `useTechnicalSettings.ts`
- `useAnalyses.ts`
...

## Task Breakdown

A integração ocorrerá em 3 fases principais. Faremos entregas graduais e testáveis.

### Fase 1: Fundações e Cadastros (Obrigatório primeiro)
| ID | Nome | Agente | Skills | Prioridade | Dependências |
|---|---|---|---|---|---|
| 1.1 | Criar `hooks/api/useMaterials.ts` | `frontend-specialist` | `react-best-practices` | Alta | Nenhuma |
| 1.2 | Integrar tela de Materiais | `frontend-specialist` | `react-best-practices` | Alta | 1.1 |
| 1.3 | Criar `hooks/api/useSieves.ts` | `frontend-specialist` | `react-best-practices` | Alta | Nenhuma |
| 1.4 | Integrar Peneiras (SettingsTab) | `frontend-specialist` | `react-best-practices` | Alta | 1.3 |

**Verificação (Fase 1):** Cadastrar e deletar um material pela UI. Confirmar no dashboard do Supabase.

---

### Fase 2: O Fluxo Principal (Análises e Produção)
| ID | Nome | Agente | Skills | Prioridade | Dependências |
|---|---|---|---|---|---|
| 2.1 | Criar `hooks/api/useAnalyses.ts` | `frontend-specialist` | `api-patterns` | Alta | 1.1, 1.3 |
| 2.2 | Integrar Wizard de Nova Análise | `frontend-specialist` | `react-best-practices` | Alta | 2.1 |
| 2.3 | Integrar Listagem/Aprovação de Análise | `frontend-specialist` | `react-best-practices` | Média | 2.1 |
| 2.4 | Criar `hooks/api/useProduction.ts` | `frontend-specialist` | `api-patterns` | Alta | 2.3 |
| 2.5 | Integrar tela de Produção de Lotes | `frontend-specialist` | `react-best-practices` | Alta | 2.4 |

**Verificação (Fase 2):** Concluir uma análise completa no Wizard e salvá-la. Aprovar a análise e bater um lote na tela de Produção. Confirmar o insert na tabela `production_batches`.

---

### Fase 3: Laboratório e Finalização
| ID | Nome | Agente | Skills | Prioridade | Dependências |
|---|---|---|---|---|---|
| 3.1 | Criar `hooks/api/useRuptures.ts` | `frontend-specialist` | `api-patterns` | Média | 2.5 |
| 3.2 | Integrar tela de Rompimentos | `frontend-specialist` | `react-best-practices` | Média | 3.1 |
| 3.3 | Remover mock data do Zustand | `frontend-specialist` | `clean-code` | Baixa | Fases 1, 2, 3 |

**Verificação (Fase 3):** Preencher a força de ruptura de um lote gerado na Fase 2. Verificar se o status do ciclo (`rupture_schedules`) mudou para `concluido`.

## Phase X: Verification
- [ ] Compilação limpa sem erros de TS (`npm run build`)
- [ ] Checagem de segurança (Nenhuma chave secréta exposta em código-fonte)
- [ ] Interface reativa (Testar o caching do react-query desligando a internet momentaneamente durante testes)
- [ ] Teste real completo de ponta a ponta na UI (criar material > criar análise de granulometria > aprovar traço > criar lote de produção)
