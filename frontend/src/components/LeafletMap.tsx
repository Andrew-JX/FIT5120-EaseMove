import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { fetchFurniture, type FurnitureFeature, type Precinct } from '../lib/api';

// ─── Cool Places mock data ────────────────────────────────────────────────────

export interface EasePlacesFeature {
  id: string;
  name: string;
  category: 'Arts, Culture & Enrichment' | 'Recreation / Leisure & Open Spaces' | 'Shopping';
  type: string;
  airConditioned: boolean;
  freeEntry: boolean;
  address: string;
  operatingHours: string;
  lat: number;
  lng: number;
}

export const EASE_PLACES_DATA: EasePlacesFeature[] = [
  {
    id: 'cp-1', name: 'ACMI', category: 'Arts, Culture & Enrichment', type: 'Cinema',
    airConditioned: true, freeEntry: false,
    address: 'Federation Square, Melbourne VIC 3000',
    operatingHours: 'Mon–Sun  10:00 am – 5:00 pm',
    lat: -37.8180, lng: 144.9690,
  },
  {
    id: 'cp-2', name: 'Melbourne Museum', category: 'Arts, Culture & Enrichment', type: 'Museum',
    airConditioned: true, freeEntry: false,
    address: '11 Nicholson St, Carlton VIC 3053',
    operatingHours: 'Mon–Sun  10:00 am – 5:00 pm',
    lat: -37.8030, lng: 144.9716,
  },
  {
    id: 'cp-3', name: 'State Library Victoria', category: 'Arts, Culture & Enrichment', type: 'Library',
    airConditioned: true, freeEntry: true,
    address: '328 Swanston St, Melbourne VIC 3000',
    operatingHours: 'Mon–Thu  10:00 am – 9:00 pm · Fri–Sun  10:00 am – 6:00 pm',
    lat: -37.8100, lng: 144.9647,
  },
  {
    id: 'cp-4', name: 'Birrarung Marr', category: 'Recreation / Leisure & Open Spaces', type: 'Park',
    airConditioned: false, freeEntry: true,
    address: 'Batman Ave, Melbourne VIC 3000',
    operatingHours: 'Open 24 hours',
    lat: -37.8195, lng: 144.9738,
  },
  {
    id: 'cp-5', name: 'Royal Botanic Gardens', category: 'Recreation / Leisure & Open Spaces', type: 'Botanical Garden',
    airConditioned: false, freeEntry: true,
    address: 'Birdwood Ave, South Yarra VIC 3141',
    operatingHours: 'Mon–Sun  7:30 am – Sunset',
    lat: -37.8304, lng: 144.9796,
  },
  {
    id: 'cp-6', name: 'Melbourne Central', category: 'Shopping', type: 'Shopping Centre',
    airConditioned: true, freeEntry: true,
    address: '211 La Trobe St, Melbourne VIC 3000',
    operatingHours: 'Mon–Thu  10:00 am – 7:00 pm · Fri  10:00 am – 9:00 pm · Sat–Sun  10:00 am – 6:00 pm',
    lat: -37.8102, lng: 144.9629,
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function cpMarkerColor(category: string): { core: string; halo: string } {
  if (category.includes('Arts')) return { core: '#5b5b9b', halo: 'rgba(91,91,155,0.3)' };
  if (category.includes('Recreation')) return { core: '#00a859', halo: 'rgba(0,168,89,0.3)' };
  return { core: '#e197b9', halo: 'rgba(225,151,185,0.3)' };
}

function comfortColor(label: string, stale: boolean): string {
  if (stale) return '#9ca3af';
  if (label === 'Comfortable') return '#22c55e';
  if (label === 'Caution') return '#eab308';
  return '#ef4444';
}

function riskLevel(label: string): 'low' | 'caution' | 'high' {
  if (label === 'Comfortable') return 'low';
  if (label === 'Caution') return 'caution';
  return 'high';
}

function furnitureStyle(assetType: string): { label: string; color: string; radius: number } {
  const type = assetType.toLowerCase();
  if (type.includes('bicycle')) return { label: 'Bicycle Rack', color: '#2563eb', radius: 4 };
  if (type.includes('drinking')) return { label: 'Drinking Fountain', color: '#06b6d4', radius: 4 };
  if (type.includes('bin')) return { label: 'Bin', color: '#f97316', radius: 4 };
  if (type.includes('barbecue')) return { label: 'Barbecue', color: '#ef4444', radius: 4 };
  if (type.includes('seat')) return { label: 'Seat', color: '#a855f7', radius: 4 };
  if (type.includes('bollard')) return { label: 'Bollard', color: '#7c3aed', radius: 4 };
  if (type.includes('horse')) return { label: 'Horse Trough', color: '#a16207', radius: 4 };
  if (type.includes('planter')) return { label: 'Planter Box', color: '#84cc16', radius: 4 };
  return { label: assetType || 'Street Furniture', color: '#0f172a', radius: 4 };
}

function keepFurnitureType(assetType: string): boolean {
  const type = assetType.toLowerCase();
  return (
    type.includes('bicycle') ||
    type.includes('drinking') ||
    type.includes('seat') ||
    type.includes('bin')
  );
}

function hasValidCoords(lat: number | null | undefined, lng: number | null | undefined): boolean {
  return Number.isFinite(lat) && Number.isFinite(lng);
}

// ─── Component ────────────────────────────────────────────────────────────────

interface LeafletMapProps {
  precincts: Precinct[];
  selectedCategory: string | null;
  activeMode: 'view' | 'compare';
  compareSelection1: string | null;
  compareSelection2: string | null;
  onPrecinctClick: (id: string) => void;
  activeLayer?: 'ease-places' | 'comfort-area';
  onMapReady?: (map: L.Map) => void;
  onEasePlacesClick?: (feature: EasePlacesFeature, point: { x: number; y: number }) => void;
}

export default function LeafletMap({
  precincts,
  selectedCategory,
  activeMode,
  compareSelection1,
  compareSelection2,
  onPrecinctClick,
  activeLayer = 'ease-places',
  onMapReady,
  onEasePlacesClick,
}: LeafletMapProps) {
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<L.Marker[]>([]);
  const poiRef = useRef<L.Layer[]>([]);
  const boundaryRef = useRef<L.GeoJSON | null>(null);
  const shoppingLayerRef = useRef<L.GeoJSON | null>(null);
  const waterLayerRef = useRef<L.GeoJSON | null>(null);
  const parksLayerRef = useRef<L.GeoJSON | null>(null);
  const coolPlacesMarkersRef = useRef<L.Marker[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);

  // Stable refs for callbacks used inside the init effect
  const onMapReadyRef = useRef(onMapReady);
  const onEasePlacesClickRef = useRef(onEasePlacesClick);
  useEffect(() => { onMapReadyRef.current = onMapReady; }, [onMapReady]);
  useEffect(() => { onEasePlacesClickRef.current = onEasePlacesClick; }, [onEasePlacesClick]);

  // ─── Map initialisation (runs once) ────────────────────────────────────────
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    mapRef.current = L.map(containerRef.current, {
      center: [-37.815, 144.96],
      zoom: 14,
      zoomControl: false, // replaced by custom sidebar controls
    });

    if (onMapReadyRef.current) onMapReadyRef.current(mapRef.current);

    mapRef.current.createPane('areaPane');
    mapRef.current.getPane('areaPane')!.style.zIndex = '350';
    mapRef.current.createPane('furniturePane');
    mapRef.current.getPane('furniturePane')!.style.zIndex = '625';
    mapRef.current.createPane('coolPlacesPane');
    mapRef.current.getPane('coolPlacesPane')!.style.zIndex = '640';
    mapRef.current.createPane('precinctPane');
    mapRef.current.getPane('precinctPane')!.style.zIndex = '650';

    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
      subdomains: 'abcd',
    }).addTo(mapRef.current);

    fetch('/geoscape/municipal-boundary.geojson')
      .then(res => (res.ok ? res.json() : null))
      .then(data => {
        if (!data || !mapRef.current) return;
        boundaryRef.current?.remove();
        boundaryRef.current = L.geoJSON(data, {
          style: { color: '#111111', weight: 2, fill: false, opacity: 1 },
          pane: 'areaPane',
          interactive: false,
        }).addTo(mapRef.current);
      })
      .catch((err: unknown) => { console.error('[LeafletMap] failed to load municipal boundary', err); });

    fetch('/geoscape/shopping-facilities.geojson')
      .then(res => (res.ok ? res.json() : null))
      .then(data => {
        if (!data || !mapRef.current) return;
        shoppingLayerRef.current?.remove();
        shoppingLayerRef.current = L.geoJSON(data, {
          style: { color: '#c2410c', weight: 1.2, fillColor: '#fb923c', fillOpacity: 0.12, opacity: 0.9 },
          pane: 'areaPane',
          interactive: true,
          onEachFeature(feature, layer) {
            const name = String(feature?.properties?.NAME_LABEL || feature?.properties?.NAME || '').trim();
            if (name) layer.bindTooltip(`<strong>Shopping</strong><br/>${name}`, { direction: 'top' });
          },
        }).addTo(mapRef.current);
      })
      .catch((err: unknown) => { console.error('[LeafletMap] failed to load shopping layer', err); });

    fetch('/geoscape/waterbodies.geojson')
      .then(res => (res.ok ? res.json() : null))
      .then(data => {
        if (!data || !mapRef.current) return;
        waterLayerRef.current?.remove();
        waterLayerRef.current = L.geoJSON(data, {
          style: { color: '#0e7490', weight: 1.2, fillColor: '#22d3ee', fillOpacity: 0.18, opacity: 0.9 },
          pane: 'areaPane',
          interactive: true,
          onEachFeature(feature, layer) {
            const name = String(feature?.properties?.NAME_LABEL || feature?.properties?.NAME || '').trim();
            if (name) layer.bindTooltip(`<strong>Waterbody</strong><br/>${name}`, { direction: 'top' });
          },
        }).addTo(mapRef.current);
      })
      .catch((err: unknown) => { console.error('[LeafletMap] failed to load waterbody layer', err); });

    fetch('/geoscape/parks.geojson')
      .then(res => (res.ok ? res.json() : null))
      .then(data => {
        if (!data || !mapRef.current) return;
        parksLayerRef.current?.remove();
        parksLayerRef.current = L.geoJSON(data, {
          style: { color: '#166534', weight: 1, fillColor: '#4ade80', fillOpacity: 0.08, opacity: 0.85 },
          pane: 'areaPane',
          interactive: true,
          onEachFeature(feature, layer) {
            const name = String(feature?.properties?.NAME_LABEL || feature?.properties?.NAME || '').trim();
            if (name) layer.bindTooltip(`<strong>Park</strong><br/>${name}`, { direction: 'top' });
          },
        }).addTo(mapRef.current);
      })
      .catch((err: unknown) => { console.error('[LeafletMap] failed to load parks layer', err); });

    // Street furniture POI
    const drawFurniture = (data: { features: FurnitureFeature[] }) => {
      if (!mapRef.current) return;
      data.features.forEach((feature: FurnitureFeature) => {
        if (!keepFurnitureType(feature.properties.asset_type || '')) return;
        const style = furnitureStyle(feature.properties.asset_type || '');
        const [lng, lat] = feature.geometry.coordinates;
        if (!hasValidCoords(lat, lng)) return;
        const marker = L.circleMarker([lat, lng], {
          pane: 'furniturePane',
          radius: style.radius,
          color: '#111827',
          weight: 1,
          fillColor: style.color,
          fillOpacity: 0.9,
        })
          .addTo(mapRef.current!)
          .bindTooltip(
            `<span class="furniture-tip-label">${style.label}</span>` +
            `<span class="furniture-tip-location">${feature.properties.location_desc || ''}</span>`,
            { direction: 'top', offset: [0, -6], className: 'furniture-tip' }
          );
        poiRef.current.push(marker);
      });
    };

    fetchFurniture('all', 'all', 1000)
      .then(data => {
        if (!data.features?.length) {
          return fetchFurniture('all', 'all', 200).then(drawFurniture);
        }
        drawFurniture(data);
      })
      .catch((err: unknown) => { console.error('[LeafletMap] failed to load street furniture points', err); });

    // Cool Places markers (static mock data — visibility toggled by activeLayer effect)
    EASE_PLACES_DATA.forEach(feature => {
      const { core, halo } = cpMarkerColor(feature.category);
      const icon = L.divIcon({
        className: '',
        html: `<div style="width:14px;height:14px;border-radius:50%;background:${core};box-shadow:0 0 0 6px ${halo};cursor:pointer;"></div>`,
        iconSize: [14, 14],
        iconAnchor: [7, 7],
      });
      const marker = L.marker([feature.lat, feature.lng], { icon, pane: 'coolPlacesPane' })
        .bindTooltip(feature.name, { direction: 'top', offset: [0, -8], className: 'cp-marker-tip' })
        .on('click', (e: L.LeafletMouseEvent) => {
          if (onEasePlacesClickRef.current)
            onEasePlacesClickRef.current(feature, { x: e.containerPoint.x, y: e.containerPoint.y });
        });
      coolPlacesMarkersRef.current.push(marker);
    });

    return () => {
      shoppingLayerRef.current?.remove(); shoppingLayerRef.current = null;
      waterLayerRef.current?.remove();   waterLayerRef.current = null;
      parksLayerRef.current?.remove();   parksLayerRef.current = null;
      boundaryRef.current?.remove();     boundaryRef.current = null;
      poiRef.current.forEach((l: L.Layer) => l.remove()); poiRef.current = [];
      coolPlacesMarkersRef.current.forEach((m: L.Marker) => m.remove()); coolPlacesMarkersRef.current = [];
      mapRef.current?.remove(); mapRef.current = null;
    };
  }, []);

  // ─── Show / hide Cool Places markers based on activeLayer ──────────────────
  useEffect(() => {
    if (!mapRef.current) return;
    coolPlacesMarkersRef.current.forEach((m: L.Marker) => {
      if (activeLayer === 'ease-places') {
        if (!mapRef.current!.hasLayer(m)) m.addTo(mapRef.current!);
      } else {
        if (mapRef.current!.hasLayer(m)) m.remove();
      }
    });
  }, [activeLayer]);

  // ─── Precinct markers (only rendered when precincts array is non-empty) ─────
  useEffect(() => {
    if (!mapRef.current) return;

    markersRef.current.forEach((marker: L.Marker) => marker.remove());
    markersRef.current = [];

    const filtered = precincts.filter(precinct => {
      if (!selectedCategory) return true;
      return riskLevel(precinct.comfort_label) === selectedCategory;
    });

    const validPrecincts = filtered.filter(p => hasValidCoords(p.lat, p.lng));
    if (filtered.length > 0 && validPrecincts.length === 0) {
      console.warn('[LeafletMap] no precinct markers rendered: all precinct coordinates invalid');
    }

    validPrecincts.forEach(precinct => {
      const isStalePrecinct = precinct.stale_data || precinct.id === 'flemington';
      const color = comfortColor(precinct.comfort_label, isStalePrecinct);
      const isCompared = precinct.id === compareSelection1 || precinct.id === compareSelection2;
      const staleBadge = isStalePrecinct
        ? `<div style="position:absolute;top:-4px;right:-4px;width:14px;height:14px;background:#ef4444;border-radius:50%;border:2px solid white;display:flex;align-items:center;justify-content:center;font-size:8px;color:white;font-weight:bold;">!</div>`
        : '';
      const staleMessage = isStalePrecinct ? '<br/><span style="color:#ef4444">Data outdated</span>' : '';

      const icon = L.divIcon({
        className: '',
        html: `
          <div style="position:relative;display:flex;flex-direction:column;align-items:center;cursor:pointer;">
            <div style="
              background:white;color:#111;font-size:10px;font-weight:700;
              padding:2px 6px;border-radius:4px;border:2px solid ${color};
              margin-bottom:2px;white-space:nowrap;box-shadow:0 1px 4px rgba(0,0,0,0.18);
              ${isCompared ? 'outline:3px solid #0ea5e9;' : ''}
            ">${precinct.comfort_score}</div>
            <svg width="28" height="32" viewBox="0 0 28 32" xmlns="http://www.w3.org/2000/svg">
              <path d="M14 0C6.268 0 0 6.268 0 14c0 9.6 14 18 14 18s14-8.4 14-18C28 6.268 21.732 0 14 0z"
                fill="${color}" stroke="white" stroke-width="2"/>
              <circle cx="14" cy="13" r="5" fill="white" opacity="0.5"/>
            </svg>
            ${staleBadge}
          </div>`,
        iconSize: [40, 50],
        iconAnchor: [20, 50],
        popupAnchor: [0, -50],
      });

      const marker = L.marker([precinct.lat, precinct.lng], { icon, pane: 'precinctPane' })
        .addTo(mapRef.current!)
        .bindTooltip(
          `<strong>${precinct.name}</strong><br/>Comfort: ${precinct.comfort_score}/100${staleMessage}`,
          { direction: 'top', offset: [0, -50] }
        )
        .on('click', () => onPrecinctClick(precinct.id));

      markersRef.current.push(marker);
    });
  }, [precincts, selectedCategory, compareSelection1, compareSelection2, onPrecinctClick, activeMode]);

  return (
    <div
      ref={containerRef}
      style={{ height: 'clamp(420px, calc(100vh - 230px), 680px)', width: '100%', zIndex: 0 }}
    />
  );
}
