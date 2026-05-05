# EaseMove Melbourne

Smart active mobility decision support for Melbourne's inner city.

FIT5120 Industry Experience 2026 S1 | Team TP12 | Group vme50 |iteration2

## Product Scope

EaseMove Melbourne helps young adults aged 18-30 who walk or cycle in Melbourne's inner city compare travel comfort before they leave, explore support places, and make more informed movement choices on hotter days.

The current frontend experience is branded as `MoveComfortly`, while the repository and deployment naming still use `EaseMove`.

This is not a turn-by-turn navigation engine, a crime-avoidance app, or a general weather dashboard.

## Current User Experience

The current app includes these main flows:

- A multi-scene landing page with project introduction, walkthrough steps, and direct entry points into the interactive map and extreme weather content.
- An interactive comfort map for Melbourne inner-city precincts with comfort-area, ease-place, natural-place, and street-facility layers.
- A compare mode for checking two precincts side by side.
- Comfort preference controls that rebalance temperature, humidity, and activity weighting.
- Time-slot recommendation cards for choosing more comfortable times to head out.
- Area detail pages reached from map selections such as `/map?area=melbourne-cbd`.
- Recommendation facility pages reached from area recommendations such as `/map?area=melbourne-cbd&place=state-library-victoria`.
- An extreme weather risks section with overview, detail, and quiz pages.
- An About Us page and refreshed landing-page storytelling content.

## Main Routes

Confirmed frontend routes in the current codebase:

| Route                           | Purpose                                     |
| ------------------------------- | ------------------------------------------- |
| `/`                             | Landing page / homepage                     |
| `/map`                          | Main interactive map and compare experience |
| `/aboutus`                      | About Us page                               |
| `/extreme-weather-risks`        | Extreme weather overview                    |
| `/extreme-weather-risks-detail` | Risk detail page                            |
| `/extreme-weather-risks-quiz`   | Extreme weather quiz                        |

The map also supports query-based detail flows:

- `/map?area=<area-id>` for area detail pages
- `/map?area=<area-id>&place=<place-id>` for recommendation/public-facility detail pages

## Live Services

| Service      | URL                                          |
| ------------ | -------------------------------------------- |
| Frontend     | https://fit-5120-ease-move.vercel.app        |
| Backend API  | https://easemove-api.onrender.com            |
| Health check | https://easemove-api.onrender.com/api/health |

## Tech Stack

| Layer    | Technology                                                     | Hosting                |
| -------- | -------------------------------------------------------------- | ---------------------- |
| Frontend | React 18, Vite, Tailwind CSS v4, Leaflet, Framer Motion        | Vercel                 |
| Backend  | Node.js, Express                                               | Render                 |
| Database | PostgreSQL                                                     | Neon                   |
| Data     | City of Melbourne Open Data APIs + Open-Meteo weather fallback | Public / external APIs |

Keep the `frontend/` and `backend/` directory names unchanged because deployment projects are bound to them.

## Repository Structure

```text
EaseMove/
  frontend/
    src/app/App.tsx
    src/main.tsx
    src/components/LeafletMap.tsx
    src/components/map/DynamicLegendPanel.tsx
    src/components/landing/
      HeroSplitScene.tsx
      MissionGalleryScene.tsx
      HowToUseScene.tsx
      StartUsingScene.tsx
      FooterScene.tsx
    src/hooks/usePrecincts.ts
    src/lib/api.ts
    src/lib/areaInfo.ts
    src/pages/
      AboutUsPage.tsx
      AreaDetailPage.tsx
      RecommendationFacilitiesPage.tsx
      ExtremeWeatherRisksPage.tsx
      ExtremeWeatherRiskDetailPage.tsx
      ExtremeWeatherQuizPage.tsx
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

| Service  | URL                   |
| -------- | --------------------- |
| Backend  | http://localhost:3000 |
| Frontend | http://localhost:5173 |

Useful local pages:

- `http://localhost:5173/`
- `http://localhost:5173/map`
- `http://localhost:5173/aboutus`
- `http://localhost:5173/extreme-weather-risks`

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

| Method | Path                                       | Purpose                                       |
| ------ | ------------------------------------------ | --------------------------------------------- |
| GET    | `/api/health`                              | Health check                                  |
| GET    | `/api/precincts/current`                   | Returns all precinct comfort records          |
| GET    | `/api/precincts/compare?a=cbd&b=southbank` | Returns two selected precincts                |
| GET    | `/api/precincts/:id/today`                 | Returns recommendation and preparation advice |
| GET    | `/api/furniture?precinct=cbd&type=all`     | Returns street furniture data                 |

Comfort weight query parameters are supported by `/current`, `/compare`, and `/:id/today`:

```text
weight_temperature=60&weight_humidity=30&weight_activity=10
```

The frontend stores weights in localStorage under `easemove_weights`, sends them to the backend, and refreshes scores without a full page reload.

## Data and Scoring Notes

Confirmed in the current implementation:

- Comfort scoring uses temperature, humidity, and activity density.
- Default weights are 60% temperature, 30% humidity, and 10% activity.
- The backend fetches precinct data and can rebalance scores when user weights change.
- Non-sensor precincts now use weather fallback logic so they do not rely only on `N/A` values.
- Street furniture data is used both in the map layer and in the recommendation-facilities detail flow.

Default weights:

| Factor           | Default |
| ---------------- | ------- |
| Temperature      | 60%     |
| Humidity         | 30%     |
| Activity density | 10%     |

Bands:

| Score  | Label       | Colour |
| ------ | ----------- | ------ |
| 70-100 | Comfortable | Green  |
| 40-69  | Caution     | Amber  |
| 0-39   | High Risk   | Red    |

## Current Status

This README now reflects the parts of the current product that are clearly present in the codebase:

- Landing page experience has expanded well beyond the original single map entry page.
- The map supports multiple layer types and a dynamic legend that changes with active layers.
- Compare mode and time-slot recommendation flows are implemented.
- Area detail and nearby public-facility flows are implemented through map query parameters.
- Extreme weather overview, detail, and quiz pages are implemented.
- Visual branding in the frontend currently uses `MoveComfortly` text in key user-facing pages.

Items intentionally not expanded here:

- Deployment and hosting details that have not been re-verified in this update.
- Any feature claims that are not obvious from the current repository state.

## Branch Strategy

| Branch           | Purpose                              |
| ---------------- | ------------------------------------ |
| `main`           | Stable production branch             |
| `dev`            | Integration branch                   |
| `feature/[name]` | Feature work before merging to `dev` |

Do not commit directly to `main`.

## Team

Monash University FIT5120 Industry Experience 2026 S1 | Team TP12 | Group vme50 | Urban Living & Smart Cities | SDG 11

## Licence

Open data attribution: City of Melbourne Open Data under Creative Commons Attribution.
