# EaseMove Melbourne Project Handoff

Version: 2026-04-15  
Branch to use: `dev`  
Audience: TP12 teammates and AI coding assistants with no prior project context.

## 1. What This Project Is

EaseMove Melbourne is a smart active mobility decision-support web app for young walkers and cyclists in Melbourne's inner city. It helps users compare precinct-level travel comfort using City of Melbourne open data.

The product is:

- A precinct-level comfort comparison tool.
- A smart active travel support tool.
- A rule-based data fusion application using microclimate readings, activity counts, and user-selected comfort weights.

The product is not:

- A route navigation engine.
- A crime-avoidance tool.
- A UV app.
- A generic weather dashboard.

## 2. Startup Summary

For local development, start only the backend and frontend. The database is remote Neon PostgreSQL.

Backend:

```powershell
cd E:\monashProgram\fit5120\EaseMove\backend
npm install
npm run migrate
npm run dev
```

Frontend:

```powershell
cd E:\monashProgram\fit5120\EaseMove\frontend
npm install
npm run dev
```

Local URLs:

| Service | URL |
| --- | --- |
| Backend | http://localhost:3000 |
| Frontend | http://localhost:5173 |

Important:

- `backend/.env` must contain `DATABASE_URL`, `CORS_ORIGIN`, and `PORT=3000`.
- `frontend/.env.local` should contain `VITE_API_BASE_URL=http://localhost:3000`.
- The backend connects to Neon and reads/writes existing tables.
- The backend poller runs immediately on server startup, then hourly.

## 3. Deployment Summary

| Layer | Platform | URL |
| --- | --- | --- |
| Frontend | Vercel | https://fit-5120-ease-move.vercel.app |
| Backend | Render | https://easemove-api.onrender.com |
| Database | Neon | Neon project: `proud-cherry-01591790`, database: `neondb` |

Do not rename these directories:

- `frontend/`
- `backend/`

The Vercel and Render projects are bound to those folder names.

## 4. Current Tech Stack

Frontend:

- React 18
- Vite
- Tailwind CSS v4
- Shadcn UI components
- Vanilla Leaflet through `useRef`
- No Vue, no Pinia, no `react-leaflet`

Backend:

- Node.js
- Express
- PostgreSQL via `pg`
- Neon database
- City of Melbourne Open Data APIs

## 5. Repository Map

```text
EaseMove/
  README.md
  PROJECT_HANDOFF.md
  frontend/
    package.json
    vite.config.ts
    src/main.tsx
    src/app/App.tsx
    src/components/LeafletMap.tsx
    src/hooks/usePrecincts.ts
    src/lib/api.ts
    src/app/components/ui/
    src/styles/
  backend/
    package.json
    config/precincts.json
    config/furniture.json
    src/server.js
    src/app.js
    src/routes/precincts.js
    src/scheduler/dataPoller.js
    src/scoring/comfortScore.js
    src/db/index.js
    src/db/migrate.js
    src/db/migrations/
```

Key files:

| File | Purpose |
| --- | --- |
| `frontend/src/app/App.tsx` | Main UI: map tab, compare tab, score cards, time recommendation, comfort preferences |
| `frontend/src/components/LeafletMap.tsx` | Leaflet map lifecycle and markers |
| `frontend/src/hooks/usePrecincts.ts` | Fetches precinct data every 5 minutes |
| `frontend/src/lib/api.ts` | API client, comfort weight localStorage helpers |
| `backend/src/routes/precincts.js` | API endpoints |
| `backend/src/scheduler/dataPoller.js` | Polls City of Melbourne APIs and writes Neon data |
| `backend/src/scoring/comfortScore.js` | Comfort score formula and advice helpers |
| `backend/config/precincts.json` | 12 precinct definitions and sensor assignment |

## 6. Neon Database State

Neon has four visible tables:

| Table | Purpose | Keep? |
| --- | --- | --- |
| `sensor_readings` | Raw City of Melbourne microclimate sensor readings | Yes |
| `precinct_scores` | Aggregated latest comfort scores per precinct over time | Yes |
| `pedestrian_counts` | City of Melbourne hourly pedestrian counts | Yes |
| `playing_with_neon` | Neon starter/demo table | Not used by app |

Current data facts:

- `sensor_readings` has rows for ICTMicroclimate devices, but their `received_at` values are old.
- `precinct_scores` has cached calculated scores.
- `pedestrian_counts` has rows such as `location_id=141`, `sensor_name=474Fl_T`, `precinct_id=cbd`, `sensing_date=2026-04-14`.
- `playing_with_neon` can be ignored; it is not referenced by frontend or backend.

## 7. Data Flow

Backend startup:

1. Loads `.env`.
2. Starts Express server on `PORT`.
3. Starts `dataPoller`.
4. `dataPoller` fetches microclimate data from City of Melbourne.
5. `dataPoller` fetches hourly pedestrian counts.
6. New raw data is inserted into Neon.
7. New `precinct_scores` rows are calculated.
8. Frontend reads the latest score rows through backend API endpoints.

Frontend startup:

1. Loads React app.
2. Reads `easemove_weights` from browser localStorage.
3. Calls `/api/precincts/current` with weight query parameters.
4. Renders Leaflet markers and score cards.
5. Refreshes every 5 minutes.

## 8. API Endpoints

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/api/health` | Health check |
| GET | `/api/precincts/current` | All 12 precincts |
| GET | `/api/precincts/compare?a=cbd&b=southbank` | Two precincts |
| GET | `/api/precincts/:id/today` | Time recommendation and preparation advice |
| GET | `/api/furniture?precinct=cbd&type=all` | Street furniture GeoJSON |

Weight parameters:

```text
weight_temperature=60
weight_humidity=30
weight_activity=10
```

Example:

```text
http://localhost:3000/api/precincts/current?weight_temperature=20&weight_humidity=20&weight_activity=60
```

The backend normalises the submitted weights, recalculates response scores, and returns the recalculated result. It does not permanently update stored scores for each user preference.

## 9. Data Issue Explanation

This is the biggest handoff point.

There are two separate states that look similar in the UI:

### A. No Live Sensors

Some precincts have no assigned microclimate sensors in `backend/config/precincts.json`.

No-sensor precincts:

- Carlton
- Fitzroy
- North Melbourne
- West Melbourne
- South Yarra
- South Wharf
- Flemington
- Kensington

Expected UI:

- Marker is grey.
- Score card says `No live sensors`.
- Temperature is `N/A`.
- Humidity is `N/A`.
- Wind speed is `N/A`.
- `no_sensor_data: true`.
- `stale_data: true`.
- Comfort score defaults to 50 / Caution.

This is not a bug. It is current Iteration 1 fallback behaviour.

### B. Stale Sensor Data

Some precincts have sensors, but the City of Melbourne microclimate source data is old.

Sensor-covered precincts:

- Melbourne CBD
- East Melbourne
- Docklands
- Southbank

Expected UI:

- Marker is grey because stale.
- Temperature, humidity, wind, and PM2.5 can still appear.
- Warning says sensor data is more than 30 minutes old.
- `no_sensor_data: false`.
- `stale_data: true`.

This is also not a frontend bug. The upstream data source is stale.

If Southbank ever shows `No live sensors`, check `/api/precincts/current` directly. Southbank should normally return:

```json
{
  "id": "southbank",
  "no_sensor_data": false,
  "temperature": 20.3,
  "humidity": 64.6
}
```

If the map and the time recommendation page disagree, likely causes are:

- Frontend dev server still running old code.
- Browser cached local state.
- User clicked a no-sensor precinct first, then tested `I Want to Go` on a different precinct.
- Backend was not restarted after code changes.

Recommended quick check:

```powershell
Invoke-RestMethod "http://localhost:3000/api/precincts/current" |
  Select-Object -ExpandProperty precincts |
  Where-Object { $_.id -eq "southbank" } |
  ConvertTo-Json -Depth 4
```

## 10. Comfort Score Logic

Default weights:

| Factor | Default |
| --- | --- |
| Temperature | 60% |
| Humidity | 30% |
| Activity density | 10% |

Formula:

```text
temp_score     = clamp((40 - temperature) / 40 * 100, 0, 100)
humid_score    = clamp((100 - humidity) / 100 * 100, 0, 100)
activity_score = clamp((500 - activity_count) / 500 * 100, 0, 100)

comfort_score = round(
  temp_score * weight_temperature +
  humid_score * weight_humidity +
  activity_score * weight_activity
)
```

Bands:

| Score | Label |
| --- | --- |
| 70-100 | Comfortable |
| 40-69 | Caution |
| 0-39 | High Risk |

Frontend preference storage:

```text
localStorage key: easemove_weights
```

The UI sliders always sum to 100%.

## 11. Iteration 1 Epic Status

### Epic 1: Area Comfort Discovery

Goal: users can understand current comfort conditions across inner-city Melbourne precincts.

| AC | Requirement | Status | Notes |
| --- | --- | --- | --- |
| AC 1 | 12 precinct map markers with colour-coded comfort | Mostly done | All 12 precincts appear. Stale/no-sensor markers are grey by design. |
| AC 2 | Tap marker to show score card | Done | Card shows comfort, temp, humidity, activity, wind, updated status. |
| AC 3 | Stale data warning | Done | Stale and no-sensor states are shown separately in copy. |
| AC 4 | Mobile readable at 375px | Needs manual testing | UI exists, but must be tested in browser mobile viewport. |
| AC 5 | Colour indicators paired with text labels | Mostly done | Card and legend have text labels. Marker tooltip has text. Marker visible label could be improved. |
| AC 6 | Street furniture overlay | Partially done | Backend endpoint exists. Frontend Leaflet toggle/layer still pending. |
| AC 7 | Side-by-side comparison | Done | Compare tab allows two selected precincts. |
| AC 8 | Better area highlighted | Done | Higher score gets badge. |
| AC 9 | Red vs green text recommendation | Mostly done | Recommendation exists, but wording should be checked against exact AC phrasing. |

### Epic 2: Smarter Travel Planning

Goal: users can decide when to travel and adjust personal comfort preferences.

| AC | Requirement | Status | Notes |
| --- | --- | --- | --- |
| AC 10 | Time-slot recommendation | Basic done | Current condition recommendation exists. Historical pattern forecast is not implemented. |
| AC 11 | Recommendation basis visible | Done | Temperature, humidity, activity, wind shown. |
| AC 12 | Preparation advice | Basic done | Advice exists. Need polish encoding/copy and ensure PM2.5 trigger copy is clean. |
| AC 13 | Weight slider real-time update | Done | Sliders update backend-backed scores without page reload. |
| AC 14 | Weights persisted in localStorage | Done | Uses `easemove_weights`; no server-side user storage. |
| AC 15 | Defaults and reset | Done | Defaults 60/30/10 and reset button exist. |

## 12. Remaining Work For Next Developer

Highest priority:

1. Implement AC 6 frontend street furniture overlay.
2. Manually test 375px mobile viewport.
3. Fix mojibake/encoding text in some source comments and UI strings.
4. Restore backend comfort score unit tests.
5. Add clearer UI distinction between `No live sensors` and `Stale sensor readings`.

Street furniture overlay implementation direction:

- Add state in `App.tsx` for `showFacilities`.
- Add API helper in `frontend/src/lib/api.ts` for `/api/furniture`.
- Extend `LeafletMap.tsx` props to accept GeoJSON features.
- Render drinking fountains and bicycle rails with distinct Leaflet icons.
- Add toggle button near legend or sidebar.
- On fetch failure, show a non-blocking message and keep map usable.

Data fallback future work:

- For no-sensor precincts, consider nearest sensor fallback or historical same-time-slot estimation.
- For stale sensor data, keep last known reading visible, but label it clearly.
- Do not fake live data in Iteration 1.

## 13. Known Technical Issues

1. City of Melbourne microclimate readings are stale upstream.
2. 8 of 12 precincts have no microclimate sensors.
3. Pedestrian count assignment is currently approximate bounding-box logic.
4. `playing_with_neon` table is unused.
5. Some source comments/UI text show mojibake from encoding conversion.
6. Backend tests are missing after the Vue-to-React migration.
7. Frontend contains many generated Shadcn/Figma support files; this is expected after the React rewrite.
8. `PROJECT_CURRENT_DOC.md` may be locally deleted in one workspace. Do not commit that deletion unless the team explicitly decides to remove it.

## 14. Verification Commands

Frontend build:

```powershell
cd frontend
npm run build
```

Backend syntax checks:

```powershell
cd backend
node --check src/routes/precincts.js
node --check src/scheduler/dataPoller.js
node --check src/app.js
node --check src/server.js
```

Backend health:

```powershell
Invoke-RestMethod "http://localhost:3000/api/health"
```

Check Southbank data:

```powershell
Invoke-RestMethod "http://localhost:3000/api/precincts/current" |
  Select-Object -ExpandProperty precincts |
  Where-Object { $_.id -eq "southbank" } |
  ConvertTo-Json -Depth 4
```

Check backend weight recalculation:

```powershell
Invoke-RestMethod "http://localhost:3000/api/precincts/current?weight_temperature=20&weight_humidity=20&weight_activity=60" |
  Select-Object -ExpandProperty precincts |
  Where-Object { $_.id -eq "cbd" -or $_.id -eq "southbank" } |
  Select-Object id,comfort_score,comfort_label,activity_count,activity_level |
  ConvertTo-Json -Depth 4
```

## 15. Suggested Prompt For A Teammate's AI

Paste this into a new AI coding chat:

```text
You are helping with EaseMove Melbourne, FIT5120 TP12 vme50. Read README.md and PROJECT_HANDOFF.md first.

The project is a React 18 + Vite + Tailwind + Shadcn UI + vanilla Leaflet frontend in /frontend, and a Node.js + Express + Neon PostgreSQL backend in /backend.

Do not convert the app back to Vue. Do not rename frontend/ or backend/.

Current priority is Iteration 1 acceptance criteria. The main known gap is AC 6: frontend street furniture overlay for drinking fountains and bicycle rails. Backend /api/furniture already exists.

Important data context:
- Neon has sensor_readings, precinct_scores, pedestrian_counts, and playing_with_neon.
- playing_with_neon is unused.
- City of Melbourne microclimate readings are stale upstream, so sensor-covered precincts may be grey with Data Outdated.
- Carlton/Fitzroy/etc. have no sensors and should show No live sensors with N/A environmental values.
- Do not fake live data. Keep stale/no-sensor states transparent.

Before editing, inspect the relevant files:
- frontend/src/app/App.tsx
- frontend/src/components/LeafletMap.tsx
- frontend/src/lib/api.ts
- backend/src/routes/precincts.js
- backend/src/scheduler/dataPoller.js
- backend/config/precincts.json

Implement changes conservatively, then run frontend npm run build and backend node --check on edited backend files.
```

## 16. Git Notes

Latest pushed branch:

```text
dev
```

Latest major commit:

```text
dd2d9e0 feat: switch to React comfort dashboard
```

Recommended workflow:

```powershell
git checkout dev
git pull origin dev
git checkout -b feature/street-furniture-overlay
```

Do not commit secrets. Do not commit `.env` or `.env.local`.
