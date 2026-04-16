# EaseMove Melbourne

Smart Active Mobility Decision Support for Melbourne's Inner City.

FIT5120 Industry Experience 2026 S1 | Team TP12 | Group vme50

## Product Scope

EaseMove Melbourne helps young adults aged 18-30 who walk or cycle in Melbourne's inner city compare precinct-level travel comfort before they leave. It combines City of Melbourne microclimate sensor readings, pedestrian activity counts, and user-adjustable comfort weights.

This is not a route navigation engine, crime-avoidance app, UV app, or general weather dashboard.

## Live Services

| Service | URL |
| --- | --- |
| Frontend | https://fit-5120-ease-move.vercel.app |
| Backend API | https://easemove-api.onrender.com |
| Health check | https://easemove-api.onrender.com/api/health |

## Tech Stack

| Layer | Technology | Hosting |
| --- | --- | --- |
| Frontend | React 18, Vite, Tailwind CSS v4, Shadcn UI, vanilla Leaflet | Vercel |
| Backend | Node.js, Express | Render |
| Database | PostgreSQL | Neon |
| Data | City of Melbourne Open Data APIs | Public, no API key |

Keep the `frontend/` and `backend/` directory names unchanged because deployment projects are bound to them.

## Repository Structure

```text
EaseMove/
  frontend/
    src/app/App.tsx
    src/components/LeafletMap.tsx
    src/hooks/usePrecincts.ts
    src/lib/api.ts
    src/app/components/ui/
  backend/
    config/precincts.json
    config/furniture.json
    src/app.js
    src/server.js
    src/routes/precincts.js
    src/scheduler/dataPoller.js
    src/scoring/comfortScore.js
    src/db/
```

## Local Development

Backend:

```bash
cd backend
npm install
npm run migrate
npm run dev
```

Frontend:

```bash
cd frontend
npm install
npm run dev
```

Local URLs:

| Service | URL |
| --- | --- |
| Backend | http://localhost:3000 |
| Frontend | http://localhost:5173 |

Frontend `.env.local`:

```text
VITE_API_BASE_URL=http://localhost:3000
```

Backend `.env`:

```text
DATABASE_URL=<neon connection string>
CORS_ORIGIN=https://fit-5120-ease-move.vercel.app
PORT=3000
```

## API Endpoints

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/api/health` | Render/UptimeRobot health check |
| GET | `/api/precincts/current` | Returns all 12 precinct comfort records |
| GET | `/api/precincts/compare?a=cbd&b=southbank` | Returns two selected precincts |
| GET | `/api/precincts/:id/today` | Returns recommendation and preparation advice |
| GET | `/api/furniture?precinct=cbd&type=all` | Returns street furniture GeoJSON |

Comfort weight query parameters are supported by `/current`, `/compare`, and `/:id/today`:

```text
weight_temperature=60&weight_humidity=30&weight_activity=10
```

The frontend stores weights in localStorage under `easemove_weights`, sends them to the backend, and refreshes scores without a page reload.

## Data Sources

| Dataset | API ID | Iteration | Role |
| --- | --- | --- | --- |
| Microclimate Sensor Readings | `microclimate-sensors-data` | 1 | Temperature, humidity, wind speed, PM2.5 |
| Pedestrian Counting System hourly counts | `pedestrian-counting-system-monthly-counts-per-hour` | 1 | Activity density |
| Street Furniture | `street-furniture-including-bollards-bicycle-rails-bins-drinking-fountains-horse-` | 1 | Drinking fountains and bicycle rails |
| Cool Places | `cool-places` | 2 | Cool-space layer |
| Urban Forest / canopy | varies by CoM portal dataset | 2 | Shade and green coverage |

Important caveat: as of 15 April 2026, the City of Melbourne microclimate dataset's latest records are from March 2026, so sensor-covered precincts correctly appear as stale. No-sensor precincts such as Carlton still appear on the map with `no_sensor_data: true`, environmental readings as `N/A`, and activity density where available.

## Comfort Score

Default weights:

| Factor | Default |
| --- | --- |
| Temperature | 60% |
| Humidity | 30% |
| Activity density | 10% |

Normalisation:

```text
temp_score     = clamp((40 - temperature) / 40 * 100, 0, 100)
humid_score    = clamp((100 - humidity) / 100 * 100, 0, 100)
activity_score = clamp((500 - activity_count) / 500 * 100, 0, 100)

comfort_score = round(temp_score*w_temp + humid_score*w_humidity + activity_score*w_activity)
```

Bands:

| Score | Label | Colour |
| --- | --- | --- |
| 70-100 | Comfortable | Green |
| 40-69 | Caution | Amber |
| 0-39 | High Risk | Red |

Readings older than 30 minutes set `stale_data: true`; the frontend dims the marker and displays a warning rather than hiding the precinct.

## Current Iteration 1 Status

Implemented:

- React/Vite frontend with Leaflet map and 12 precinct markers.
- Score card on marker tap with stale/no-sensor warnings.
- Time-slot recommendation and preparation advice.
- Comparison tab with better-precinct highlighting.
- Backend-linked comfort weight sliders with localStorage persistence.
- Street furniture API endpoint with static fallback.
- Pedestrian activity polling from the City of Melbourne hourly counts dataset.
- Mobile bottom-sheet detail card, collapsible legend, 800 ms debounce on weight sliders

Known limitations:

- AC 6 map overlay UI for drinking fountains and bicycle rails still needs frontend toggle rendering.
- Microclimate source data is stale upstream, so stale grey markers are expected.
- Some no-sensor precincts cannot show temperature, humidity, wind, or PM2.5 until Iteration 2 fallback/estimation work is added.
- Backend tests need to be restored after the Vue-to-React rewrite removed the old `comfortScore.test.js`.

## Branch Strategy

| Branch | Purpose |
| --- | --- |
| `main` | Stable production branch |
| `dev` | Integration branch |
| `feature/[name]` | Feature work before merging to `dev` |

Do not commit directly to `main`.

## Team

Monash University FIT5120 Industry Experience 2026 S1 | Team TP12 | Group vme50 | Urban Living & Smart Cities | SDG 11

## Licence

Open data attribution: City of Melbourne Open Data under Creative Commons Attribution.
