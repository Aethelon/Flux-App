# Flux App — Arquitetura & Estrutura do Projeto

## Visão Geral

Aplicação de gestão de varejo e produção (ERP simplificado) construída em **Next.js 15 (App Router)** com **Tailwind CSS v4**. Escalonável, com tema dark/light, sidebar colapsável e search global.

---

## Princípios de Produto (prioridade máxima)

> **Antes de qualquer decisão de UI, layout ou nova feature, a regra de negócio e a coesão entre as telas vêm sempre em primeiro lugar.** Estética e "insights bonitos" nunca justificam quebrar estas duas regras.

### 1. Regra de negócio primeiro

Todo indicador, coluna, card ou tela só existe se o dado que o alimenta **existir de fato no modelo** e for **calculável com o que o sistema captura**. Nada de métricas inventadas ou que dependem de dados fora do escopo.

- Antes de adicionar uma métrica, responda: _"o Flux tem os dados para calcular isso?"_. Se não tiver, ou o dado é adicionado ao modelo (quando fizer sentido no escopo), ou a métrica não entra.
- A base do escopo é o documento de fábrica de software (previsão de demanda por regressão linear, giro de estoque, reposição, promoções de baixo giro, faturamento, margem estimada, ordens de serviço). O **não-escopo** também manda: sem integração contábil, sem NF, sem marketplaces, sem ML além de regressão linear.
- Exemplos já aplicados: **Margem/Lucro** exigem custo de compra (que o produto não guarda) → removidos até existir o campo. **Taxa de Ruptura** foi redefinida para "produtos que zeraram estoque" (mensurável) em vez de "venda perdida na hora" (não registrável). **Lote Econômico (LEC)** foi removido por depender de custo de pedido/frete fora do escopo.
- Toda métrica deve deixar explícito **o quê**, **o período** e, quando útil, **a fórmula** — para o usuário não ficar em dúvida sobre a origem do número.

### 2. Coesão entre as telas

As telas compartilham as mesmas entidades e devem se comportar como **um sistema único**, não peças isoladas.

- **Fonte de dados única.** Entidades compartilhadas (clientes, produtos, ordens…) vivem em um store/serviço comum — o que é criado/editado numa tela reflete em todas as outras (ex.: `clientsStore` usado pela tela de Clientes e pelo combobox de Ordens).
- **Componentes e padrões reaproveitados.** Mesmos filtros (`FilterDropdown`, `TableSearchInput`), mesma tabela (`DataTable`), mesmos formulários/modais (add = edit), mesmos toasts e loading states em todas as telas. Nada de reimplementar o mesmo padrão de formas diferentes.
- **Vocabulário e valores consistentes.** Um número que aparece em duas telas deve ser o mesmo número; um status/label tem sempre o mesmo nome e a mesma cor semântica (ver Padrão de Badge de Status).

---

## Stack

| Camada | Tecnologia |
|---|---|
| Framework | Next.js 15 (App Router) |
| Estilização | Tailwind CSS v4 |
| Linguagem | TypeScript |
| Ícones | Lucide React |
| Fontes | DM Sans (UI/navegação), Inter (dados/tabelas) |
| Tema | next-themes |
| Estado global | Zustand |
| Auth (JWT verify no edge) | jose |
| HTTP client | ky |
| Formulários | react-hook-form + zod |
| Componentes UI | shadcn/ui (biblioteca principal de componentes) |

---

## Design Tokens — Tailwind Config

> Valores extraídos diretamente do Figma (node 155:66 — Dashboard).

### Cores (CSS Variables no `globals.css`)

```css
/* ── Dark theme (padrão) ── */

/* Backgrounds */
--color-bg:             #1E1E24;   /* fundo geral do app (sidebar + main) */
--color-surface:        #17181A;   /* cards, search bar, stat cards */
--color-surface-raised: #1B1C1D;   /* kanban cards, dropdowns, user button */
--color-border:         #343536;   /* bordas de cards, colunas kanban */

/* Texto */
--color-text-primary:   #E3E2E3;   /* títulos, labels, valores */
--color-text-secondary: #908F9E;   /* placeholders, subtítulos, meta */
--color-text-danger:    #F83838;   /* item "Sair" no sidebar */

/* Accent / Brand */
--color-accent:         #5E6AD2;   /* links, botões primários, badge ativo, % IA */
--color-accent-dot:     #5E6AD2;   /* dot indicador de produção */

/* Semânticas */
--color-success:        #10B981;   /* status Ativo, Concluído */
--color-warning:        #FFB867;   /* baixo estoque, Pendente */
--color-danger:         #EF4444;   /* Esgotado, Cancelado */
--color-info:           #5E6AD2;   /* Em Andamento — mesmo valor do accent */
--color-chart-inactive: #343536;   /* barras de sparkline inativas */
--color-chart-active:   #5E6AD2;   /* barra de sparkline do mês atual */

/* ── Light theme (valores provisórios — revisar com Figma quando disponível) ── */
/* aplicados sob a classe .light na tag <html> */
/*
--color-bg:             #F4F5F7;
--color-surface:        #FFFFFF;
--color-surface-raised: #F8F9FB;
--color-border:         #E2E8F0;
--color-text-primary:   #1A1A2E;
--color-text-secondary: #64748B;
--color-text-danger:    #DC2626;
--color-accent:         #5E6AD2;
--color-success:        #10B981;
--color-warning:        #F59E0B;
--color-danger:         #EF4444;
--color-info:           #5E6AD2;
*/
```

### Tipografia

Dois sistemas de fonte convivem na interface:

**DM Sans** — UI navegacional (sidebar, header, títulos de página)
**Inter** — dados e conteúdo (stat cards, tabelas, kanban, corpo)

```css
--font-ui:   'DM Sans', sans-serif;   /* sidebar, header, títulos de página */
--font-data: 'Inter', sans-serif;     /* stat cards, tabelas, valores numéricos */
```

#### Estilos nomeados (do Figma)

| Token | Fonte | Weight | Size | Line-height | Letter-spacing | Uso |
|---|---|---|---|---|---|---|
| `Brand` | DM Sans | 900 (Black) | 20px | 100% | 0 | Logo "Flux" |
| `Brand-Subtitle` | DM Sans | 500 (Medium) | 12px | 16px | 0 | "Varejo & Produção" |
| `SidePanel-Subtitle` | DM Sans | 500 (Medium) | 14px | 21px | 0 | Labels de grupo no sidebar |
| `SidePanel-Option` | DM Sans | 600 (SemiBold) | 14px | 21px | 2.4px | Links de navegação |
| `Search-Bar` | DM Sans | 600 (SemiBold) | 14px | 100% | 0 | Placeholder da busca |
| `Switch-Button` | DM Sans | 500 (Medium) | 12px | 18px | -0.132px | Role do usuário no header |
| `Main-Title` | DM Sans | 600 (SemiBold) | 56px | 70px | -2.24px | Título da página (h1) |
| `Main-Subtitle` | DM Sans | 500 (Medium) | 18px | 21px | 0 | Subtítulo da página |
| `Stat-Label` | Inter | 600 (SemiBold) | 11px | 16.5px | 0.55px | Label uppercase dos stat cards |
| `Stat-Value` | Inter | 600 (SemiBold) | 24px | 36px | -0.48px | Valor dos stat cards |
| `Body` | Inter | 400 (Regular) | 14px | 20px | 0 | Corpo de cards, descrições |
| `Body-Small` | Inter | 400 (Regular) | 12px | 16px | 0 | Texto secundário de cards |
| `Section-Title` | Inter | 600 (SemiBold) | 18px | 27px | 0 | Títulos de seção dentro de cards |

### Espaçamentos & Layout

```css
/* Sidebar */
--sidebar-width:          256px;
--sidebar-collapsed-width: 64px;   /* apenas ícones */
--sidebar-padding-x:       16px;   /* área de navegação */
--sidebar-logo-padding-x:  24px;
--sidebar-item-height:     41px;
--sidebar-item-px:         12px;
--sidebar-item-py:         10px;
--sidebar-item-gap:        12px;   /* ícone → label */
--sidebar-section-gap:      4px;   /* entre itens da mesma seção */

/* Header */
--header-height:           74px;   /* py-12px + search h-50px */
--header-padding-x:        40px;
--header-padding-y:        12px;

/* Main content */
--content-padding:         40px;
--content-gap:             48px;   /* gap entre seções verticais */
--cards-gap:               30px;   /* gap entre stat cards */
--grid-gap:                24px;   /* gap do grid inferior */

/* User button (header) */
--user-btn-height:         50px;
--user-btn-px:              8px;
--user-btn-py:              4px;
--user-btn-gap:            15px;
--user-avatar-size:        36px;
```

### Border Radius

```css
--radius-xs:   4px;   /* sidebar items, kanban columns */
--radius-sm:   6px;   /* kanban cards, botão "Saiba Mais" */
--radius-md:   8px;   /* stat cards, avatar */
--radius-lg:  12px;   /* search bar, user button, logo, badges */
```

### Sombras

```css
--shadow-logo: 0px 4px 4px rgba(0, 0, 0, 0.25);   /* logo no sidebar */
```

---

## Estrutura de Pastas

```
flux-app/
├── .env.example                          # Variáveis de ambiente documentadas
├── src/
│   ├── middleware.ts                     # Guard JWT — roda no Edge Runtime
│   ├── app/                              # Next.js App Router
│   │   ├── api/
│   │   │   └── auth/
│   │   │       ├── login/
│   │   │       │   └── route.ts          # POST: chama backend, seta cookie httpOnly
│   │   │       ├── logout/
│   │   │       │   └── route.ts          # POST: apaga cookie, invalida sessão
│   │   │       └── me/
│   │   │           └── route.ts          # GET: retorna payload do JWT para o client
│   │   ├── (auth)/                       # Route group — sem layout de app
│   │   │   └── login/
│   │   │       └── page.tsx
│   │   ├── (app)/                        # Route group — com AppLayout
│   │   │   ├── layout.tsx                # AppLayout (sidebar + header)
│   │   │   ├── dashboard/
│   │   │   │   └── page.tsx
│   │   │   ├── frente-de-caixa/
│   │   │   │   └── page.tsx
│   │   │   ├── ordens/
│   │   │   │   └── page.tsx
│   │   │   ├── inteligencia/
│   │   │   │   └── page.tsx
│   │   │   ├── inventario/
│   │   │   │   └── page.tsx
│   │   │   ├── historico/
│   │   │   │   └── page.tsx
│   │   │   ├── clientes/
│   │   │   │   └── page.tsx
│   │   │   ├── funcionarios/
│   │   │   │   └── page.tsx
│   │   │   └── configuracoes/
│   │   │       └── page.tsx
│   │   ├── globals.css                   # Tokens CSS + Tailwind base
│   │   ├── layout.tsx                    # Root layout (ThemeProvider, fonts)
│   │   └── not-found.tsx
│   │
│   ├── components/
│   │   ├── layout/                       # Componentes de estrutura
│   │   │   ├── AppLayout.tsx             # Wrapper: sidebar + header + main
│   │   │   ├── Sidebar/
│   │   │   │   ├── Sidebar.tsx           # Container + estado collapsed
│   │   │   │   ├── SidebarNav.tsx        # Lista de links navegáveis
│   │   │   │   ├── SidebarItem.tsx       # Item individual (ícone + label)
│   │   │   │   └── SidebarFooter.tsx     # Minimizar UI, Configurações, Sair
│   │   │   └── Header/
│   │   │       ├── Header.tsx            # Container do header
│   │   │       ├── SearchBar.tsx         # Input que abre o SearchModal
│   │   │       ├── DarkModeToggle.tsx    # Botão sun/moon
│   │   │       └── UserMenu.tsx          # Avatar + nome + role + dropdown
│   │   │
│   │   ├── search/                       # Search global
│   │   │   ├── SearchModal.tsx           # Command palette (modal)
│   │   │   └── SearchResult.tsx          # Item de resultado
│   │   │
│   │   ├── ui/                           # Instalados pelo shadcn/ui (não editar diretamente)
│   │   │   ├── button.tsx                # shadcn
│   │   │   ├── badge.tsx                 # shadcn
│   │   │   ├── card.tsx                  # shadcn
│   │   │   ├── input.tsx                 # shadcn
│   │   │   ├── label.tsx                 # shadcn
│   │   │   ├── select.tsx                # shadcn
│   │   │   ├── dialog.tsx                # shadcn — modais de CRUD
│   │   │   ├── alert-dialog.tsx          # shadcn — confirmação de exclusão
│   │   │   ├── tabs.tsx                  # shadcn
│   │   │   ├── avatar.tsx                # shadcn
│   │   │   ├── separator.tsx             # shadcn
│   │   │   ├── skeleton.tsx              # shadcn — loading placeholders
│   │   │   ├── popover.tsx               # shadcn
│   │   │   ├── command.tsx               # shadcn — base do SearchModal
│   │   │   ├── dropdown-menu.tsx         # shadcn — UserMenu dropdown
│   │   │   ├── table.tsx                 # shadcn — base do DataTable
│   │   │   ├── form.tsx                  # shadcn — wrapper de react-hook-form
│   │   │   ├── sonner.tsx                # shadcn — toast notifications
│   │   │   └── tooltip.tsx               # shadcn
│   │   │
│   │   ├── shared/                       # Componentes customizados construídos sobre shadcn
│   │   │   ├── DataTable.tsx             # Tabela genérica com paginação (usa shadcn Table)
│   │   │   ├── StatCard.tsx              # Card de métrica (número grande + label)
│   │   │   ├── PageHeader.tsx            # Título + subtítulo padrão das páginas
│   │   │   └── StatusBadge.tsx           # Badge semântico (Ativo/Inativo/Pendente…)
│   │   │
│   │   └── [feature]/                    # Componentes por domínio
│   │       ├── dashboard/
│   │       │   ├── ProductionFlow.tsx
│   │       │   └── AIInsights.tsx
│   │       ├── pos/                      # Frente de Caixa
│   │       │   ├── ProductGrid.tsx
│   │       │   ├── ProductCard.tsx
│   │       │   └── OrderPanel.tsx
│   │       ├── kanban/                   # Ordens
│   │       │   ├── KanbanBoard.tsx
│   │       │   ├── KanbanColumn.tsx
│   │       │   └── KanbanCard.tsx
│   │       ├── inventory/
│   │       │   ├── InventoryTable.tsx
│   │       │   └── StockBadge.tsx
│   │       ├── intelligence/
│   │       │   ├── RevenueChart.tsx
│   │       │   └── SeasonalityCard.tsx
│   │       ├── history/
│   │       │   └── HistoryTable.tsx
│   │       ├── clients/
│   │       │   └── ClientsTable.tsx
│   │       └── employees/
│   │           └── EmployeesTable.tsx
│   │
│   ├── hooks/
│   │   ├── useDebounce.ts
│   │   ├── useSidebar.ts                 # Estado collapsed persistido
│   │   ├── useTheme.ts                   # Wrapper do next-themes
│   │   └── useSearch.ts                  # Índice de rotas/ações para o SearchModal
│   │
│   ├── store/
│   │   ├── sidebarStore.ts               # Zustand: sidebar collapsed
│   │   └── userStore.ts                  # Zustand: usuário logado
│   │
│   ├── lib/
│   │   ├── cn.ts                         # clsx + tailwind-merge
│   │   ├── formatters.ts                 # formatCurrency, formatDate, formatPhone
│   │   ├── searchIndex.ts                # Mapa de rotas para o search global
│   │   ├── auth.server.ts                # verifyToken() — apenas server/edge
│   │   └── api.ts                        # ky instance com baseURL + token nos headers
│   │
│   └── types/
│       ├── index.ts
│       ├── auth.ts                       # AuthUser, JWTPayload, LoginResponse
│       ├── client.ts
│       ├── employee.ts
│       ├── product.ts
│       ├── order.ts
│       └── user.ts
│
├── public/
│   └── logo.svg
│
├── ARCHITECTURE.md                       # este arquivo
├── next.config.ts
├── tailwind.config.ts
├── tsconfig.json
└── package.json
```

---

## Componentes Compartilhados — Especificação

### `AppLayout.tsx`

Layout raiz de toda a área autenticada. Compõe Sidebar + Header + `<main>`.

```
┌─────────────────────────────────────────┐
│  Sidebar (256px | collapsed: 64px)      │
│  ┌───────────────────────────────────┐  │
│  │  Logo + nome app                  │  │
│  │  ─────────────                    │  │
│  │  Operacional                      │  │
│  │    Dashboard                      │  │
│  │    Frente de Caixa                │  │
│  │    Ordens                         │  │
│  │  ─────────────                    │  │
│  │  Gestão                           │  │
│  │    Inteligência                   │  │
│  │    Inventário                     │  │
│  │    Histórico                      │  │
│  │  ─────────────                    │  │
│  │  Pessoas                          │  │
│  │    Clientes                       │  │
│  │    Funcionários                   │  │
│  │  ─────────────────────────────    │  │
│  │  [Minimizar UI]                   │  │
│  │  [Configurações]                  │  │
│  │  [Sair]                           │  │
│  └───────────────────────────────────┘  │
│                                         │
│  Header (full width, 56px altura)       │
│  ┌───────────────────────────────────┐  │
│  │  [🔍 Pesquisar configurações...]  │  │
│  │                     [🌙] [Avatar] │  │
│  └───────────────────────────────────┘  │
│                                         │
│  <main> (scroll independente)           │
└─────────────────────────────────────────┘
```

### `Sidebar`

- Estado `collapsed` persistido em Zustand + localStorage
- Ao colapsar: labels somem, só ícones ficam visíveis (64px)
- Ao expandir: anima com `transition-width` (256px)
- `SidebarItem` usa `usePathname()` para marcar item ativo
- Item ativo: fundo accent com opacidade baixa + texto branco
- Grupo de seção: label uppercase tiny + separador sutil

### `Header`

- `SearchBar`: input falso que abre `SearchModal` ao clicar (ou `Cmd+K`)
- `DarkModeToggle`: ícone Sun/Moon, usa `next-themes` `setTheme`
- `UserMenu`: avatar circular (iniciais ou foto), nome + role ao lado, dropdown com opções (Perfil, Configurações, Sair)

### `SearchModal` (Command Palette)

- Abre via `Cmd+K` ou click na SearchBar
- Busca em tempo real em um índice estático de rotas + ações
- Índice inclui: nome da página, palavras-chave, ícone, rota destino
- Ex: digitar "estoque" → mostra "Inventário", "Baixo Estoque"
- Digitar "novo funcionário" → navega para /funcionarios e dispara modal de criação
- Resultados agrupados por categoria (Páginas, Ações, Configurações)

---

## Rotas & Páginas

| Rota | Título | Descrição |
|---|---|---|
| `/login` | Login | Autenticação — layout dividido (branding + form) |
| `/dashboard` | Dashboard | Visão geral: faturamento, pedidos, fluxo de produção, insights de IA |
| `/frente-de-caixa` | Frente de Caixa | POS: grid de produtos + painel de pedido lateral |
| `/ordens` | Ordens de Serviço | Board Kanban com colunas configuráveis |
| `/inteligencia` | Inteligência | BI: gráficos, projeções, sazonalidades, top vendas, análises avançadas |
| `/inventario` | Inventário | Lista de produtos com estoque, filtros de status e categoria |
| `/historico` | Histórico | Histórico de compras/serviços com abas Produtos / Serviços |
| `/clientes` | Clientes | CRUD de clientes com abas Todos / Ativos / Inativos |
| `/funcionarios` | Funcionários | CRUD de funcionários com abas Todos / Ativos / Inativos |
| `/configuracoes` | Configurações | Configurações gerais da conta/empresa |

---

## Componente `DataTable` — Padrão das listagens

Tabela compartilhada usada em Clientes, Funcionários e Histórico.

Props:
- `columns`: definição de colunas com `key`, `label`, `render?`
- `data`: array genérico
- `pagination`: `{ page, total, perPage, onChange }`
- `tabs?`: array de abas de filtro (ex: Todos / Ativos / Inativos)
- `actions?`: botões no header direito (ex: Exportar, Novo)
- `footer`: texto "Mostrando X a Y de Z"

---

## shadcn/ui — Filosofia de Uso

shadcn/ui não é uma dependência npm tradicional. Os componentes são **copiados para dentro do projeto** via CLI (`npx shadcn@latest add button`) e ficam em `src/components/ui/`. Isso significa:

- São **totalmente customizáveis** — podemos editar o código diretamente
- Seguem os tokens de cor via CSS variables (já mapeados nos tokens acima)
- O `tailwind.config.ts` e o `globals.css` precisam incluir as variáveis do shadcn no setup inicial
- Novos componentes shadcn são adicionados sob demanda, não todos de uma vez

Componentes customizados que **estendem** os do shadcn ficam em `src/components/shared/` — nunca alterar os arquivos em `src/components/ui/` para lógica de negócio.

---

## Padrão de Badge de Status

Usa o `badge.tsx` do shadcn como base, encapsulado no `StatusBadge.tsx` de `shared/`.

```tsx
// Variantes
type StatusVariant = 'success' | 'warning' | 'danger' | 'neutral' | 'info'

// Mapeamento
'Ativo'         → success  (#10B981)
'Inativo'       → neutral  (cinza)
'Pendente'      → warning  (#FFB867)
'Em Andamento'  → info     (#5E6AD2)
'Concluído'     → success  (#10B981)
'Cancelado'     → danger   (#EF4444)
'Esgotado'      → danger   (#EF4444)
'Baixo estoque' → warning  (#FFB867)
```

---

## Temas — Dark/Light

- Provedor: `next-themes` com `attribute="class"` na tag `<html>`
- Padrão: `dark`
- Todos os tokens de cor definidos como CSS variables, aplicados via classe `.dark` e `.light`
- Tailwind usa `darkMode: 'class'`
- Persistência: localStorage via next-themes

---

## Zustand Stores

### `sidebarStore`
```ts
{
  collapsed: boolean
  toggle: () => void
  setCollapsed: (v: boolean) => void
}
```

### `userStore`
```ts
{
  user: { name: string; role: string; email: string; avatar?: string } | null
  setUser: (u: User) => void
  logout: () => void
}
```

---

## Autenticação & Segurança

### Variáveis de Ambiente (`.env.example`)

```env
# URL base da API do backend
NEXT_PUBLIC_API_URL=http://localhost:3333

# Segredo compartilhado com o backend para verificação do JWT
# Deve ser idêntico ao JWT_SECRET configurado no backend
JWT_SECRET=your_super_secret_jwt_key_here

# Nome do cookie que armazena o token de sessão
JWT_COOKIE_NAME=flux_token

# Duração do cookie de sessão em segundos (padrão: 8h)
JWT_COOKIE_MAX_AGE=28800

NODE_ENV=development
```

### Fluxo Geral

```
[Browser] POST /api/auth/login (email + senha)
    └── [Route Handler] chama backend NEXT_PUBLIC_API_URL/auth/login
            └── backend retorna { accessToken }
                └── Route Handler seta cookie httpOnly "flux_token"
                └── retorna { user } para o client

[Browser] qualquer rota protegida
    └── [middleware.ts] lê cookie "flux_token"
            ├── ausente  → redirect /login?next=<rota>
            ├── inválido → apaga cookie + redirect /login?next=<rota>
            └── válido   → passa (next())

[Browser] POST /api/auth/logout
    └── [Route Handler] apaga cookie "flux_token"
        → redirect /login
```

### `middleware.ts` — Guard de Rotas

- Roda no **Edge Runtime** (sem Node.js APIs)
- Usa `jose` (compatível com edge) para verificar a assinatura do JWT com `JWT_SECRET`
- Rotas públicas: apenas `/login`
- Rotas excluídas do matcher: `_next/static`, `_next/image`, `favicon.ico`, `api/auth/*`
- Se token inválido/expirado: apaga o cookie e redireciona para `/login?next=<rota-tentada>`
- Se já autenticado e acessar `/login`: redireciona para `/dashboard`

```
matcher: ['/((?!_next/static|_next/image|favicon.ico|api/auth).*)']
```

### Route Handlers — `src/app/api/auth/`

#### `POST /api/auth/login`
1. Recebe `{ email, password }` do client
2. Faz `POST NEXT_PUBLIC_API_URL/auth/login` via `ky`
3. Se sucesso: seta cookie `flux_token` como **httpOnly, Secure, SameSite=Strict**
4. Retorna `{ user: { name, role, email, avatar? } }` — sem expor o token ao JS do browser
5. Se erro do backend: repassa o status (401, 422, etc.) com a mensagem

#### `POST /api/auth/logout`
1. Apaga o cookie `flux_token` (maxAge = 0)
2. Retorna `{ ok: true }`

#### `GET /api/auth/me`
1. Lê o cookie `flux_token`
2. Verifica com `jose` e decodifica o payload
3. Retorna os dados do usuário presentes no JWT (name, role, email, etc.)
4. Usado pelo `userStore` para hidratar o estado do usuário no client após SSR

### `lib/auth.server.ts`

Utilitário server/edge only — **nunca importar em Client Components**.

```ts
// Funções exportadas:
verifyToken(token: string): Promise<JWTPayload>  // lança erro se inválido
getTokenFromCookies(cookies: ReadonlyRequestCookies): string | undefined
```

### `lib/api.ts` — HTTP Client

Instância do `ky` configurada para chamadas do **server-side** (Server Components, Route Handlers) ao backend. O token é lido do cookie via `cookies()` do Next.js e enviado no header `Authorization: Bearer <token>`.

```ts
// Uso em Server Components:
import { api } from '@/lib/api'
const clientes = await api.get('clientes').json<Cliente[]>()
```

Para chamadas **client-side** (ex: formulários em Client Components), chamar as Route Handlers internas (`/api/...`) em vez do backend diretamente — o cookie httpOnly é enviado automaticamente pelo browser.

### `types/auth.ts`

```ts
interface JWTPayload {
  sub: string        // ID do usuário
  name: string
  email: string
  role: 'admin' | 'funcionario'
  iat: number
  exp: number
}

interface AuthUser {
  id: string
  name: string
  email: string
  role: 'admin' | 'funcionario'
  avatar?: string
}

interface LoginResponse {
  user: AuthUser
}
```

### `store/userStore.ts` — Hidratação do Usuário

No `(app)/layout.tsx` (Server Component), o payload do JWT é decodificado server-side e passado como prop para um Client Component que popula o `userStore`. Isso evita um fetch extra no client.

---

## Formulários

Padrão: **react-hook-form** + **zod** em todos os formulários da aplicação.

- `zod` define o schema de validação (tipagem + regras)
- `react-hook-form` gerencia estado do form e integra com o schema via `zodResolver`
- Erros de validação são exibidos inline abaixo de cada campo
- Erros de API (ex: e-mail já cadastrado) são setados via `form.setError('email', { message: '...' })`

```ts
// Padrão de uso
const schema = z.object({
  name: z.string().min(2, 'Nome muito curto'),
  email: z.string().email('E-mail inválido'),
})

const form = useForm<z.infer<typeof schema>>({
  resolver: zodResolver(schema),
})
```

Schemas ficam em `src/lib/schemas/` (ex: `clientSchema.ts`, `employeeSchema.ts`).

---

## Toast (Feedback de Ações)

Biblioteca: **shadcn/ui Sonner** (`sonner` + wrapper do shadcn).

- `<Toaster />` montado no root layout (`app/layout.tsx`)
- Chamado via `toast.success()`, `toast.error()`, `toast.loading()` / `toast.dismiss()`

```ts
// Padrão de uso após ação de API
toast.success('Cliente criado com sucesso')
toast.error('Erro ao salvar. Tente novamente.')
```

| Situação | Toast |
|---|---|
| Criação bem-sucedida | `success` — "X criado com sucesso" |
| Edição bem-sucedida | `success` — "X atualizado" |
| Exclusão bem-sucedida | `success` — "X removido" |
| Erro de API | `error` — mensagem retornada pelo backend |
| Erro inesperado | `error` — "Algo deu errado. Tente novamente." |

---

## Loading States & Prevenção de Clique Duplo

Botões de ação (submit de formulário, confirmar exclusão, checkout, etc.) seguem este padrão:

1. Ao clicar: botão fica **desabilitado** + exibe spinner/label alternativo
2. Aguarda a resposta da API
3. **Sucesso**: fecha modal/form, exibe toast `success`, re-habilita se necessário
4. **Erro**: re-habilita o botão, exibe toast `error` com a mensagem

```tsx
// Padrão com react-hook-form
const { handleSubmit, formState: { isSubmitting } } = form

<Button type="submit" disabled={isSubmitting}>
  {isSubmitting ? <Spinner /> : 'Salvar'}
</Button>
```

Para ações fora de formulário (ex: botão de exclusão em tabela), usar estado local `isPending`:

```tsx
const [isPending, setIsPending] = useState(false)

async function handleDelete() {
  setIsPending(true)
  try {
    await deleteClient(id)
    toast.success('Cliente removido')
  } catch {
    toast.error('Erro ao remover cliente')
  } finally {
    setIsPending(false)
  }
}
```

---

## Modais (CRUD)

Componente base: **shadcn/ui `Dialog`**.

- Modais de criação e edição usam o mesmo componente de formulário — a diferença é se `defaultValues` está preenchido ou não
- Acionados por botão na página ("+ Novo X") ou pelo ícone de edição na tabela
- Estado de abertura controlado localmente na página (`useState<boolean>`)
- Ao confirmar com sucesso: fecha o modal + exibe toast + invalida/refetch dos dados

```tsx
// Padrão de estrutura
<Dialog open={open} onOpenChange={setOpen}>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Novo Cliente</DialogTitle>
    </DialogHeader>
    <ClientForm onSuccess={() => setOpen(false)} />
  </DialogContent>
</Dialog>
```

Modal de **confirmação de exclusão** usa `AlertDialog` do shadcn/ui.

---

## Convenções de Código

- Componentes: PascalCase, um por arquivo
- Hooks: `use` prefix, camelCase
- Tipos: sufixo `Props` para props de componente, sem sufixo para entidades de domínio
- Imports: absolutos via `@/` (alias configurado no tsconfig)
- `cn()` obrigatório para classes condicionais (clsx + tailwind-merge)
- Sem `default export` em arquivos de tipo/utilitário — apenas em componentes/páginas

---

## Ordem de Implementação Sugerida

1. **Setup**: `create next-app`, instalar deps (`jose`, `ky`, `zustand`, `next-themes`, `lucide-react`, `clsx`, `tailwind-merge`, `react-hook-form`, `zod`, `sonner`), inicializar shadcn/ui, configurar Tailwind + tokens + fontes
2. **Auth**: `.env.example`, `middleware.ts`, route handlers `/api/auth/*`, `lib/auth.server.ts`, `lib/api.ts`, `types/auth.ts`
3. **Login page**: layout dividido (branding + form), integração com `/api/auth/login`
4. **Layout shell**: `AppLayout`, `Sidebar` (colapsável funcional), `Header` (sem busca ainda), hidratação do `userStore`
5. **shadcn/ui setup**: instalar componentes base (`button`, `badge`, `card`, `input`, `dialog`, `alert-dialog`, `tabs`, `avatar`, `select`, `form`, `table`, `command`, `dropdown-menu`, `skeleton`, `sonner`, `separator`, `tooltip`, `popover`) + configurar Toaster no root layout. Depois criar componentes `shared/` (`DataTable`, `StatCard`, `PageHeader`, `StatusBadge`)
6. **Search global**: `SearchModal` + `useSearch` + índice de rotas
7. **Dashboard**: estatísticas, mini-kanban, insights
8. **DataTable**: componente genérico + paginação
9. **Clientes** e **Funcionários**: usando DataTable
10. **Inventário**: tabela com badges de estoque
11. **Histórico**: abas Produtos / Serviços
12. **Ordens**: Kanban drag-and-drop (ou simples inicialmente)
13. **Frente de Caixa**: grid de produtos + painel lateral
14. **Inteligência**: gráficos + seções de análise
15. **Configurações**: formulário geral
