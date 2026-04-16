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

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    mapRef.current = L.map(containerRef.current, {
      center: [-37.815, 144.96],
      zoom: 14,
      zoomControl: true,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19,
    }).addTo(mapRef.current);

    return () => {
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!mapRef.current) return;

    markersRef.current.forEach((marker) => marker.remove());
    markersRef.current = [];

    const filtered = precincts.filter((precinct) => {
      if (!selectedCategory) return true;
      return riskLevel(precinct.comfort_label) === selectedCategory;
    });

    filtered.forEach((precinct) => {
      const color = comfortColor(precinct.comfort_label, precinct.stale_data);
      const isCompared = precinct.id === compareSelection1 || precinct.id === compareSelection2;
      const staleBadge = precinct.stale_data
        ? `
            <div style="
              position:absolute;top:-4px;right:-4px;
              width:14px;height:14px;
              background:#ef4444;border-radius:50%;
              border:2px solid white;
              display:flex;align-items:center;justify-content:center;
              font-size:8px;color:white;font-weight:bold;
            ">!</div>`
        : '';
      const staleMessage = precinct.stale_data
        ? '<br/><span style="color:#ef4444">数据尚未更新</span>'
        : '';

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

      const marker = L.marker([precinct.lat, precinct.lng], { icon })
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
