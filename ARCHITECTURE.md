# Flux App Architecture

## 1. Purpose and current state

Flux App is the browser interface for the Flux retail and production system. It is built
with Next.js 16, React 19, TypeScript, and Tailwind CSS.

The application uses Flux API as the source of truth for authentication, authorization,
catalog, inventory, customers, employees, service orders, sales, cash sessions,
history, dashboard metrics, forecasts, recommendations, and AI explanations. Production
business flows do not use local fixtures or browser persistence.

The backend architecture, business invariants, persistence model, analytical formulas,
and permission matrix are defined in `../Flux-API/ARCHITECTURE.md`.

## 2. Runtime shape

The application has three relevant layers:

1. Server-side authentication routes exchange credentials and refresh tokens with Flux
   API.
2. The authenticated backend-for-frontend proxy forwards browser requests to
   `/api/v1`, refreshes an expired access token once, and keeps access and refresh
   tokens in HTTP-only cookies.
3. Client pages and Zustand stores consume the proxy and render operational state.

The browser never selects a tenant or sends a role as authorization evidence. Tenant,
user, role, register assignment, and permissions come from the authenticated backend
session.

## 3. Technology

| Layer | Technology |
| --- | --- |
| Framework | Next.js 16 App Router |
| UI | React 19 |
| Language | TypeScript 5 |
| Styling | Tailwind CSS 4 and shadcn/ui |
| Client state | Zustand |
| HTTP | ky through the local backend proxy |
| Authentication verification | jose |
| Drag and drop | dnd-kit |
| Notifications | sonner |

## 4. Authentication and API boundary

- `POST /api/auth/login` forwards credentials to Flux API and stores both returned
  tokens as HTTP-only, SameSite-strict cookies.
- `GET /api/auth/me` retrieves the current backend user.
- `POST /api/auth/logout` revokes the backend session and clears both cookies.
- `/api/backend/[...path]` is the only client-side business API boundary.
- The proxy forwards the access token, request ID, content type, query string, request
  body, and idempotency key.
- A backend `401` triggers one refresh-token rotation and one retry.
- The proxy never exposes either token to client JavaScript.

Route visibility is a usability control. Flux API remains the authorization boundary
and returns `401`, `403`, or tenant-safe `404` responses.

## 5. Role behavior

| Capability | Administrator | Employee |
| --- | --- | --- |
| Dashboard | Allowed | Hidden and denied |
| Intelligence | Allowed | Hidden and denied |
| Employee management | Allowed | Hidden and denied |
| Assigned current cash session | Allowed | Allowed |
| Cash supplies and withdrawals | Allowed | Allowed |
| Closed cash-session history | Allowed | Hidden and denied |
| Point of sale | Allowed | Allowed |
| Service orders, inventory, customers | Allowed | Allowed |
| Sales-history records and export | Allowed | Allowed |
| Sales-history KPIs | Allowed | Hidden and denied |

Employees are redirected to `/frente-de-caixa` after authentication. Administrators are
redirected to `/dashboard`.

## 6. Business-data stores

Zustand stores coordinate API state shared by multiple screens:

- `productsStore`: catalog and inventory balances.
- `clientsStore`: customer list and mutations.
- `ordersStore`: service-order columns and board records.
- `caixaStore`: assigned current cash session, movements, reconciliation, and
  administrator-only closed-session history.
- `historyStore`: persisted sales and administrator-only KPIs.
- `analyticsStore`: dashboard metrics, deterministic forecasts, recommendations, and
  persisted AI explanations.
- `categoriesStore` and `unitsStore`: persisted catalog settings.
- `userStore`: current authenticated user presentation state.

Only theme, font-size preference, and sidebar state are persisted in the browser. These
are presentation preferences and do not represent business facts.

## 7. Main workflows

### Point of sale

The point-of-sale page loads sellable products, open service orders, customers, and the
assigned cash session. Sale completion sends product quantities, service-order IDs,
customer ID, discount, change, and payment breakdown to `POST /sales`. The server
allocates the tenant sale number and atomically persists the sale, payments, inventory,
service-order billing, and cash effects.

### Cash

Open, supply, withdrawal, and close actions use employee-scoped `/cash-registers/me`
endpoints. The frontend displays the expected amounts calculated by the server.
Employees see only their current assigned session. Administrators may additionally load
closed-session history.

### Service orders

Columns and orders are loaded from the service-order API. Column reorder, order create
and update, state transition, cancellation, and column archive operations are
idempotent backend mutations. Protected final-state columns cannot be archived.

### History

Sales-history records are loaded from persisted sales. Item details and payments come
from sale snapshots. Employees may view and export records but do not request or render
KPIs. Administrators additionally load the KPI endpoint. CSV export is generated by the
backend worker and downloaded after the export job completes.

### Dashboard and intelligence

Dashboard values come from the versioned dashboard endpoint. The intelligence screen
loads persisted deterministic forecast runs, recommendation runs, and evidence-bound AI
explanations. New runs are queued through idempotent endpoints. Recommendations and AI
explanations remain pending until an administrator accepts or rejects them.

AI content is explanatory only. It does not mutate sales, prices, inventory, orders, or
cash state.

## 8. Search

The global search index is constructed at runtime from API-backed products, customers,
service orders, sales history, and accessible pages. Results are filtered through route
visibility before rendering. Product and customer results open their list page with the
corresponding query filter.

## 9. UI state and layout

- Theme uses `next-themes`.
- Font scaling and sidebar collapse use browser persistence.
- The header remains outside the scaled content container.
- The Kanban drag overlay is portaled to `document.body` because the scaled content
  transform creates a containing block.
- Shared list behavior uses `DataTable`, `FilterDropdown`, and
  `TableSearchInput`.

## 10. Verification

Required frontend checks:

```bash
npm run typecheck
npm run lint
npm run build
```

Backend authorization, transactional behavior, tenant isolation, analytical
regressions, backup/restore, and operational hardening are verified in Flux API.
