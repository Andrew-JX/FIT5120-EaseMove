import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { fetchFurniture, type FurnitureFeature, type Precinct } from '../lib/api';

interface LeafletMapProps {
  precincts: Precinct[];
  selectedCategory: string | null;
  activeMode: 'view' | 'compare';
  compareSelection1: string | null;
  compareSelection2: string | null;
  onPrecinctClick: (id: string) => void;
}

function comfortColor(label: string, stale: boolean, noSensor: boolean): string {
  if (stale || noSensor) return '#9ca3af';
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
  if (type.includes('bicycle')) return { label: 'Bicycle Racks', color: '#2563eb', radius: 4 };
  if (type.includes('drinking')) return { label: 'Drinking Fountain', color: '#06b6d4', radius: 4 };
  if (type.includes('bin')) return { label: 'Bins', color: '#f97316', radius: 4 };
  if (type.includes('barbecue')) return { label: 'Barbecue', color: '#ef4444', radius: 4 };
  if (type.includes('seat')) return { label: 'Seats', color: '#a855f7', radius: 4 };
  if (type.includes('bollard')) return { label: 'Bollards', color: '#7c3aed', radius: 4 };
  if (type.includes('horse')) return { label: 'Horse Troughs', color: '#a16207', radius: 4 };
  if (type.includes('planter')) return { label: 'Planter Boxes', color: '#84cc16', radius: 4 };
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

export default function LeafletMap({
  precincts,
  selectedCategory,
  activeMode,
  compareSelection1,
  compareSelection2,
  onPrecinctClick,
}: LeafletMapProps) {
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<L.Marker[]>([]);
  const poiRef = useRef<L.Layer[]>([]);
  const boundaryRef = useRef<L.GeoJSON | null>(null);
  const shoppingLayerRef = useRef<L.GeoJSON | null>(null);
  const waterLayerRef = useRef<L.GeoJSON | null>(null);
  const parksLayerRef = useRef<L.GeoJSON | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Init map once
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    mapRef.current = L.map(containerRef.current, {
      center: [-37.815, 144.960],
      zoom: 14,
      zoomControl: true,
    });
    mapRef.current.createPane('areaPane');
    mapRef.current.getPane('areaPane')!.style.zIndex = '350';
    mapRef.current.createPane('furniturePane');
    mapRef.current.getPane('furniturePane')!.style.zIndex = '625';
    mapRef.current.createPane('precinctPane');
    mapRef.current.getPane('precinctPane')!.style.zIndex = '650';

    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
      subdomains: 'abcd',
      maxZoom: 20,
    }).addTo(mapRef.current);

    fetch('/geoscape/municipal-boundary.geojson')
      .then(res => (res.ok ? res.json() : null))
      .then(data => {
        if (!data || !mapRef.current) return;
        boundaryRef.current?.remove();
        boundaryRef.current = L.geoJSON(data, {
          style: {
            color: '#111111',
            weight: 2,
            fill: false,
            opacity: 1,
          },
          pane: 'areaPane',
          interactive: false,
        }).addTo(mapRef.current);
      })
      .catch((err: unknown) => {
        console.error('[LeafletMap] failed to load municipal boundary', err);
      });

    fetch('/geoscape/shopping-facilities.geojson')
      .then(res => (res.ok ? res.json() : null))
      .then(data => {
        if (!data || !mapRef.current) return;
        shoppingLayerRef.current?.remove();
        shoppingLayerRef.current = L.geoJSON(data, {
          style: {
            color: '#c2410c',
            weight: 1.2,
            fillColor: '#fb923c',
            fillOpacity: 0.12,
            opacity: 0.9,
          },
          pane: 'areaPane',
          interactive: true,
          onEachFeature(feature, layer) {
            const name = String(feature?.properties?.NAME_LABEL || feature?.properties?.NAME || '').trim();
            if (name) layer.bindTooltip(`<strong>Shopping</strong><br/>${name}`, { direction: 'top' });
          },
        }).addTo(mapRef.current);
      })
      .catch((err: unknown) => {
        console.error('[LeafletMap] failed to load shopping layer', err);
      });

    fetch('/geoscape/waterbodies.geojson')
      .then(res => (res.ok ? res.json() : null))
      .then(data => {
        if (!data || !mapRef.current) return;
        waterLayerRef.current?.remove();
        waterLayerRef.current = L.geoJSON(data, {
          style: {
            color: '#0e7490',
            weight: 1.2,
            fillColor: '#22d3ee',
            fillOpacity: 0.18,
            opacity: 0.9,
          },
          pane: 'areaPane',
          interactive: true,
          onEachFeature(feature, layer) {
            const name = String(feature?.properties?.NAME_LABEL || feature?.properties?.NAME || '').trim();
            if (name) layer.bindTooltip(`<strong>Waterbody</strong><br/>${name}`, { direction: 'top' });
          },
        }).addTo(mapRef.current);
      })
      .catch((err: unknown) => {
        console.error('[LeafletMap] failed to load waterbody layer', err);
      });

    fetch('/geoscape/parks.geojson')
      .then(res => (res.ok ? res.json() : null))
      .then(data => {
        if (!data || !mapRef.current) return;
        parksLayerRef.current?.remove();
        parksLayerRef.current = L.geoJSON(data, {
          style: {
            color: '#166534',
            weight: 1,
            fillColor: '#4ade80',
            fillOpacity: 0.08,
            opacity: 0.85,
          },
          pane: 'areaPane',
          interactive: true,
          onEachFeature(feature, layer) {
            const name = String(feature?.properties?.NAME_LABEL || feature?.properties?.NAME || '').trim();
            if (name) layer.bindTooltip(`<strong>Park</strong><br/>${name}`, { direction: 'top' });
          },
        }).addTo(mapRef.current);
      })
      .catch((err: unknown) => {
        console.error('[LeafletMap] failed to load parks layer', err);
      });

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
            `<strong>${style.label}</strong><br/>${feature.properties.location_desc || 'No location description'}`,
            { direction: 'top', offset: [0, -6] }
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
      .catch((err: unknown) => {
        console.error('[LeafletMap] failed to load street furniture points', err);
      });

    return () => {
      shoppingLayerRef.current?.remove();
      shoppingLayerRef.current = null;
      waterLayerRef.current?.remove();
      waterLayerRef.current = null;
      parksLayerRef.current?.remove();
      parksLayerRef.current = null;
      boundaryRef.current?.remove();
      boundaryRef.current = null;
      poiRef.current.forEach(layer => layer.remove());
      poiRef.current = [];
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, []);

  // Update markers whenever data or filters change
  useEffect(() => {
    if (!mapRef.current) return;

    // Remove old markers
    markersRef.current.forEach(m => m.remove());
    markersRef.current = [];

    const filtered = precincts.filter(p => {
      if (!selectedCategory) return true;
      return riskLevel(p.comfort_label) === selectedCategory;
    });

    const validPrecincts = filtered.filter(p => hasValidCoords(p.lat, p.lng));
    if (filtered.length > 0 && validPrecincts.length === 0) {
      console.warn('[LeafletMap] no precinct markers rendered: all precinct coordinates invalid');
    }

    validPrecincts.forEach(p => {
      const color = comfortColor(p.comfort_label, p.stale_data, p.no_sensor_data);
      const isCompared = p.id === compareSelection1 || p.id === compareSelection2;

      const icon = L.divIcon({
        className: '',
        html: `
          <div style="position:relative;display:flex;flex-direction:column;align-items:center;cursor:pointer;">
            <div style="
              background:white;
              color:#111;
              font-size:10px;
              font-weight:700;
              padding:2px 6px;
              border-radius:4px;
              border:2px solid ${color};
              margin-bottom:2px;
              white-space:nowrap;
              box-shadow:0 1px 4px rgba(0,0,0,0.18);
              ${isCompared ? 'outline:3px solid #0ea5e9;' : ''}
            ">${p.comfort_score}</div>
            <svg width="28" height="32" viewBox="0 0 28 32" xmlns="http://www.w3.org/2000/svg">
              <path d="M14 0C6.268 0 0 6.268 0 14c0 9.6 14 18 14 18s14-8.4 14-18C28 6.268 21.732 0 14 0z"
                fill="${color}" stroke="white" stroke-width="2"/>
              <circle cx="14" cy="13" r="5" fill="white" opacity="0.5"/>
            </svg>
            ${p.stale_data || p.no_sensor_data ? `
            <div style="
              position:absolute;top:-4px;right:-4px;
              width:14px;height:14px;
              background:#ef4444;border-radius:50%;
              border:2px solid white;
              display:flex;align-items:center;justify-content:center;
              font-size:8px;color:white;font-weight:bold;
            ">!</div>` : ''}
          </div>`,
        iconSize: [40, 50],
        iconAnchor: [20, 50],
        popupAnchor: [0, -50],
      });

      const marker = L.marker([p.lat, p.lng], { icon, pane: 'precinctPane' })
        .addTo(mapRef.current!)
        .bindTooltip(
          `<strong>${p.name}</strong><br/>Comfort: ${p.comfort_score}/100${p.stale_data || p.no_sensor_data ? '<br/><span style="color:#ef4444">⚠ Stale data</span>' : ''}`,
          { direction: 'top', offset: [0, -50] }
        )
        .on('click', () => onPrecinctClick(p.id));

      markersRef.current.push(marker);
    });
  }, [precincts, selectedCategory, compareSelection1, compareSelection2, onPrecinctClick]);

  return (
    <div
      ref={containerRef}
      style={{ height: 'clamp(420px, calc(100vh - 230px), 680px)', width: '100%', zIndex: 0 }}
    />
  );
}
