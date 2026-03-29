# Console Péage EDRHKAT

Front-end de la console de peage EDRHKAT. Elle permet aux operateurs authentifies de superviser les postes, suivre les transactions, gerer les societes et utilisateurs, traiter les ajustements et exporter les rapports.

## Features
- **Authentication & Roles**: Login/refresh/logout flows with role-aware access and server-scoped data.
- **App Shell**: Persistent navbar/sidebar, system-following theme with a manual toggle, logout confirmation.
- **Dashboard**: KPIs, revenue timeseries, top posts/companies, risk companies, devices. Date range selectable (1–90 days for summary; 1–180 for timeseries).
- **Transactions, Companies, Overrides, Users**: List, filter, paginate; dark/light styling; sticky toolbars where appropriate.
- **Reports**: Transactions/Overrides reports with rich filters (date range required, post/company dropdowns, mode/search/approver, limit). PDF export styled via `@react-pdf/renderer`.
- **Theming**: System preference by default; manual toggle persists user choice.

## Tech Stack
- Next.js 16 (App Router), React 19
- Redux Toolkit for auth/session
- Tailwind/shadcn UI primitives, Lucide icons
- `@react-pdf/renderer` for PDF generation

## Getting Started
Prerequisites: Node 18+ and npm.

1) Install dependencies  
```bash
npm install
```

2) Configure environment  
For production, keep the browser-facing base URL on the local proxy path and point the proxy to your backend API:
```bash
export NEXT_PUBLIC_API_BASE_URL="/backend"
export API_PROXY_TARGET="https://your-api-host"
```

`NEXT_PUBLIC_API_BASE_URL` defaults to `/backend` in [`src/config/api.ts`](/Users/gloirempanga/Projects/edrhkat_toll_client_app/src/config/api.ts), and the proxy route reads `API_PROXY_TARGET` from [`src/app/backend/[...path]/route.ts`](/Users/gloirempanga/Projects/edrhkat_toll_client_app/src/app/backend/[...path]/route.ts).

3) Run the dev server  
```bash
npm run dev
```
Open http://localhost:3000 (port may shift if busy; check console).

This project uses webpack for local development by default because Turbopack has been unstable in this environment. If you want to retry Turbopack explicitly, use:
```bash
npm run dev:turbo
```

4) Lint  
```bash
npm run lint
```

## Project Structure (high level)
- `src/app/page.tsx` — Dashboard (summary, timeseries, KPIs)
- `src/app/transactions/page.tsx` — Transactions list/filters
- `src/app/companies/page.tsx` — Companies list/detail actions
- `src/app/overrides/page.tsx` — Override records
- `src/app/users/page.tsx` — Users list/actions
- `src/app/reports/page.tsx` — Reports UI + PDF export
- `src/components/layouts/AppShell.tsx` — Navbar/sidebar shell, theme toggle, logout dialog
- `src/services/*` — API wrappers (dashboard, reports, companies, etc.)
- `src/types/*` — Shared TypeScript models
- `src/pdf/ReportDocument.tsx` — PDF document layout
- `src/components/reports/ReportPdfPreview.tsx` — Download link wiring for PDFs
- `src/config/api.ts` — API base URL and endpoints

## Data Flow
- API calls live in `src/services/`, all go through `buildApiUrl` and include auth tokens.
- Auth state/refresh is handled via Redux (`authSlice`); pages use `refreshSession` on 401s.
- Components consume typed responses from `src/types/`.

## PDF Export
- Reports use `@react-pdf/renderer` to generate a professional PDF with applied filter chips and scoped metadata. Export lives in `src/app/reports/page.tsx` with the document layout in `src/pdf/ReportDocument.tsx`.
- Requires `@react-pdf/renderer` dependency installed (`npm install @react-pdf/renderer --no-package-lock` if missing).

## Theming
- Follows system preference by default; toggle in the top bar forces light/dark and persists in localStorage. App shell, tables, and cards are styled for both modes.

## Notes
- Run the dev server as your normal user, not with `sudo`.
- If Turbopack crashes or stale chunks appear, clear `.next` and use the webpack dev server: `npm run dev`.
- Turbopack remains available as an opt-in path via `npm run dev:turbo`.
- In production, set `API_PROXY_TARGET` explicitly. If it is missing, the proxy falls back to `http://localhost:3001`.
- Ensure your API is reachable through the configured proxy path; auth endpoints are defined in `src/config/api.ts`.
