import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { Precinct } from '../lib/api';

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
  const containerRef = useRef<HTMLDivElement>(null);

  // Init map once
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    mapRef.current = L.map(containerRef.current, {
      center: [-37.815, 144.960],
      zoom: 14,
      zoomControl: true,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19,
    }).addTo(mapRef.current);

    return () => {
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

    filtered.forEach(p => {
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

      const marker = L.marker([p.lat, p.lng], { icon })
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
