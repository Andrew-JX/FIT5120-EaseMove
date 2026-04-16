# Data Processing Evidence

## 1. Source Data
- Source metadata URL: `https://datashare.maps.vic.gov.au/search?md=ca6894d6-87fe-563c-a86c-c81d6bbbb64d`
- Raw input file used:
  - `frontend/public/geoscape/GEOMARK_POLYGON.shp`

## 2. Processing Summary
The statewide `GEOMARK_POLYGON` layer was clipped to City of Melbourne boundary, then filtered into thematic GeoJSON layers for map overlay.

### Steps performed
1. Clip statewide SHP to municipal boundary:
```bash
npx --yes mapshaper frontend/public/geoscape/GEOMARK_POLYGON.shp \
  -clip frontend/public/geoscape/municipal-boundary.geojson
```
2. Export shopping layer:
```bash
npx --yes mapshaper frontend/public/geoscape/GEOMARK_POLYGON.shp \
  -clip frontend/public/geoscape/municipal-boundary.geojson \
  -filter "FTYPE=='commercial facility' && NAME_LABEL!=''" \
  -o format=geojson frontend/public/geoscape/shopping-facilities.geojson
```
3. Export waterbodies layer:
```bash
npx --yes mapshaper frontend/public/geoscape/GEOMARK_POLYGON.shp \
  -clip frontend/public/geoscape/municipal-boundary.geojson \
  -filter "NAME_LABEL!='' && (NAME_LABEL.toUpperCase().indexOf('LAKE')>=0 || NAME_LABEL.toUpperCase().indexOf('LAGOON')>=0 || NAME_LABEL.toUpperCase().indexOf('POND')>=0 || NAME_LABEL.toUpperCase().indexOf('WETLAND')>=0)" \
  -o format=geojson frontend/public/geoscape/waterbodies.geojson
```
4. Export parks layer:
```bash
npx --yes mapshaper frontend/public/geoscape/GEOMARK_POLYGON.shp \
  -clip frontend/public/geoscape/municipal-boundary.geojson \
  -filter "(FTYPE=='reserve' || FTYPE=='community space') && NAME_LABEL!='' && (NAME_LABEL.toUpperCase().indexOf('PARK')>=0 || NAME_LABEL.toUpperCase().indexOf('GARDEN')>=0 || NAME_LABEL.toUpperCase().indexOf('RESERVE')>=0)" \
  -o format=geojson frontend/public/geoscape/parks.geojson
```

## 3. Output Evidence

### File outputs (current workspace)
- `frontend/public/geoscape/municipal-boundary.geojson` (~24 KB)
- `frontend/public/geoscape/shopping-facilities.geojson` (~43 KB)
- `frontend/public/geoscape/waterbodies.geojson` (~56 KB)
- `frontend/public/geoscape/parks.geojson` (~932 KB)

### Feature counts
- `municipal-boundary.geojson`: **1** feature
- `shopping-facilities.geojson`: **21** features
- `waterbodies.geojson`: **7** features
- `parks.geojson`: **187** features

## 4. Runtime Integration Evidence
These layers are loaded in:
- `frontend/src/components/LeafletMap.tsx`

Layer endpoints used at runtime:
- `/geoscape/municipal-boundary.geojson`
- `/geoscape/shopping-facilities.geojson`
- `/geoscape/waterbodies.geojson`
- `/geoscape/parks.geojson`
