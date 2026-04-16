# PROJECT_HANDOFF

## 1. Scope of This Update
This round focused on map expansion and runtime stability:
- Added city boundary and thematic polygon layers (shopping, waterbodies, parks)
- Added and optimized street-furniture points (bicycle racks, drinking fountains, bins, seats)
- Fixed local CORS issues and layer overlap/visibility issues
- Extended backend `/api/furniture` with pagination, limit handling, and robust coordinate parsing

---

## 2. File-Level Changes (Detailed)

### `backend/src/app.js`
- Replaced fixed CORS whitelist behavior with dynamic origin validation.
- Kept explicit origins:
  - `process.env.CORS_ORIGIN`
  - `http://localhost:4173`
  - `http://localhost:3000`
- Added localhost wildcard support via regex:
  - `http://localhost:<any-port>`
- This resolves frontend calls from `http://localhost:5174` and other dev ports.

### `backend/src/routes/precincts.js`
- Updated `/api/furniture`:
  - Added `limit` query parameter (default `200`, capped at `1000`)
  - Added paginated upstream fetching using `limit + offset` (page size 100)
  - Prevents first-page bias (previously only some types appeared)
- Added coordinate compatibility parser for multiple schemas:
  - `coordinatelocation`
  - `geo_point_2d`
  - `location.coordinates`
- Standardized output to GeoJSON `FeatureCollection`.

### `frontend/src/lib/api.ts`
- Added type definitions:
  - `FurnitureFeature`
  - `FurnitureFeatureCollection`
- Added API method:
  - `fetchFurniture(precinct, type, limit)`
- Frontend now fetches furniture data from backend endpoint `/api/furniture`.

### `frontend/src/components/LeafletMap.tsx`
- Basemap changed to `Carto light_all` (global and visually consistent).
- Added municipal boundary layer:
  - `/geoscape/municipal-boundary.geojson`
  - Rendered as black outline.
- Added thematic polygon layers:
  - `/geoscape/shopping-facilities.geojson` (orange style)
  - `/geoscape/waterbodies.geojson` (cyan/blue style)
  - `/geoscape/parks.geojson` (green style)
- Added furniture point layer:
  - Primary request: `fetchFurniture('all', 'all', 1000)`
  - Fallback request when empty: `fetchFurniture('all', 'all', 200)`
  - Allowed categories only: `bicycle`, `drinking`, `bin`, `seat`
  - Tooltip includes type label and location description.
- Added render safety checks:
  - `hasValidCoords()` to skip invalid coordinates.
- Added pane layering to fix hidden markers:
  - `areaPane` for boundary/thematic polygons
  - `furniturePane` for furniture points
  - `precinctPane` for original comfort markers

### `frontend/src/app/App.tsx`
- Replaced component-based logo usage with image-based branding:
  - Removed text title/subtitle in the top navigation area
  - Uses `logo-transparent.png` directly for both nav contexts
- Increased logo visual prominence in top-left corner.
- Reduced navbar vertical padding (`py-4` -> `py-2`) and switched to absolute-positioned logo layout so larger branding does not expand navbar height.

---

## 3. Added/Generated Data Files
Under `frontend/public/geoscape/`:
- `municipal-boundary.geojson` (existing; used for city outline)
- `shopping-facilities.geojson` (generated from SHP clip + filter, 21 features)
- `waterbodies.geojson` (generated from SHP clip + filter, 7 features)
- `parks.geojson` (generated from SHP clip + filter, 187 features)

Note: `GEOMARK_POLYGON.shp` is a statewide source layer used only for extraction.  
Frontend rendering uses the generated GeoJSON files above.

Shapefile sidecar files currently present (used during conversion workflow):
- `GEOMARK_POLYGON.cpg`
- `GEOMARK_POLYGON.dbf`
- `GEOMARK_POLYGON.prj`
- `GEOMARK_POLYGON.shp`
- `GEOMARK_POLYGON.shx`

Under `frontend/src/assets/`:
- `logo-transparent.png` (generated from `logo.png` by removing connected white background areas for cleaner placement on navbar)

Under `docs/`:
- `docs/data-processing-evidence.md` (command-level evidence for SHP -> GeoJSON processing, output counts, and runtime integration paths)

---

## 4. Known Issues and Troubleshooting
1. If frontend shows `ERR_CONNECTION_REFUSED` to `localhost:3000`:
- Backend is not running or crashed.
- Start backend with:
```bash
cd backend
npm run dev
```

2. If furniture points disappear:
- Check backend logs for:
  - `[GET /furniture] Fallback to static`
- Check browser console for:
  - `[LeafletMap] failed to load street furniture points`

3. If logs show `ENOTFOUND data.melbourne.vic.gov.au` or Neon host `ENOTFOUND`:
- This is DNS/network environment failure, not frontend rendering logic.

---

## 5. Local Run Steps
1. Backend
```bash
cd backend
npm install
npm run migrate
npm run dev
```

2. Frontend
```bash
cd frontend
npm install
npm run dev
```

3. Frontend env
`frontend/.env.local`
```env
VITE_API_BASE_URL=http://localhost:3000
```

---

## 6. API and Dataset URL Inventory

### A. Frontend Calls to Backend (`frontend/src/lib/api.ts`)
- `GET {BASE}/api/precincts/current`
- `GET {BASE}/api/precincts/compare?a=<id>&b=<id>`
- `GET {BASE}/api/precincts/:id/today`
- `GET {BASE}/api/furniture?precinct=all&type=all&limit=1000`  
  Fallback: `limit=200` when primary returns empty.

Local `BASE`: `http://localhost:3000` (from `VITE_API_BASE_URL`).

### B. Backend Public API (`backend/src/routes/precincts.js`)
- `GET /api/health`
- `GET /api/precincts/current`
- `GET /api/precincts/compare`
- `GET /api/precincts/:id/today`
- `GET /api/furniture`

### C. External Open Data APIs Used by Backend (City of Melbourne)
1. Street furniture:
- `https://data.melbourne.vic.gov.au/api/explore/v2.1/catalog/datasets/street-furniture-including-bollards-bicycle-rails-bins-drinking-fountains-horse-/records`

2. Microclimate sensors (scheduler):
- `https://data.melbourne.vic.gov.au/api/explore/v2.1/catalog/datasets/microclimate-sensors-data/records`

3. Pedestrian counts (scheduler):
- `https://data.melbourne.vic.gov.au/api/explore/v2.1/catalog/datasets/pedestrian-counting-system-monthly-counts-per-hour/records`

### D. Boundary and Thematic Layer Source
Source metadata used:
- `https://datashare.maps.vic.gov.au/search?md=ca6894d6-87fe-563c-a86c-c81d6bbbb64d`

GeoJSON layers currently loaded by frontend:
- `/geoscape/municipal-boundary.geojson`
- `/geoscape/shopping-facilities.geojson`
- `/geoscape/waterbodies.geojson`
- `/geoscape/parks.geojson`
