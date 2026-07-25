# Flux

ERP web application for retail and production management, built with Next.js 15 and TypeScript.

## Features

- **Dashboard** — Overview metrics and production flow visualization
- **Point of Sale** (Frente de Caixa) — POS system with product grid and cart
- **Orders** (Ordens) — Kanban board for production and service orders
- **Analytics** (Inteligência) — BI dashboard with revenue charts and sales insights
- **Inventory** (Inventário) — Stock management with low-stock and out-of-stock alerts
- **History** (Histórico) — Transaction history for products and services
- **CRM** — Customer and employee management with CRUD operations
- **Settings** (Configurações) — System configuration and preferences

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 15 (App Router) |
| Language | TypeScript 5 |
| Styling | Tailwind CSS v4 |
| UI Components | shadcn/ui |
| State | Zustand 5 |
| Auth | JWT via `jose` (Edge Runtime) |
| Forms | react-hook-form + Zod |
| HTTP Client | ky |
| Themes | next-themes |
| Notifications | sonner |

## Getting Started

### Prerequisites

- Node.js 18+
- A running backend API (see `API_URL`)

### Setup

```bash
# Install dependencies
npm install

# Copy environment template and fill in values
cp .env.example .env.local

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Environment Variables

| Variable | Description | Default |
|---|---|---|
| `API_URL` | Server-side backend API base URL | `http://localhost:3333` |
| `NEXT_PUBLIC_API_URL` | Backend API base URL used by authentication routes | `http://localhost:3333` |
| `JWT_SECRET` | Shared secret for JWT signing/verification | — |
| `JWT_COOKIE_NAME` | Name of the session cookie | `flux_token` |
| `REFRESH_COOKIE_NAME` | Name of the refresh-token cookie | `flux_refresh_token` |
| `REFRESH_COOKIE_MAX_AGE` | Refresh-cookie duration in seconds | `2592000` (30 days) |

### Scripts

```bash
npm run dev        # Start dev server
npm run build      # Build for production
npm start          # Start production server
npm run lint       # Run ESLint
npm run typecheck  # Run TypeScript type checker
```

## Project Structure

```
src/
├── app/
│   ├── api/auth/          # Login, logout, and session endpoints
│   ├── (auth)/login/      # Login page (no app layout)
│   └── (app)/             # Protected pages with AppLayout
│       ├── dashboard/
│       ├── frente-de-caixa/
│       ├── ordens/
│       ├── inteligencia/
│       ├── inventario/
│       ├── historico/
│       ├── clientes/
│       ├── funcionarios/
│       └── configuracoes/
├── components/
│   ├── layout/            # AppLayout, Sidebar, Header
│   ├── search/            # Command palette (Cmd+K)
│   ├── shared/            # DataTable, StatCard, PageHeader, StatusBadge
│   └── ui/                # shadcn/ui primitives
├── hooks/                 # useDebounce, useSidebar
├── lib/                   # API client, auth utilities, formatters
├── store/                 # Zustand stores (user, sidebar)
└── types/                 # TypeScript interfaces
```

## Authentication

1. User submits credentials to `/api/auth/login`
2. Server validates with the backend and receives access and refresh tokens
3. Both tokens are stored in `httpOnly; Secure; SameSite=Strict` cookies
4. `proxy.ts` verifies the access token on every protected route
5. Expired or invalid tokens redirect to `/login?next=<original-route>`

## Architecture

See [ARCHITECTURE.md](ARCHITECTURE.md) for detailed documentation on design decisions, patterns, and component contracts.
