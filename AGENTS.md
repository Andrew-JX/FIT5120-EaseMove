# Repository Guidelines

## Project Structure & Module Organization
This repo is split into `frontend/` (React + Vite) and `backend/` (Express + PostgreSQL).

- `frontend/src/app/App.tsx`: main UI and tab flows
- `frontend/src/components/LeafletMap.tsx`: Leaflet map rendering and tile layer config
- `frontend/src/hooks/usePrecincts.ts`: polling and data refresh logic
- `frontend/src/lib/api.ts`: API client, weight query params, localStorage helpers
- `backend/src/routes/precincts.js`: precinct endpoints
- `backend/src/scoring/comfortScore.js`: comfort score logic
- `backend/src/db/migrations/`: SQL migrations

Keep `frontend/` and `backend/` folder names unchanged (deployment is bound to them).

## Build, Test, and Development Commands
Run commands from each subproject directory.

- `cd backend && npm install && npm run migrate`: install deps and apply DB migrations
- `cd backend && npm run dev`: start backend with nodemon on `:3000`
- `cd backend && npm start`: run backend once (no watcher)
- `cd backend && npm test`: run Jest suite (if tests are present)
- `cd frontend && npm install && npm run dev`: start Vite dev server on `:5173`
- `cd frontend && npm run build`: production build

## Coding Style & Naming Conventions
- Use 2-space indentation and semicolons in JS/TS files.
- React components: `PascalCase` (e.g., `LeafletMap.tsx`).
- Hooks/utilities: `camelCase` (e.g., `usePrecincts.ts`, `api.ts`).
- Keep API response field names consistent with backend schema (snake_case fields are expected by frontend types).
- Prefer small, focused modules over large multi-purpose files.

## Testing Guidelines
- Backend uses Jest (`npm test`), but coverage is currently limited.
- Add backend tests under `backend/src/**/__tests__/` or `*.test.js`.
- Prioritize tests for scoring, API contract shape, and stale/no-sensor edge cases.
- Frontend has no formal test runner configured yet; validate key flows manually before PR.

## Commit & Pull Request Guidelines
- Follow Conventional Commit style seen in history: `feat: ...`, `fix: ...`, `docs: ...`, `chore: ...`.
- Use short imperative summaries; include scope when useful (e.g., `feat(map): add stale marker badge`).
- Work on `feature/<name>` branches, merge into `dev`, do not commit directly to `main`.
- PRs should include: purpose, changed areas, local verification steps, and screenshots/GIFs for UI changes.

## Security & Configuration Tips
- Frontend local env: `frontend/.env.local` with `VITE_API_BASE_URL=http://localhost:3000`.
- Backend local env: `.env` with `DATABASE_URL`, `CORS_ORIGIN`, `PORT`.
- Do not commit secrets or production connection strings.
