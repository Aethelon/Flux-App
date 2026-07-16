# Flux App — Arquitetura & Estrutura do Projeto

## Visão Geral

Aplicação de gestão de varejo e produção (ERP simplificado) construída em **Next.js 16 (App Router)** com **React 19** e **Tailwind CSS v4**. Tema dark/light com crossfade, sidebar colapsável, escala de fonte configurável e busca global.

**Estado atual: front-end completo, sem backend.** Todas as telas estão implementadas e navegáveis, mas os dados são mocks em memória (`src/data/` + stores Zustand). O único ponto que fala com "servidor" é a autenticação, e ela roda em modo mockado (`MOCK_AUTH=true`). Nada é persistido entre reloads, exceto as preferências guardadas em localStorage.

---

## Princípios de Produto (prioridade máxima)

> **Antes de qualquer decisão de UI, layout ou nova feature, a regra de negócio e a coesão entre as telas vêm sempre em primeiro lugar.** Estética e "insights bonitos" nunca justificam quebrar estas duas regras.

### 1. Regra de negócio primeiro

Todo indicador, coluna, card ou tela só existe se o dado que o alimenta **existir de fato no modelo** e for **calculável com o que o sistema captura**. Nada de métricas inventadas ou que dependem de dados fora do escopo.

- Antes de adicionar uma métrica, responda: _"o Flux tem os dados para calcular isso?"_. Se não tiver, ou o dado é adicionado ao modelo (quando fizer sentido no escopo), ou a métrica não entra.
- A base do escopo é o documento de fábrica de software (previsão de demanda por regressão linear, giro de estoque, reposição, promoções de baixo giro, faturamento, margem estimada, ordens de serviço). O **não-escopo** também manda: sem integração contábil, sem NF, sem marketplaces, sem ML além de regressão linear.
- Exemplos já aplicados: **Margem/Lucro** exigem custo de compra (que o produto não guarda) → removidos até existir o campo; o Histórico mostra **Total**, não lucro. **Taxa de Ruptura** foi redefinida para "produtos que zeraram estoque" (mensurável) em vez de "venda perdida na hora" (não registrável). **Lote Econômico (LEC)** foi removido por depender de custo de pedido/frete fora do escopo.
- Toda métrica deve deixar explícito **o quê**, **o período** e, quando útil, **a fórmula** — para o usuário não ficar em dúvida sobre a origem do número.

### 2. Coesão entre as telas

As telas compartilham as mesmas entidades e devem se comportar como **um sistema único**, não peças isoladas.

- **Fonte de dados única.** Entidades compartilhadas vivem em um módulo comum (`src/data/`) ou store (`src/store/`) — o que é criado/editado numa tela reflete nas outras (ex.: `clientsStore` alimenta a tela de Clientes, o combobox de Ordens e a busca global).
- **Componentes e padrões reaproveitados.** Mesmos filtros (`FilterDropdown`, `TableSearchInput`), mesma tabela (`DataTable`), mesmos modais de CRUD (add = edit), mesmos toasts em todas as telas.
- **Vocabulário e valores consistentes.** Um número que aparece em duas telas deve ser o mesmo número; um status/label tem sempre o mesmo nome e a mesma cor semântica (ver Padrão de Badge de Status).

Aplicações concretas hoje: o **Total Faturamento** do Dashboard é derivado das compras do Histórico (produtos + serviços) e bate com os dois KPIs de lá; a Inteligência deriva faturamento, ticket médio, projeção e rankings da mesma fonte; o Dashboard, a Inteligência e a busca global só enxergam as ordens que estão visíveis no board.

---

## Stack

| Camada | Tecnologia |
|---|---|
| Framework | Next.js 16.2 (App Router, bundler webpack via `--webpack`) |
| UI | React 19.2 |
| Estilização | Tailwind CSS v4 (config CSS-first, sem `tailwind.config.ts`) |
| Linguagem | TypeScript 5 |
| Componentes UI | shadcn/ui sobre **@base-ui/react** (não Radix; só o `Slot` vem do Radix) |
| Ícones | Lucide React |
| Fonte | Urbanist (Google Fonts, via `next/font`) |
| Tema | next-themes + View Transitions API |
| Estado global | Zustand (com `persist` onde faz sentido) |
| Drag & drop | @dnd-kit (core + sortable) |
| Command palette | cmdk |
| Auth (JWT verify no edge) | jose |
| HTTP client | ky (instância pronta, ainda sem uso) |
| Formulários | react-hook-form + zod (**apenas no login**) |
| Toasts | sonner |

---

## Design Tokens

> Definidos no `src/app/globals.css`. Tailwind v4 é configurado por CSS (`@theme inline`), não há arquivo de config JS.

Convivem dois conjuntos de variáveis:

1. **Tokens do shadcn** (`--background`, `--card`, `--primary`, `--border`…) — consumidos pelos componentes de `ui/`.
2. **Tokens do Flux** (`--color-bg`, `--color-surface`, `--color-text-primary`…) — usados direto nas telas via sintaxe arbitrária do Tailwind v4: `bg-(--color-surface)`, `text-(--color-text-primary)`.

### Cores

```css
/* ── Light theme (:root) ── */
--color-bg:             #F4F5F7;   /* fundo geral do app */
--color-surface:        #FFFFFF;   /* cards, search bar, stat cards */
--color-surface-raised: #F8F9FB;   /* colunas kanban, dropdowns */
--color-border:         #E2E8F0;
--color-text-primary:   #1A1A2E;
--color-text-secondary: #64748B;
--color-text-danger:    #DC2626;
--color-accent:         #5E6AD2;
--color-success:        #10B981;
--color-warning:        #F59E0B;
--color-danger:         #EF4444;
--color-info:           #5E6AD2;   /* mesmo valor do accent */

/* ── Dark theme (.dark — tema padrão da aplicação) ── */
--color-bg:             #1E1E24;
--color-surface:        #17181A;
--color-surface-raised: #1B1C1D;
--color-border:         #343536;
--color-text-primary:   #E3E2E3;
--color-text-secondary: #908F9E;
--color-text-danger:    #F83838;
--color-warning:        #FFB867;   /* único semântico que muda entre temas */
```

> **Cuidado conhecido:** `bg-(--color-accent)` funciona, mas variantes com opacidade (`bg-(--color-accent)/15`) disparam aviso do lint do Tailwind. Nesses casos use `bg-primary/15` e `border-primary/20`, que apontam para o mesmo indigo.

### Tipografia

A interface usa **uma única fonte, Urbanist**. Os dois tokens são mantidos por compatibilidade e hoje apontam para ela:

```css
--font-ui:   Urbanist;              /* sidebar, header, títulos */
--font-data: var(--font-ui);        /* stat cards, tabelas, valores */
```

Uso nas classes: `font-(family-name:--font-ui)` / `font-(family-name:--font-data)`.

Escalas praticadas nas telas (não são tokens, são convenções): label de card `11px/600 uppercase tracking-[0.55px]`, valor de card `24px/600 tracking-[-0.48px]`, título de seção `18px/600`, corpo `14px`, meta `11–12px`.

### Radius & Layout

```css
--radius-xs: 4px;  --radius-sm: 6px;  --radius-md: 8px;  --radius-lg: 12px;

--sidebar-width:           256px;
--sidebar-collapsed-width:  64px;
--header-height:            74px;
--shadow-logo: 0px 4px 4px rgba(0, 0, 0, 0.25);
```

Padding do conteúdo: `p-10` no `ContentScaler`. Header: `h-18.5 px-10`.

---

## Estrutura de Pastas

```
Flux-App/
├── .env / .env.example                   # Variáveis de ambiente (MOCK_AUTH=true hoje)
├── components.json                       # Config do CLI do shadcn
├── src/
│   ├── middleware.ts                     # Guard JWT — Edge Runtime
│   ├── app/
│   │   ├── api/auth/
│   │   │   ├── login/route.ts            # POST — em MOCK_AUTH emite o JWT localmente
│   │   │   ├── logout/route.ts           # POST — apaga o cookie
│   │   │   └── me/route.ts               # GET — payload do JWT
│   │   ├── (auth)/login/page.tsx         # Único form com react-hook-form + zod
│   │   ├── (app)/                        # Route group autenticado
│   │   │   ├── layout.tsx                # Verifica JWT (server) + AppLayout + UserHydrator
│   │   │   ├── dashboard/page.tsx
│   │   │   ├── frente-de-caixa/page.tsx
│   │   │   ├── ordens/page.tsx
│   │   │   ├── inteligencia/page.tsx
│   │   │   ├── inventario/page.tsx
│   │   │   ├── historico/page.tsx
│   │   │   ├── clientes/page.tsx
│   │   │   ├── funcionarios/page.tsx
│   │   │   └── configuracoes/page.tsx
│   │   ├── globals.css                   # Tokens + tema + view transitions
│   │   ├── layout.tsx                    # Root: fonte Urbanist, ThemeProvider, Toaster
│   │   ├── page.tsx                      # Redirect para /dashboard
│   │   └── not-found.tsx
│   │
│   ├── data/                             # Mocks compartilhados (fonte única entre telas)
│   │   ├── products.ts                   # INITIAL_PRODUCTS — Inventário, POS, Dashboard, busca
│   │   ├── orders.ts                     # INITIAL_COLUMNS, INITIAL_ORDERS, visibleOrders()…
│   │   ├── history.ts                    # INITIAL_HISTORY, entryTotal(), revenueByType()…
│   │   └── insights.ts                   # SEASONALITIES (Dashboard + Inteligência)
│   │
│   ├── components/
│   │   ├── layout/
│   │   │   ├── AppLayout.tsx             # Sidebar + Header + <main> com scroll próprio
│   │   │   ├── ContentScaler.tsx         # Aplica a escala de fonte (transform: scale)
│   │   │   ├── UserHydrator.tsx          # Popula o userStore com o payload do JWT
│   │   │   ├── Sidebar/                  # Sidebar, SidebarNav, SidebarItem, SidebarFooter
│   │   │   └── Header/                   # Header, SearchBar, DarkModeToggle, UserMenu
│   │   │
│   │   ├── shared/                       # Componentes de domínio reaproveitados
│   │   │   ├── DataTable.tsx             # Tabela genérica: colunas, abas, filtros, paginação
│   │   │   ├── StatCard.tsx              # Card de métrica
│   │   │   ├── MiniLine.tsx              # KPI de linha (SVG + área + tooltip por CSS)
│   │   │   ├── PageHeader.tsx            # Título + subtítulo
│   │   │   ├── StatusBadge.tsx           # Badge semântico
│   │   │   ├── FilterDropdown.tsx        # Filtro select padrão das listagens
│   │   │   ├── TableSearchInput.tsx      # Busca das tabelas
│   │   │   ├── ClientCombobox.tsx        # Seleção de cliente (POS/Ordens) + cadastro inline
│   │   │   ├── ClientFormDialog.tsx      # Modal de cliente reusado fora da tela de Clientes
│   │   │   └── ClientFormFields.tsx      # Campos compartilhados entre os forms de cliente
│   │   │
│   │   ├── analytics/
│   │   │   └── RevenueForecastChart.tsx  # Gráfico de projeção da Inteligência
│   │   │
│   │   └── ui/                           # shadcn (não editar para regra de negócio)
│   │       ├── alert-dialog · avatar · badge · button · card · checkbox
│   │       ├── command · dialog · drawer · dropdown-menu · form · input
│   │       ├── input-group · label · popover · select · separator · skeleton
│   │       └── sonner · switch · table · tabs · textarea · tooltip
│   │
│   ├── store/                            # Zustand
│   │   ├── sidebarStore.ts               # collapsed (persist)
│   │   ├── fontSizeStore.ts              # pequena | padrao | grande (persist)
│   │   ├── clientsStore.ts               # CRUD de clientes (memória)
│   │   ├── categoriesStore.ts            # Categorias (persist)
│   │   ├── unitsStore.ts                 # Unidades de medida (persist)
│   │   └── userStore.ts                  # Usuário logado
│   │
│   ├── lib/
│   │   ├── utils.ts                      # cn() — clsx + tailwind-merge
│   │   ├── cn.ts                         # Re-export de utils (sem uso hoje)
│   │   ├── formatters.ts                 # formatCurrency, formatDate, formatPhone…
│   │   ├── searchIndex.ts                # Índice + busca da barra global
│   │   ├── useThemeTransition.ts         # Troca de tema com View Transition
│   │   ├── auth.server.ts                # verifyToken, getTokenFromCookies (server/edge)
│   │   └── api.ts                        # Instância ky (preparada, ainda sem uso)
│   │
│   └── types/
│       ├── index.ts · auth.ts · client.ts · employee.ts
│       └── product.ts · order.ts · history.ts · payment.ts · settings.ts · user.ts
│
├── ARCHITECTURE.md                       # este arquivo
├── next.config.ts · postcss.config.mjs · eslint.config.mjs · tsconfig.json
└── package.json
```

Não existem: pasta `hooks/`, pasta `lib/schemas/`, nem subpastas de componentes por feature (`dashboard/`, `pos/`, `kanban/`…). Cada tela é uma página única e relativamente longa, que consome `data/`, `store/` e `shared/`.

---

## Camada de Dados (mock)

Enquanto não há backend, a regra é: **dado compartilhado por mais de uma tela mora em `src/data/` ou num store** — nunca duplicado dentro das páginas.

| Módulo | Consumido por |
|---|---|
| `data/products.ts` | Inventário, Frente de Caixa, Dashboard (alerta de estoque), Inteligência, busca global |
| `data/orders.ts` | Ordens (board), Dashboard (Fluxo de Produção e contadores), Inteligência, busca global |
| `data/history.ts` | Histórico, Dashboard (Total Faturamento), Inteligência, busca global |
| `data/insights.ts` | Dashboard e Inteligência (sazonalidades) |
| `clientsStore` | Clientes, ClientCombobox (POS/Ordens), busca global |

Helpers de regra de negócio ficam junto do dado, não na tela:

- `entryTotal(entry)` — soma dos itens menos o desconto.
- `revenueByType(entries)` — faturamento por produto/serviço, com o desconto rateado proporcionalmente entre os itens.
- `visibleOrders(orders)` / `isVisibleOrder(order)` — ordens concluídas há mais de 2 dias saem do board e ficam só no Histórico.
- `CLOSED_COLUMN_IDS` — colunas que contam como ordem encerrada (`concluido`, `cancelado`).

**Data de referência dos mocks:** `new Date("2026-07-14")`, fixa em `data/orders.ts`. Nunca usar `Date.now()` nos mocks — os dados são estáticos e a janela de tempo precisa ser estável.

---

## Layout & Shell

```
┌─────────────────────────────────────────────┐
│ Sidebar (256px | 64px)  │ Header (74px)     │
│  Logo Flux              │  [🔍 busca] [🌙][👤]│
│  ── Operacional         ├───────────────────┤
│    Dashboard            │ <main> scroll     │
│    Frente de Caixa      │  ContentScaler    │
│    Ordens               │   (p-10, scale)   │
│  ── Gestão              │                   │
│    Inteligência         │                   │
│    Inventário           │                   │
│    Histórico            │                   │
│  ── Pessoas             │                   │
│    Clientes             │                   │
│    Funcionários         │                   │
│  ── Minimizar / Config  │                   │
│     Sair                │                   │
└─────────────────────────────────────────────┘
```

- **Sidebar** — `collapsed` em Zustand + localStorage; `SidebarItem` marca ativo por `usePathname()`.
- **ContentScaler** — aplica `transform: scale()` conforme o `fontSizeStore` e compensa a largura (`width: 100/scale%`). **Efeito colateral importante:** o `transform` cria um containing block, então elementos `position: fixed` dentro dele se ancoram no scaler. Por isso o `DragOverlay` do Kanban é portalizado para o `document.body`.
- **Header** — fica **fora** do ContentScaler (não escala).

---

## Busca Global (`SearchBar` + `searchIndex`)

Dropdown ancorado na própria barra (não é modal). Construído com `cmdk` sobre os primitivos de `ui/command`.

- Abre ao focar/digitar; `⌘K`/`Ctrl+K` foca a barra; `Esc` e clique fora fecham.
- Índice montado em runtime a partir das fontes reais: **Produtos**, **Clientes**, **Ordens de Serviço**, **Compras** e, por último, **Páginas** (que já estão na sidebar).
- Busca sem acento e sem caixa; casa contra rótulo e palavras-chave (categoria, código de barras, e-mail, itens da compra). Máximo de 5 resultados por grupo.
- Produtos e clientes navegam para a tela **já filtrada** via `?q=<nome>`; Ordens e Compras levam para a tela (essas duas não têm busca própria).

---

## Rotas & Páginas

| Rota | Descrição |
|---|---|
| `/login` | Autenticação — layout dividido (branding + form) |
| `/dashboard` | Total Faturamento (KPI de linha), Pedidos Ativos, Alerta de Estoque, Fluxo de Produção (board em leitura) e Insights de IA |
| `/frente-de-caixa` | POS: grid de produtos com filtro por categoria + painel do pedido (desconto, cliente, pagamento) |
| `/ordens` | Kanban com colunas editáveis e drag & drop (@dnd-kit) |
| `/inteligencia` | 4 KPIs (3 de linha + pizza de ordens), projeção, sazonalidades, rankings e Relatório de IA por período |
| `/inventario` | Produtos: KPIs de estoque, filtros de categoria/status, CRUD |
| `/historico` | Compras com abas Produtos / Serviços, 2 KPIs de faturamento (linha, 6 meses) e coluna Total |
| `/clientes` | CRUD de clientes com abas Todos / Ativos / Inativos |
| `/funcionarios` | CRUD de funcionários com abas Todos / Ativos / Inativos |
| `/configuracoes` | Abas Unidades de Medida, Categorias e Preferências (tema, escala de fonte, idioma) |

### Regras de negócio implementadas nas telas

- **Arquivamento de ordens** — concluídas há mais de 2 dias somem do board e da lista, permanecendo só no Histórico (`visibleOrders`). Dashboard, Inteligência e busca global respeitam o mesmo filtro.
- **Coluna "Concluído" é protegida** — não pode ser excluída (botão oculto + guarda no handler), porque é o gatilho do arquivamento. Renomear e recolorir continuam permitidos.
- **Total Faturamento** = produtos (Frente de Caixa) + serviços, derivado de `INITIAL_HISTORY`; o último ponto da série é exatamente esse total.
- **Venda mista** — uma compra com produto e serviço aparece nas duas abas do Histórico; o desconto é rateado por item no cálculo por tipo.
- **Serviços não têm estoque** — ficam fora das métricas de estoque do Inventário e aparecem como "Sob demanda" no POS.

---

## `DataTable` — Padrão das listagens

Usado em Clientes, Funcionários, Inventário, Histórico e na visão de lista de Ordens.

```ts
columns: Column<T>[]        // { key, label, render?, className? }
data: T[]
keyField?: keyof T
pagination?: { page, total, perPage, onChange }
tabs?: TabItem[]            // + activeTab / onTabChange
filters?: React.ReactNode   // FilterDropdown, TableSearchInput…
actions?: React.ReactNode   // Exportar, + Novo
loading?: boolean           // esqueletos
emptyMessage?: string
```

---

## Padrão de Badge de Status

`StatusBadge.tsx` sobre o `badge.tsx` do shadcn.

```
'Ativo'         → success  (--color-success)
'Inativo'       → neutral  (cinza)
'Pendente'      → warning  (--color-warning)
'Em Andamento'  → info     (--color-info)
'Concluído'     → success
'Cancelado'     → danger   (--color-danger)
'Esgotado'      → danger
'Baixo estoque' → warning
```

Status desconhecido cai em `neutral`. As colunas do Kanban seguem as mesmas cores (`--color-warning`, `--color-accent`, `--color-info`, `--color-success`, `--color-danger`).

---

## Temas — Dark/Light

- `next-themes` com `attribute="class"`, `defaultTheme="dark"`, `enableSystem={false}`.
- Light em `:root`, dark em `.dark`.
- A troca usa a **View Transitions API** via `useThemeTransition()`: o `setTheme` roda dentro de `document.startViewTransition` com `flushSync`, e o crossfade (0.35s) é definido no `globals.css`. Navegador sem suporte troca direto.

---

## Zustand Stores

```ts
sidebarStore    { collapsed, toggle, setCollapsed }                    // persist
fontSizeStore   { fontSize: 'pequena'|'padrao'|'grande', setFontSize } // persist
categoriesStore { categories, add, update, remove }                    // persist
unitsStore      { units, add, update, remove }                         // persist
clientsStore    { clients, addClient, updateClient, removeClient }     // memória
userStore       { user, setUser, logout }                              // hidratado do JWT
```

`FONT_SIZE_SCALE = { pequena: 0.9, padrao: 1, grande: 1.15 }` — consumido pelo `ContentScaler`.

---

## Autenticação & Segurança

### Variáveis de Ambiente

```env
NEXT_PUBLIC_API_URL=http://localhost:3333   # backend (ainda não existe)
JWT_SECRET=...                              # segredo compartilhado para verificar o JWT
JWT_COOKIE_NAME=flux_token
JWT_COOKIE_MAX_AGE=28800                    # 8h
MOCK_AUTH=true                              # emite o JWT localmente, sem backend
NODE_ENV=development
```

### Fluxo

```
[Browser] POST /api/auth/login (email + senha)
    ├── MOCK_AUTH=true  → assina um JWT local (role admin, nome derivado do e-mail)
    └── MOCK_AUTH=false → chama NEXT_PUBLIC_API_URL/auth/login via ky
        └── seta cookie httpOnly "flux_token" e retorna { user }

[Browser] rota protegida
    └── [middleware.ts] lê o cookie
            ├── ausente  → redirect /login?next=<rota>
            ├── inválido → apaga cookie + redirect /login?next=<rota>
            └── válido   → next()

[Browser] POST /api/auth/logout → apaga o cookie
```

- `middleware.ts` roda no **Edge Runtime** e verifica a assinatura com `jose`. Rota pública: apenas `/login` (já autenticado em `/login` → redirect para `/dashboard`).
- `(app)/layout.tsx` é um Server Component: lê o cookie, decodifica o JWT e passa o usuário para o `UserHydrator`, que popula o `userStore` — sem fetch extra no client. **Como usa `cookies()`, todas as rotas de `(app)` são dinâmicas** (por isso `useSearchParams` nas páginas não precisa de Suspense boundary).
- `lib/auth.server.ts` é server/edge only — nunca importar em Client Component.

---

## Formulários

**Não há um padrão único hoje** — e isso é intencional enquanto não existe API:

- **Login** — `react-hook-form` + `zod` via `zodResolver`, com erros inline.
- **Demais telas (Inventário, Clientes, Funcionários, Configurações)** — estado local com `useState<XForm>` + `EMPTY_FORM`, validação simples no submit e `toast.error` para o que falha.

O `ui/form.tsx` (wrapper do react-hook-form) está instalado mas ainda não é usado. Quando o backend entrar, o caminho natural é migrar os CRUDs para react-hook-form + zod com schemas em `lib/schemas/`.

---

## Toast, Modais e Loading

- **Toast** — `sonner`, `<Toaster />` no root layout. `toast.success('Cliente criado com sucesso')` / `toast.error(...)`.
- **Modais de CRUD** — `Dialog` do shadcn; criação e edição usam **o mesmo formulário**, mudando só os valores iniciais e o título. Estado de abertura é local (`useState`). Exclusão usa `AlertDialog`.
- **Loading** — o `DataTable` tem `loading` com esqueletos. Como não há API, ainda não existe estado de submit assíncrono/duplo clique nas telas; entra junto com o backend.

---

## Convenções de Código

- Componentes: PascalCase, um por arquivo. Hooks: prefixo `use`.
- Imports absolutos via `@/`.
- `cn()` (de `@/lib/utils`) obrigatório para classes condicionais.
- Sem `default export` em tipos/utilitários — apenas em componentes de página.
- Comentários em português, explicando **regra de negócio** e decisões não óbvias (ex.: por que o DragOverlay é portalizado), não o que a linha faz.
- shadcn/ui: componentes são copiados para `src/components/ui/` e podem ser editados — mas **nunca para lógica de negócio**, que vive em `shared/` ou nas telas.

---

## Verificação

```bash
npx tsc --noEmit     # typecheck
npx eslint <path>    # lint
npx next build       # build completo
```

---

## Pontos em Aberto

1. **Backend.** Nada é persistido: uma venda no POS não baixa estoque nem gera compra no Histórico, e concluir uma ordem não cria a compra correspondente. As telas leem os mocks de forma coerente entre si, mas as escritas não se propagam.
2. **`Product.status` duplicado.** O status ("Ativo"/"Baixo estoque"/"Esgotado") é gravado em `data/products.ts` **e** recalculado por `getProductStatus(stock, minStock, category)` no Inventário. Hoje os dois concordam, mas é a mesma regra escrita duas vezes. A decisão (backend devolve pronto × front sempre deriva) depende do contrato da API.
3. **Funcionários fora do padrão.** `INITIAL_EMPLOYEES` está dentro da própria página, não em `data/` — é a única entidade que ainda não segue a fonte única. Só não incomoda porque nenhuma outra tela usa funcionários.
4. **Arquivos preparados e não usados:** `lib/api.ts`, `lib/cn.ts`, `ui/form.tsx`, e os primitivos `card`, `drawer`, `tooltip`, `switch`, `popover`, `separator`.
