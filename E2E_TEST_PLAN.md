# 🧪 END-TO-END TEST SUITE - Granulometria Solver Pro

## Pré-requisitos
- [ ] Supabase conectado (verificado ✅)
- [ ] Build passando (`npm run build`)
- [ ] TypeScript sem erros (`npx tsc --noEmit`)
- [ ] Dev server rodando (`npm run dev`)
- [ ] Conta de teste criada com acesso ao projeto

---

## TEST 1: Autenticação & Sessão ✅

### Objetivo
Verificar que login/logout funciona e persiste sessão

### Passos
1. Vá para `/login`
2. Faça login com credenciais de teste
3. Verifique que é redirecionado para `/`
4. Abra DevTools → Application → Cookies
5. Procure por `sb-` (Supabase session token)
6. Faça logout
7. Verifique que volta para `/login`

### Verificação ✅
- [ ] Login realiza com sucesso
- [ ] Token JWT aparece nos cookies
- [ ] Redirecionamento funciona
- [ ] Logout limpa a sessão
- [ ] Proteção de rota funciona (não consegue acessar `/` sem login)

---

## TEST 2: Carregamento de Dados Reais ✅

### Objetivo
Verificar que dados do Supabase carregam corretamente

### Passos

#### 2.1 - Materiais
1. Vá para `/materials`
2. Verifique que lista carrega
3. Deve mostrar pelo menos 1 material
4. Inspecione Network → GraphQL/REST calls
5. Verifique que dados vêm de `https://lhfxcjwpsjnpmgyyhbxi.supabase.co`

#### 2.2 - Análises
1. Vá para `/analyses`
2. Verifique que lista carrega
3. Filtre por status
4. Verifique que filtros funcionam

#### 2.3 - Lotes de Produção
1. Vá para `/production`
2. Verifique que batches carregam
3. Clique em um batch para ver detalhes
4. Verifique que dados estão corretos

### Verificação ✅
- [ ] Materiais carregam (GET /materials)
- [ ] Análises carregam (GET /analyses)
- [ ] Lotes carregam (GET /production_batches)
- [ ] Peneiras carregam (GET /sieves)
- [ ] Todas as chamadas vêm do Supabase
- [ ] Sem erros 404 ou 401

---

## TEST 3: CRUD Operations ✅

### Objetivo
Verificar Create, Read, Update, Delete funcionam

### 3.1 - CREATE Material
```bash
1. Vá para `/materials`
2. Clique em "+ Novo Material"
3. Preencha:
   - Nome: "Material Teste E2E"
   - Tipo: "areia"
   - Descrição: "Teste automático"
4. Clique em "Salvar"
5. Verifique que aparece na lista
```

### 3.2 - UPDATE Material
```bash
1. Clique no material criado
2. Altere a descrição
3. Salve
4. Verifique que a mudança aparece
```

### 3.3 - DELETE Material
```bash
1. Abra o material
2. Clique em "Deletar"
3. Confirme
4. Verifique que desapareceu da lista
```

### 3.4 - Análise Completa (Wizard)
```bash
1. Vá para `/analyses/new`
2. Preencha Step 1:
   - Nome: "Análise E2E Test"
   - Tipo: "bloco_estrutural"
   - Produto: Selecione um
3. Avance para Step 2
4. Selecione 2+ materiais
5. Avance para Step 3
6. Preencha dosagem
7. Clique em "Salvar"
8. Verifique em `/analyses` que aparece
```

### Verificação ✅
- [ ] Criar material funciona
- [ ] Aparecerecente na lista sem reload
- [ ] Editar material funciona
- [ ] Deletar material funciona
- [ ] Criar análise completa funciona
- [ ] Wizard valida cada step
- [ ] Salvamento persiste no Supabase

---

## TEST 4: Realtime Subscriptions 🔄

### Objetivo
Verificar que atualizações em tempo real funcionam

### Passos

#### 4.1 - Notificações Realtime
```bash
1. Abra dois navegadores (ou abas) lado a lado
   A: Seu dashboard
   B: Supabase Console SQL

2. No Browser B, execute no SQL Editor:
   INSERT INTO notifications (
     id, organization_id, recipient_id, type, title, message, read
   ) VALUES (
     gen_random_uuid(),
     'sua-org-id-aqui',
     'seu-user-id-aqui',
     'analysis_approved',
     'Teste Realtime',
     'Notificação de teste',
     false
   );

3. Volte para Browser A
4. Abra o NotificationsDropdown (sino)
5. Verifique que nova notificação aparece SEM RELOAD
```

#### 4.2 - Dashboard Metrics
```bash
1. Vá para Analytics Page (ou Dashboard)
2. Note a timestamp de última atualização
3. Crie uma nova análise em `/analyses/new`
4. Volte para Analytics
5. Verifique que métrica "Análises" aumentou
6. Verfique que "Atualizado em: XX:XX:XX" é recente
```

### Verificação ✅
- [ ] Notificações aparecem em tempo real
- [ ] Dashboard atualiza sem reload
- [ ] Métricas são recalculadas ao vivo
- [ ] Múltiplos navegadores sincronizam

---

## TEST 5: Storage - PDF Upload ✅

### Objetivo
Verificar upload/download de PDFs

### Passos

#### Pré-requisito: Configurar Storage
Se ainda não fez, execute no Supabase Console:
```sql
-- Ver scripts/storage-setup.sql
```

#### 5.1 - Upload de PDF
```bash
1. Encontre StorageTestComponent (ou adicione em uma página de teste)
2. Clique em "Teste Upload de PDF"
3. Aguarde geração e upload
4. Verifique que URL aparece
5. Clique em "Baixar PDF"
6. Salve e verifique que abre corretamente
```

#### 5.2 - Delete de PDF
```bash
1. Com PDF bereits enviado
2. Clique em ícone de trash
3. Verifique que URL desaparece
4. Tente acessar URL antiga - deve dar 404
```

### Verificação ✅
- [ ] PDF é criado corretamente
- [ ] Upload funciona
- [ ] URL pública é gerada
- [ ] PDF pode ser baixado
- [ ] Delete funciona
- [ ] URL deletada não mais funciona

---

## TEST 6: Permissões & RLS ✅

### Objetivo
Verificar que Row Level Security funciona

### Passos

#### 6.1 - Organização Isolation
```bash
1. Crie 2 usuários em orgs diferentes
2. User A loga em Browser A
3. User B loga em Browser B
4. Ambos vão para `/materials`
5. Verifique que cada um vê APENAS seus materiais
6. Abra DevTools → Network
7. Ambos fazem GET /materials
8. Verifique que filters são aplicados no backend
```

#### 6.2 - Role-based Access
```bash
1. Com usuário ADMIN:
   - Pode criar material ✓
   - Pode editar material ✓
   - Pode deletar material ✓

2. Com usuário LABORATORIO:
   - Pode criar análise ✓
   - Não consegue editar tél empresa ✓

3. Com usuário VISUALIZADOR:
   - Pode ver tudo ✓
   - Não consegue criar/editar/deletar ✓
```

### Verificação ✅
- [ ] Orgs isoladas (não veem dados umas das outras)
- [ ] RLS policies funcionam
- [ ] Roles controlam permissões
- [ ] Usuários não conseguem acessar dados de outras orgs

---

## TEST 7: Performance & Load 📊

### Objetivo
Verificar que app aguenta carga

### Passos

#### 7.1 - Lista Grande
```bash
1. Vá para `/materials`
2. Abra DevTools → Performance
3. Inicie gravação
4. Vá para a página e deixe carregar
5. Pause observação
6. Verifique:
   - Tempo de carregamento < 2s
   - Renderização < 1s
   - Sem memory leaks
```

#### 7.2 - Filtros & Search
```bash
1. Vá para `/materials`
2. Digite algo em search
3. Observe que results filtram sem lag
4. Verifique DevTools Network que não faz chamada por letra
```

### Verificação ✅
- [ ] Listas grande carregam rápido
- [ ] Filtros funcionam sem lag
- [ ] Sem memory leaks na console
- [ ] Build size razoável (< 500KB gzip)

---

## TEST 8: Error Handling ❌

### Objetivo
Verificar que erros são tratados graciosamente

### Passos

#### 8.1 - Network Error
```bash
1. Vá para `/materials`
2. Abra DevTools → Network
3. Marque "Offline"
4. Tente carregar a página
5. Verifique que mostra erro amigável
6. Volte online
7. Clique em retry/reload
8. Deve funcionar novamente
```

#### 8.2 - Validação de Formulário
```bash
1. Vá para `/materials`
2. Clique em "+Novo"
3. Tente salvar sem preencher campos obrigatórios
4. Verifique que mostra mensagens de erro específicas
5. Preencha campos
6. Salve com sucesso
```

### Verificação ✅
- [ ] Offline mosta mensagem clara
- [ ] Retry/reload funciona
- [ ] Validações de form funcionam
- [ ] Erros não quebram a app
- [ ] Toast notifications appecem

---

## ✅ CHECKLIST FINAL

**Marque cada teste conforme completa:**

- [ ] TEST 1: Autenticação & Sessão ✅
- [ ] TEST 2: Carregamento de Dados Reais ✅
- [ ] TEST 3: CRUD Operations ✅
- [ ] TEST 4: Realtime Subscriptions 🔄
- [ ] TEST 5: Storage - PDF Upload ✅
- [ ] TEST 6: Permissões & RLS ✅
- [ ] TEST 7: Performance & Load 📊
- [ ] TEST 8: Error Handling ❌

---

## 🎯 CONCLUSÃO

Quando todos os testes passarem, você pode com confiança afirmar que:

✅ **App está 100% integrado com Supabase**
✅ **Dados reais carregam corretamente**
✅ **Operações CRUD funcionam end-to-end**
✅ **Realtime updates funcionam**
✅ **Storage funciona para arquivos**
✅ **Segurança (RLS) está forte**
✅ **Performance é boa**
✅ **Erro handling é robusto**

---

**Tempo estimado:** 1-2 horas
**Dificuldade:** Média
**Benefício:** Confiabilidade 100% em produção

Bom  teste! 🚀
