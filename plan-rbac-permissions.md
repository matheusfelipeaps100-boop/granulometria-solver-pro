# Plano de Estruturação: Permissões de Usuários (RBAC)

**Objetivo:** Implementar o Controle de Acesso Baseado em Cargos (RBAC) no sistema Laja e Forro, restringindo rotas, componentes de interface e ações de acordo com o nível de permissão do usuário.

---

## 👥 Perfis de Acesso Definidos

### 1. Administrativo (`ADMIN`)
* **Descrição:** Controle total do sistema.
* **Acessos de Rota:** Todas as páginas (Dashboard, Produção, Análises, Traços, Materiais, Rompimentos, Relatórios e Configurações).
* **Ações Permitidas:** Acesso de Visualização, Criação, Edição e Exclusão (CRUD completo) para qualquer entidade no sistema. Acesso à alteração de permissões e gestão de usuários.

### 2. Produção (`PRODUCAO`)
* **Descrição:** Focado exclusivamente na operação de fábrica e bateladas.
* **Acessos de Rota:** Apenas a aba de "Produção" (`/production`).
* **Ações Permitidas:** Visualizar análises liberadas para produção, criar/apontar novos lotes de concreto produzidos e visualizar lotes criados. Bloqueado de ver relatórios, configurações e de realizar edições fora do seu escopo de produção.

### 3. Vendas (`VENDAS`)
* **Descrição:** Acesso de auditoria e acompanhamento para times comerciais e stakeholders.
* **Acessos de Rota:** "Análises" (`/analyses`), "Produção" (`/production`), "Rompimentos" (`/ruptures`) e possivelmente "Relatórios" (`/reports`).
* **Ações Permitidas:** Somente leitura (`READ-ONLY`). Podem visualizar dashboards, PDFs de relatórios e status de produções, mas os botões de "Novo", "Editar", "Aprovar" e "Excluir" estarão invisíveis ou desativados.

### 4. Laboratório (`LABORATORIO`)
* **Descrição:** Operadores técnicos e laboratoristas.
* **Acessos de Rota:** Processos Laboratoriais estritos. Acesso à "Análises" (Granulometria à conclusão técnica), "Materiais", "Traços Padrão", "Rompimentos" e "Relatórios".
* **Ações Permitidas:** Criação, Edição e Aprovação (se aplicável ao perfil técnico) de Análises e Rompimentos. Sem acesso a "Configurações" sistêmicas e bloqueado de apagar dados base que pertençam apenas à alçada de Engenharia (Admin).

---

## 🛠 Arquitetura de Implementação (Frontend & Estado)

### Fase 1: Camada de Estado & Autenticação (Zustand)
1. Atualizar o estado global (ex: `useAuthStore` ou inserir em `useAppStore`) para armazenar o perfil ativo.
   * `Role = "ADMIN" | "PRODUCAO" | "VENDAS" | "LABORATORIO"`
   * Variável de sessão temporária (para fins de simulação/teste) como um seletor no Header/Configurações, permitindo que o usuário altere de papel para testar a interface.

### Fase 2: Mapeamento de Rotas Privadas (React Router)
1. Criar um componente de Higher-Order Component ou Layout Base (`ProtectedRoute.tsx`).
2. Configurar o mapa de permissões (ACL - Access Control List) para cada rota em `App.tsx`.
   * Se um perfil tentar acessar uma rota não autorizada, redirecionar fortemente para `/unauthorized` ou para a sua _home_ padrão.

### Fase 3: Restrição de Interface (UI/Componentes)
1. Criar hooks utilitários (`usePermissions()`) ou o componente `<RequireRole allowedRoles={['ADMIN', 'LABORATORIO']}>`.
2. Ocultar botões em tela baseados na ROLE:
   * Em `AnalysesPage`: Ocultar o botão "Nova Análise" para `VENDAS` e `PRODUCAO`.
   * Nas tabelas: Ocultar as colunas de "Ações" (Editar/Excluir) se a Role for `VENDAS`.
   * Menu Lateral (`AppSidebar.tsx`): Ocultar links do menu dependendo da ROLE logada (ex: `PRODUCAO` só vê o link de Produção).

---

## 🛡 Considerações do "Security Auditor"
* **Segurança na Rota (Zero Trust):** Nunca confiar apenas na ocultação do CSS (botão sumiu). O bloqueio deve acontecer a nível de verificação de Renderização e de verificação de mudança de Estado.
* **Fail Secure:** Se o papel do usuário estiver indefinido ou houver falha na leitura, o sistema deve presumir "Acesso Negado" por padrão.
* **Reducionismo:** Conceder *Least Privilege* (Menor Privilégio Necessário).
