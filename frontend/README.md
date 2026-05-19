# iteration3

# EaseMove Frontend

React 18 + Vite frontend for EaseMove Melbourne / MoveComfortly.

## Run Locally

```bash
npm install
npm run dev
```

Create `frontend/.env.local`:

```text
VITE_API_BASE_URL=http://localhost:3000
VITE_MAPBOX_PUBLIC_TOKEN=<optional but needed for full 3D route directions>
```

## Main Frontend Routes

| Route                           | Purpose                                |
| ------------------------------- | -------------------------------------- |
| `/`                             | Landing page                           |
| `/map`                          | Main comfort map                       |
| `/map/compare`                  | Precinct comparison                    |
| `/map/3d-route`                 | 3D route planner                       |
| `/map/3d-experiment`            | Legacy alias to the same 3D route page |
| `/aboutus`                      | About page                             |
| `/extreme-weather-risks`        | Extreme weather overview               |
| `/extreme-weather-risks-detail` | Risk detail page                       |
| `/extreme-weather-risks-quiz`   | Risk quiz page                         |

## Key Files

| File                                | Purpose                                                                   |
| ----------------------------------- | ------------------------------------------------------------------------- |
| `src/main.tsx`                      | Router and route registration                                             |
| `src/app/App.tsx`                   | Main map experience, detail panels, compare mode, and comfort preferences |
| `src/components/LeafletMap.tsx`     | 2D precinct map and overlay layers                                        |
| `src/components/WhiteModelMap.tsx`  | Mapbox Standard 3D route rendering, bounds control, and map interactions  |
| `src/pages/Map3DExperimentPage.tsx` | 3D route planner page                                                     |
| `src/components/landing/`           | Landing page scenes                                                       |
| `src/hooks/usePrecincts.ts`         | Backend polling and precinct state loading                                |
| `src/lib/api.ts`                    | Backend API client and comfort weight localStorage helpers                |
| `src/lib/navigation.ts`             | Shared route constants                                                    |

## Notes

- Comfort weights are saved in localStorage with the key `easemove_weights`.
- The frontend sends comfort weights to the backend using query parameters so returned scores use the selected weighting.
- The 3D route page needs a valid `VITE_MAPBOX_PUBLIC_TOKEN` for full directions behavior and Mapbox Standard basemap rendering.
- The 3D route page accepts route points only inside Australia; out-of-country points are rejected before route requests are sent.
- No user account, GPS tracking storage, or personal data collection flow is implemented in this frontend.
