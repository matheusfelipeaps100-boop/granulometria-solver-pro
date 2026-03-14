# Plano de Implementação: Configurações Pendentes

## Domínio
WEB (Frontend UI + Zustand State Management)

## Especialistas Acionados
`frontend-specialist`

## Ordem de Execução

1. **Camada de Estado (Zustand)**
   - Editar `src/store/useAppStore.ts` para incluir a estrutura de `OrganizationIdentity` (nome, cnpj, endereco, responsavel).
   - Incluir a estrutura de `SystemParams` (volume_batelada, densidade_cimento, divisor_a, divisor_b).
   - Adicionar ações `updateIdentity` e `updateParams`.

2. **UI: Tab Identidade**
   - Extrair a Tab "Identidade" para um componente `src/components/settings/IdentityTab.tsx`.
   - Adicionar binds de state local e chamada para `updateIdentity` ao salvar, exibindo um `toast.success`.

3. **UI: Tab Parâmetros**
   - Extrair a Tab "Parâmetros" para `src/components/settings/ParamsTab.tsx`.
   - Adicionar binds de forma segura com `parseFloat`/`Number` e action `updateParams`.

4. **Integração Básica**
   - Substituir informações *hardcoded* (caso presentes e fáceis) nos relatórios (`QualityReportPage`) para usar a `Identity` do store (ex: Nome da Organização).
