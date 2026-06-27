# Vida em Ordem — Contexto do Projeto

## O que é esse app
App pessoal PWA para um casal gerenciar tarefas e finanças. Dois perfis: Pessoa 1 (admin, vê tudo) e Pessoa 2 (membro, vê só o próprio). Sem troca de login para visão cruzada.

## Stack
- **Frontend:** React 18 + Vite 6 + Tailwind CSS v3 + shadcn/ui + Recharts (JavaScript, não TypeScript)
- **Backend:** Supabase (PostgreSQL + Auth + RLS + Realtime)
- **Deploy:** Vercel + PWA instalável via vite-plugin-pwa

## Design system — SEGUIR RIGOROSAMENTE

### Paleta
```
--color-bg:        #0F0F0F   /* fundo geral */
--color-surface:   #1A1A1A   /* cards, painéis */
--color-surface-2: #242424   /* inputs, hover states */
--color-border:    #2E2E2E   /* bordas */
--color-accent:    #C8F04D   /* verde-limão — cor assinatura */
--color-accent-2:  #A8D438   /* accent hover */
--color-text-1:    #F2F2F2   /* texto principal */
--color-text-2:    #8A8A8A   /* texto secundário */
--color-text-3:    #4A4A4A   /* placeholder */
--color-danger:    #FF5C5C
--color-success:   #4ECDC4
--color-warning:   #FFB830
```

### Tipografia
- **Inter** (400/500/700) — tudo exceto valores monetários
- **JetBrains Mono** — OBRIGATÓRIO para valores monetários (R$), contadores, badges numéricos
- Importar ambas via Google Fonts no `index.html`

### Regras visuais inegociáveis
- Zero sombras (box-shadow: none em tudo)
- Bordas sempre 0.5–1px solid var(--color-border)
- Border radius: 6px (sm) / 10px (md) / 16px (lg) / 24px (xl)
- Espaçamento: múltiplos de 4px
- Fundo dos cards: sempre var(--color-surface)
- Hover: sempre var(--color-surface-2)
- Cor accent (#C8F04D) APENAS em: CTAs principais, valores positivos, progresso ativo, indicadores de meta batida
- Recharts: usar hex hardcoded (#4ECDC4, #FF5C5C) — SVG fill não resolve CSS vars

## Estrutura de pastas
```
src/
├── lib/
│   ├── supabase.js             ← client Supabase singleton
│   └── utils.js                ← fmtCurrency, fmtDate, getSaudacao, isAtrasada, cn
├── contexts/
│   └── AuthContext.jsx         ← user, profile, isAdmin, loading, signIn, signOut
├── hooks/
│   ├── useDashboard.js         ← entradas, saidas, saldo, proximasTarefas, dadosGrafico
│   └── useTarefas.js           ← tarefas, criarTarefa, atualizarTarefa, deletarTarefa, concluirTarefa
├── components/
│   ├── ui/                     ← shadcn/ui gerado (não modificar)
│   ├── layout/
│   │   └── AppLayout.jsx       ← Sidebar (desktop) + MobileHeader + BottomNav
│   ├── shared/
│   │   ├── Skeleton.jsx        ← <Skeleton height width radius />
│   │   ├── PriorityBadge.jsx   ← <PriorityBadge prioridade /> + export PRIORIDADE_CFG
│   │   └── PersonBadge.jsx     ← <PersonBadge nome />
│   ├── tarefas/
│   │   ├── constants.js        ← CATEGORIAS, PRIORIDADES, FORM_INICIAL
│   │   ├── FilterPill.jsx      ← <FilterPill label active onClick />
│   │   ├── TaskCard.jsx        ← <TaskCard tarefa isAdmin userId onToggle onEdit onDelete toggling />
│   │   ├── TaskModal.jsx       ← <TaskModal open onClose onSalvar editando isAdmin userId outroProfile />
│   │   └── TaskSkeletons.jsx   ← <TaskSkeletons /> + <EmptyState onNova />
│   ├── financeiro/             ← (pendente)
│   └── orcamento/              ← (pendente)
└── pages/
    ├── Login.jsx               ← tela de login com AuthContext
    ├── Dashboard.jsx           ← métricas mês + gráfico 6 meses + próximas tarefas
    ├── Tarefas.jsx             ← CRUD tarefas com filtros
    ├── Financeiro.jsx          ← (pendente)
    ├── Orcamento.jsx           ← (pendente)
    ├── Metas.jsx               ← (pendente)
    └── Perfil.jsx              ← (pendente)
```

## Padrões obrigatórios de código

### Hooks
```js
// Dependência de filtro objeto: sempre JSON.stringify para evitar re-render infinito
useEffect(() => { ... }, [user?.id, JSON.stringify(filtros)])

// Queries paralelas com Promise.all
const [{ data: a }, { data: b }] = await Promise.all([
  supabase.from('tabela_a').select('*'),
  supabase.from('tabela_b').select('*'),
])
```

### Datas
```js
// SEMPRE appender T00:00:00 ao parsear datas do banco (evita bug de timezone UTC)
new Date(str + 'T00:00:00')
```

### Cores em SVG (Recharts)
```js
// CSS vars NÃO funcionam em SVG fill — usar hex hardcoded
fill="#4ECDC4"   // success / entradas
fill="#FF5C5C"   // danger  / saídas
```

### Input dark mode
```js
// Date inputs precisam de colorScheme para tema escuro
style={{ colorScheme: 'dark' }}
```

## Variáveis de ambiente
```
VITE_SUPABASE_URL=https://zgwsuszcajkewporgkia.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
```
Sempre acessar via `import.meta.env.VITE_*`. Nunca hardcodar. Arquivo `.env` está no `.gitignore`.

## Permissões por perfil
- `role = 'admin'` → vê e edita dados próprios + lê dados da Pessoa 2
- `role = 'membro'` → vê e edita apenas dados próprios
- RLS policies no Supabase filtram no banco — sem branching de query no frontend

## Módulos — Estado atual
| Módulo       | Hook               | Página          | Status       |
|-------------|-------------------|-----------------|--------------|
| Auth        | AuthContext        | Login.jsx       | ✅ Completo  |
| Layout      | —                  | AppLayout.jsx   | ✅ Completo  |
| Dashboard   | useDashboard.js    | Dashboard.jsx   | ✅ Completo  |
| Tarefas     | useTarefas.js      | Tarefas.jsx     | ✅ Completo  |
| Financeiro  | useLancamentos.js  | Financeiro.jsx  | ⏳ Pendente  |
| Orçamento   | useOrcamento.js    | Orcamento.jsx   | ⏳ Pendente  |
| Metas       | useMetas.js        | Metas.jsx       | ✅ Completo  |
| Perfil      | —                  | Perfil.jsx      | ⏳ Pendente  |

## Sub-Agent Routing Rules

Todo trabalho deve ser roteado para os subagents em `.claude/agents/`:
- **backend** → schema Supabase, RLS, migrations, AuthContext
- **frontend** → componentes JSX, Tailwind, design system
- **logica** → hooks customizados, cálculos financeiros, parcelas
- **revisor** → revisão read-only de design system, padrões, segurança

**Dispatch paralelo** (rodar simultaneamente):
- Tarefas sem dependência entre si
- Domínios completamente separados (ex: criar schema + criar componente visual)

**Dispatch sequencial** (um por vez):
- Tarefa B depende do output de A (ex: criar schema ANTES de criar o hook)
- Arquivos compartilhados que podem conflitar

**Background** (não bloquear conversa):

## Usuários do app

O app é privado com apenas dois usuários fixos:
- Pessoa 1 (admin): Richard — carvalhorichard.rp@gmail.com
- Pessoa 2 (membro): esposa de Richard (usuário criado manualmente no Supabase)

Regras:
- Não existe tela de cadastro público
- Não existe fluxo de convite ou registro
- Usuários são criados manualmente em Supabase Authentication → Add user
- O trigger handle_new_user() cria o profile automaticamente
- Após criar os usuários, rodar no SQL Editor:
  UPDATE profiles SET role = 'admin' WHERE email = 'carvalhorichard.rp@gmail.com';

- Análise de codebase, revisão de código, pesquisa de implementação
