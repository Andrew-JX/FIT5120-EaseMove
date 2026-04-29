import { useState, useCallback, useEffect, useRef } from "react";
import {
  Thermometer, Droplets, Users, X, Wind, Map, ArrowLeft,
  Layers, List, Plus, Minus, ZoomIn, Snowflake, Tag,
  ChevronDown, ChevronUp,
} from "lucide-react";
import L from "leaflet";
import logo from "../assets/logo-transparent.png";
import ideaIcon from "../assets/idea.png";
import questionMarkIcon from "../assets/question-mark.png";
import warningIcon from "../assets/warning.png";
import LeafletMap, { type EasePlacesFeature } from "../components/LeafletMap";
import { usePrecincts } from "../hooks/usePrecincts";
import {
  DEFAULT_WEIGHTS,
  fetchPrecinctToday,
  loadWeights,
  saveWeights,
  type ComfortWeights,
  type Precinct,
  type TodayRecommendation,
} from "../lib/api";
import { getAreaInfo } from "../lib/areaInfo";
import { navigateTo } from "../lib/navigation";
import AreaDetailPage from "../pages/AreaDetailPage";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function riskLevel(label: string): 'low' | 'caution' | 'high' {
  if (label === 'Comfortable') return 'low';
  if (label === 'Caution') return 'caution';
  return 'high';
}

function getRiskColor(risk: string): string {
  if (risk === 'low') return '#22c55e';
  if (risk === 'caution') return '#eab308';
  return '#ef4444';
}

function formatDataFreshness(p: Precinct): string {
  if (p.id === 'flemington') return 'No live sensors';
  return '';
}

function formatDetailSensorStatus(p: Precinct): string {
  if (p.id === 'flemington') return 'No live sensors';
  return '✅ Live Sensors';
}

function getAreaIdFromUrl(): string | null {
  const areaId = new URLSearchParams(window.location.search).get("area");
  return getAreaInfo(areaId)?.id ?? null;
}

function adjustWeights(current: ComfortWeights, key: keyof ComfortWeights, nextValue: number): ComfortWeights {
  const clamped = Math.max(0, Math.min(100, Math.round(nextValue)));
  const otherKeys = (['temperature', 'humidity', 'activity'] as const).filter(item => item !== key);
  const currentOtherTotal = otherKeys.reduce((sum, item) => sum + current[item], 0);
  const remaining = 100 - clamped;
  if (currentOtherTotal === 0) {
    return { ...current, [key]: clamped, [otherKeys[0]]: remaining, [otherKeys[1]]: 0 };
  }
  const first = Math.round((current[otherKeys[0]] / currentOtherTotal) * remaining);
  return { ...current, [key]: clamped, [otherKeys[0]]: first, [otherKeys[1]]: remaining - first };
}

function cpDotClass(category: string): string {
  if (category.includes('Arts')) return 'cp-dot cp-dot-arts';
  if (category.includes('Recreation')) return 'cp-dot cp-dot-recreation';
  return 'cp-dot cp-dot-shopping';
}

function ComfortScoreInfo({ placement = 'bottom' }: { placement?: 'bottom' | 'right' }) {
  const [open, setOpen] = useState(false);
  const panelClass = placement === 'right'
    ? "absolute left-full ml-2 top-1/2 -translate-y-1/2 z-[700] w-52 max-w-[calc(100vw-2rem)] sm:w-56 max-h-40 overflow-y-auto rounded-lg border border-gray-200 bg-white p-3 text-xs leading-5 text-gray-700 shadow-xl whitespace-normal break-words max-sm:left-auto max-sm:right-0 max-sm:top-7 max-sm:ml-0 max-sm:translate-y-0"
    : "absolute right-0 top-7 z-[700] w-52 max-w-[calc(100vw-2rem)] sm:w-56 max-h-40 overflow-y-auto rounded-lg border border-gray-200 bg-white p-3 text-xs leading-5 text-gray-700 shadow-xl whitespace-normal break-words";
  return (
    <div className="relative inline-flex items-center">
      <button
        type="button"
        aria-label="How comfort score is calculated"
        onClick={() => setOpen((v: boolean) => !v)}
        className="ml-2 inline-flex h-5 w-5 items-center justify-center overflow-hidden rounded-full border border-gray-400 hover:bg-gray-100"
      >
        <img src={questionMarkIcon} alt="" className="h-4 w-4 object-contain" aria-hidden="true" />
      </button>
      {open && (
        <div className={panelClass}>
          <p className="font-semibold text-gray-900 mb-1">How we calculate it</p>
          <p>This score is based on 3 things:</p>
          <p className="mt-1">Temperature, Humidity, and Crowd Level.</p>
          <p className="mt-1">Default mix: 60% / 30% / 10%.</p>
          <p className="mt-1">You can change the mix in Comfort Preferences.</p>
        </div>
      )}
    </div>
  );
}

function Pm25Info() {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative inline-flex items-center">
      <button
        type="button"
        aria-label="What is PM2.5"
        onClick={() => setOpen((v: boolean) => !v)}
        className="ml-1 inline-flex h-4 w-4 items-center justify-center overflow-hidden rounded-full border border-gray-400 hover:bg-gray-100"
      >
        <img src={questionMarkIcon} alt="" className="h-3 w-3 object-contain" aria-hidden="true" />
      </button>
      {open && (
        <div className="absolute right-0 bottom-6 z-[700] w-72 max-w-[calc(100vw-2rem)] max-h-64 overflow-y-auto rounded-lg border border-gray-200 bg-white p-3 text-xs leading-5 text-gray-700 shadow-xl whitespace-normal break-words">
          <p className="font-semibold text-gray-900 mb-1">What is PM2.5?</p>
          <p className="mb-1">PM2.5 means very tiny particles in the air. Lower is better.</p>
          <p><span className="font-semibold">Good (0-12.5 ug/m3):</span> Air quality is satisfactory; negligible risk.</p>
          <p className="mt-1"><span className="font-semibold">Fair (12.5-25 ug/m3):</span> Acceptable quality; unusually sensitive people should limit prolonged outdoor exertion.</p>
          <p className="mt-1"><span className="font-semibold">Poor (25-50 ug/m3):</span> Sensitive groups should reduce prolonged or heavy outdoor exertion.</p>
          <p className="mt-1"><span className="font-semibold">Very Poor (50-150 ug/m3):</span> Sensitive groups should avoid prolonged or heavy outdoor exertion; general public should reduce it.</p>
          <p className="mt-1"><span className="font-semibold">Extremely Poor (&gt;150 ug/m3):</span> Everyone should avoid all outdoor exertion.</p>
        </div>
      )}
    </div>
  );
}

// ─── Ease Places Popup ────────────────────────────────────────────────────────

function EasePlacesPopup({
  feature,
  anchorPoint,
  onClose,
  onZoomTo,
}: {
  feature: EasePlacesFeature;
  anchorPoint: { x: number; y: number };
  onClose: () => void;
  onZoomTo: (f: EasePlacesFeature) => void;
}) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div
      className="ease-places-popup"
      style={{ top: anchorPoint.y + 10, left: anchorPoint.x, transform: 'translateX(-50%)' }}
    >
      <div className="cpp-header">
        <span className="cpp-header-title">Ease Places</span>
        <div className="cpp-header-actions">
          <button className="cpp-icon-btn" title="Zoom to location" onClick={() => onZoomTo(feature)}>
            <ZoomIn size={13} />
          </button>
          <button className="cpp-icon-btn" title={collapsed ? "Expand" : "Collapse"} onClick={() => setCollapsed((c: boolean) => !c)}>
            {collapsed ? <ChevronDown size={13} /> : <ChevronUp size={13} />}
          </button>
          <button className="cpp-icon-btn" title="Close" onClick={onClose}>
            <X size={13} />
          </button>
        </div>
      </div>

      {!collapsed && (
        <div className="cpp-body">
          <div className="cpp-category-row">
            <div className={cpDotClass(feature.category)} />
            <span className="cpp-category-name">{feature.category}</span>
          </div>
          <p className="cpp-sub-type">{feature.type}</p>
          <p className="cpp-place-name">{feature.name}</p>

          <div className="cpp-feature-icons">
            {feature.airConditioned && (
              <div className="cpp-feature-btn">
                <Snowflake size={16} />
                <span className="cpp-tip">Air-conditioned</span>
              </div>
            )}
            {feature.freeEntry && (
              <div className="cpp-feature-btn">
                <Tag size={14} />
                <span className="cpp-tip">Free Entry</span>
              </div>
            )}
          </div>

          <div className="cpp-details">
            <div className="cpp-detail-row">
              <span className="cpp-detail-label">Address</span>
              <span className="cpp-detail-value">{feature.address}</span>
            </div>
            <div className="cpp-detail-row">
              <span className="cpp-detail-label">Opening Hours</span>
              <span className="cpp-detail-value">{feature.operatingHours}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Map Sidebar Controls ─────────────────────────────────────────────────────

function MapSidebarControls({
  onZoomIn,
  onZoomOut,
  openPanel,
  onToggleLayers,
  onToggleLegend,
}: {
  onZoomIn: () => void;
  onZoomOut: () => void;
  openPanel: 'layers' | 'legend' | null;
  onToggleLayers: () => void;
  onToggleLegend: () => void;
}) {
  return (
    <div className="map-sidebar-controls">
      <button className="map-ctrl-btn" title="Zoom in" onClick={onZoomIn}>
        <Plus size={18} />
      </button>
      <button className="map-ctrl-btn" title="Zoom out" onClick={onZoomOut}>
        <Minus size={18} />
      </button>
      <div className="map-ctrl-sep" />
      <button
        className={`map-ctrl-btn${openPanel === 'layers' ? ' active' : ''}`}
        title="Map filters"
        onClick={onToggleLayers}
      >
        <Layers size={17} />
      </button>
      <button
        className={`map-ctrl-btn${openPanel === 'legend' ? ' active' : ''}`}
        title="Legend"
        onClick={onToggleLegend}
      >
        <List size={17} />
      </button>
    </div>
  );
}

// ─── Map Filter Panel ─────────────────────────────────────────────────────────

type MapFilters = {
  easePlaces: boolean;
  comfortArea: boolean;
  streetFacilities: boolean;
  naturalPlaces: boolean;
};

function MapFilterPanel({
  filters,
  onToggle,
}: {
  filters: MapFilters;
  onToggle: (key: keyof MapFilters) => void;
}) {
  return (
    <div className="map-right-panel">
      <div className="map-panel-header">Filters</div>
      {(
        [
          { id: 'easePlaces', label: 'Ease Places' },
          { id: 'comfortArea', label: 'Comfort Area' },
          { id: 'streetFacilities', label: 'Street Facilities' },
          { id: 'naturalPlaces', label: 'Natural Places' },
        ] as const
      ).map(({ id, label }) => (
        <button
          key={id}
          type="button"
          className={`layer-item${filters[id] ? ' active' : ''}`}
          onClick={() => onToggle(id)}
        >
          <div className={`layer-radio${filters[id] ? ' checked' : ''}`} />
          {label}
        </button>
      ))}
    </div>
  );
}

// ─── Legend Panel ─────────────────────────────────────────────────────────────

function FurnitureLegend() {
  return (
    <>
      <div className="legend-divider" />
      <div className="legend-section-label">Street Furniture</div>
      <div className="legend-row">
        <div className="furniture-dot furniture-dot-drinking" />
        <span>Drinking Fountain</span>
      </div>
      <div className="legend-row">
        <div className="furniture-dot furniture-dot-bike" />
        <span>Bicycle Rack</span>
      </div>
      <div className="legend-row">
        <div className="furniture-dot furniture-dot-seat" />
        <span>Seat</span>
      </div>
    </>
  );
}

function LegendPanel() {
  return (
    <div className="map-right-panel">
      <div className="map-panel-header">Legend</div>
      <div className="legend-body">
        <div className="legend-section-label">Ease Places</div>
        <div className="legend-row">
          <div className="cp-dot cp-dot-arts" />
          <span>Arts, Culture &amp; Enrichment</span>
        </div>
        <div className="legend-row">
          <div className="cp-dot cp-dot-recreation" />
          <span>Recreation / Leisure &amp; Open Spaces</span>
        </div>
        <div className="legend-row">
          <div className="cp-dot cp-dot-shopping" />
          <span>Shopping</span>
        </div>

        <div className="legend-divider" />
        <div className="legend-section-label">Natural Places</div>
        <div className="legend-row">
          <div className="h-3 w-3 border-2 border-blue-900 bg-blue-200" />
          <span>Waterbody</span>
        </div>
        <div className="legend-row">
          <div className="h-3 w-3 border-2 border-green-900 bg-green-300" />
          <span>Park</span>
        </div>

        <div className="legend-divider" />
        <div className="legend-section-label">Comfort Level</div>
        <div className="legend-row">
          <div className="comfort-dot comfort-dot-comfortable" />
          <span>Comfortable (70–100)</span>
        </div>
        <div className="legend-row">
          <div className="comfort-dot comfort-dot-caution" />
          <span>Caution (40–69)</span>
        </div>
        <div className="legend-row">
          <div className="comfort-dot comfort-dot-high" />
          <span>High Risk (0–39)</span>
        </div>
        <div className="legend-row">
          <div className="comfort-dot comfort-dot-no-data" />
          <span>No sensor data</span>
        </div>

        <FurnitureLegend />
      </div>
    </div>
  );
}

// ─── App ──────────────────────────────────────────────────────────────────────

export default function App() {
  const [weights, setWeights] = useState<ComfortWeights>(() => loadWeights());
  const [debouncedWeights, setDebouncedWeights] = useState<ComfortWeights>(weights);
  const [activeTab, setActiveTab] = useState<"view" | "compare">("view");
  const [selectedAreaId, setSelectedAreaId] = useState<string | null>(() => getAreaIdFromUrl());
  const [mapFilters, setMapFilters] = useState<MapFilters>({
    easePlaces: false,
    comfortArea: true,
    streetFacilities: false,
    naturalPlaces: false,
  });
  const shouldFetchPrecincts = activeTab === 'compare' || mapFilters.comfortArea;

  const { precincts: precinctList, loading, error } = usePrecincts(
    shouldFetchPrecincts ? debouncedWeights : undefined
  );

  const precincts: Record<string, Precinct> = Object.fromEntries(
    precinctList.map((p: Precinct) => [p.id, p])
  );

  const [showCard, setShowCard] = useState<string | null>(null);
  // Left sidebar starts collapsed — only relevant when Comfort Area filter is enabled
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(true);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [compareSelection1, setCompareSelection1] = useState<string | null>(null);
  const [compareSelection2, setCompareSelection2] = useState<string | null>(null);

  // Right panel: 'layers' | 'legend' | null — mutually exclusive
  const [openPanel, setOpenPanel] = useState<'layers' | 'legend' | null>('legend');

  // Ease Places popup
  const [easePlacesPopup, setEasePlacesPopup] = useState<{ feature: EasePlacesFeature; point: { x: number; y: number } } | null>(null);

  // Time recommendation state
  const [selectedDestId, setSelectedDestId] = useState<string | null>(null);
  const [todayData, setTodayData] = useState<TodayRecommendation | null>(null);
  const [showTimeRecommendation, setShowTimeRecommendation] = useState(false);
  const [loadingToday, setLoadingToday] = useState(false);
  const nextCompareReplaceSlotRef = useRef<1 | 2>(1);

  // Leaflet map instance for programmatic zoom / flyTo
  const mapInstanceRef = useRef<L.Map | null>(null);

  const handleMapReady = useCallback((map: L.Map) => {
    mapInstanceRef.current = map;
  }, []);

  const handleBrandClick = useCallback(() => {
    navigateTo("/");
  }, []);

  const handleAreaNavigation = useCallback((areaId: string | null) => {
    const url = new URL(window.location.href);
    if (areaId) url.searchParams.set("area", areaId);
    else url.searchParams.delete("area");
    const nextUrl = `${url.pathname}${url.search}`;
    const currentUrl = `${window.location.pathname}${window.location.search}`;
    if (nextUrl === currentUrl) {
      setSelectedAreaId(areaId);
      return;
    }
    window.history.pushState({}, "", nextUrl);
    window.dispatchEvent(new PopStateEvent("popstate"));
  }, []);

  const categories = [
    { name: "Comfortable", level: "low",     color: "#22c55e", bgColor: "bg-green-100",  textColor: "text-green-800" },
    { name: "Caution",     level: "caution", color: "#eab308", bgColor: "bg-yellow-100", textColor: "text-yellow-800" },
    { name: "High Risk",   level: "high",    color: "#ef4444", bgColor: "bg-red-100",    textColor: "text-red-800" },
  ];

  useEffect(() => { saveWeights(weights); }, [weights]);

  useEffect(() => {
    const syncAreaFromUrl = () => {
      setSelectedAreaId(getAreaIdFromUrl());
    };

    window.addEventListener("popstate", syncAreaFromUrl);
    return () => window.removeEventListener("popstate", syncAreaFromUrl);
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedWeights(weights), 800);
    return () => clearTimeout(timer);
  }, [weights]);

  // ─── Map filters ─────────────────────────────────────────────────────────────

  const handleToggleMapFilter = useCallback((key: keyof MapFilters) => {
    setMapFilters((current: MapFilters) => {
      const next = { ...current, [key]: !current[key] };
      if (key === 'easePlaces' && !next.easePlaces) setEasePlacesPopup(null);
      if (key === 'comfortArea' && !next.comfortArea) {
        setShowCard(null);
        setSelectedCategory(null);
        setSidebarCollapsed(true);
      }
      if (key === 'comfortArea' && next.comfortArea) {
        setSidebarCollapsed(false);
      }
      return next;
    });
  }, []);

  // ─── Sidebar controls ────────────────────────────────────────────────────────

  const handleZoomIn = useCallback(() => { mapInstanceRef.current?.zoomIn(); }, []);
  const handleZoomOut = useCallback(() => { mapInstanceRef.current?.zoomOut(); }, []);

  const handleToggleLayers = useCallback(() => {
    setOpenPanel((p: 'layers' | 'legend' | null) => (p === 'layers' ? null : 'layers'));
  }, []);

  const handleToggleLegend = useCallback(() => {
    setOpenPanel((p: 'layers' | 'legend' | null) => (p === 'legend' ? null : 'legend'));
  }, []);

  // ─── Map click handlers ──────────────────────────────────────────────────────

  const handleCompareClick = useCallback((id: string) => {
    if (compareSelection1 === id) {
      setCompareSelection1(null);
    } else if (compareSelection2 === id) {
      setCompareSelection2(null);
    } else if (!compareSelection1) {
      setCompareSelection1(id);
    } else if (!compareSelection2) {
      setCompareSelection2(id);
    } else if (nextCompareReplaceSlotRef.current === 1) {
      setCompareSelection1(id);
      nextCompareReplaceSlotRef.current = 2;
    } else {
      setCompareSelection2(id);
      nextCompareReplaceSlotRef.current = 1;
    }
  }, [compareSelection1, compareSelection2]);

  const handleMapClickCombined = useCallback((id: string) => {
    if (activeTab === 'compare') {
      handleCompareClick(id);
    } else {
      setShowCard(id);
    }
  }, [activeTab, handleCompareClick]);

  const handleEasePlacesClick = useCallback((feature: EasePlacesFeature, point: { x: number; y: number }) => {
    setEasePlacesPopup({ feature, point });
  }, []);

  const handleZoomTo = useCallback((feature: EasePlacesFeature) => {
    mapInstanceRef.current?.flyTo([feature.lat, feature.lng], 17, { duration: 1.2 });
  }, []);

  const handleWantToGo = async (id: string) => {
    setSelectedDestId(id);
    setShowTimeRecommendation(true);
    setLoadingToday(true);
    try {
      const data = await fetchPrecinctToday(id, weights);
      setTodayData(data);
    } catch {
      setTodayData(null);
    } finally {
      setLoadingToday(false);
    }
  };

  function isStale(p: Precinct): boolean {
    return p.id === 'flemington';
  }

  // ─── Compare helpers ─────────────────────────────────────────────────────────

  const compareRank = (p: Precinct): number => {
    const riskPriority = { low: 3, caution: 2, high: 1 } as const;
    const stalePenalty = isStale(p) ? 0 : 1;
    return riskPriority[riskLevel(p.comfort_label)] * 10 + stalePenalty;
  };

  const getBetterPrecinct = () => {
    if (!compareSelection1 || !compareSelection2) return null;
    const p1 = precincts[compareSelection1];
    const p2 = precincts[compareSelection2];
    if (!p1 || !p2) return null;
    if (p1.comfort_score > p2.comfort_score) return compareSelection1;
    if (p2.comfort_score > p1.comfort_score) return compareSelection2;
    const rank1 = compareRank(p1);
    const rank2 = compareRank(p2);
    if (rank1 > rank2) return compareSelection1;
    if (rank2 > rank1) return compareSelection2;
    return null;
  };

  const getComparisonRecommendation = (): {
    base: string;
    staleWarning: string | null;
    nonOptimalNotice: string | null;
  } | null => {
    if (!compareSelection1 || !compareSelection2) return null;
    const p1 = precincts[compareSelection1];
    const p2 = precincts[compareSelection2];
    if (!p1 || !p2) return null;

    const betterId = getBetterPrecinct();
    const better = betterId ? precincts[betterId] : null;
    const baseRecommendation = better
      ? (p1.comfort_score !== p2.comfort_score
        ? `We recommend ${better.name} because it has the higher comfort score (${p1.comfort_score} vs ${p2.comfort_score}).`
        : `Scores are tied (${p1.comfort_score}). We recommend ${better.name} based on priority (Green > Yellow > Red > Outdated).`)
      : `Both areas are very close. Current scores: ${p1.name} ${p1.comfort_score}, ${p2.name} ${p2.comfort_score}.`;

    const r1 = riskLevel(p1.comfort_label);
    const r2 = riskLevel(p2.comfort_label);
    const staleNotes: string[] = [];
    if (isStale(p1)) staleNotes.push(p1.name);
    if (isStale(p2)) staleNotes.push(p2.name);
    const staleWarning = staleNotes.length
      ? `Important: ${staleNotes.join(' and ')} data may be outdated. Please consider switching to another destination.`
      : null;

    const nonOptimalNotice = (r1 !== 'low' && r2 !== 'low')
      ? 'Both compared areas are not optimal right now. We suggest choosing a different destination if possible.'
      : null;

    return { base: baseRecommendation, staleWarning, nonOptimalNotice };
  };

  const comparisonRecommendation = getComparisonRecommendation();

  const getPreparationAdvice = (p: Precinct) => {
    const advice: Array<{ icon: string; text: string; category: string; trigger: string }> = [];
    if (p.temperature !== null && p.temperature > 30)
      advice.push({ icon: "☀️", text: "Wear lightweight, breathable clothing and carry a water bottle", category: "High Temperature", trigger: `Based on current temperature: ${p.temperature}°C` });
    if (p.pm25 !== null && p.pm25 > 25)
      advice.push({ icon: "😷", text: "Air quality is currently poor — consider wearing a mask during strenuous outdoor activity", category: "Air Quality", trigger: `Based on PM2.5 reading: ${p.pm25} µg/m³` });
    if ((p.temperature === null || p.temperature < 28) && (p.pm25 === null || p.pm25 <= 25))
      advice.push({ icon: "✅", text: "Conditions are comfortable — great time for a walk or ride!", category: "Comfortable Conditions", trigger: p.temperature !== null ? `Temperature: ${p.temperature}°C, PM2.5: ${p.pm25 ?? 'N/A'} µg/m³` : "Based on available sensor data" });
    if (p.temperature !== null && p.temperature >= 28 && p.temperature <= 30)
      advice.push({ icon: "🌡️", text: "Temperature is warm — stay hydrated and seek shade when possible", category: "Moderate Temperature", trigger: `Based on current temperature: ${p.temperature}°C` });
    if (p.humidity !== null && p.humidity > 65)
      advice.push({ icon: "💧", text: "High humidity — drink plenty of water and take breaks in air-conditioned areas", category: "Humidity", trigger: `Based on humidity level: ${p.humidity}%` });
    if (p.activity_level === "High")
      advice.push({ icon: "👥", text: "High crowd density — plan extra time and consider visiting during off-peak hours", category: "Crowding", trigger: `Based on activity level: ${p.activity_level}` });
    if (p.wind_speed !== null && p.wind_speed < 3)
      advice.push({ icon: "💨", text: "Low wind conditions — may feel warmer than temperature indicates", category: "Wind", trigger: `Based on wind speed: ${p.wind_speed} m/s` });
    if (advice.length === 0)
      advice.push({ icon: "✨", text: "Conditions look good for outdoor activities", category: "General", trigger: "Based on available sensor data" });
    return advice;
  };

  // ─── Time Recommendation View ────────────────────────────────────────────────

  if (showTimeRecommendation && selectedDestId) {
    const destPrecinct = precincts[selectedDestId];
    const destName = destPrecinct?.name ?? selectedDestId;

    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-gray-100 relative overflow-hidden">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-blue-100/20 to-gray-200/20 rounded-full blur-3xl" />
          <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-gradient-to-tr from-gray-100/20 to-blue-100/20 rounded-full blur-3xl" />
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-gradient-to-br from-blue-100/10 to-gray-100/10 rounded-full blur-3xl" />
        </div>

        <nav className="bg-white/80 backdrop-blur-md shadow-lg mb-6 relative z-10 border-b border-white/20">
          <div className="px-6 py-2">
            <div className="flex items-center justify-between">
              <button
                type="button"
                className="relative h-14 w-56 cursor-pointer border-0 bg-transparent p-0"
                onClick={handleBrandClick}
                aria-label="Return to EaseMove landing"
              >
                <img src={logo} alt="EaseMove logo" className="absolute left-0 top-1/2 h-56 w-56 -translate-y-1/2 object-contain" />
              </button>
              <div />
            </div>
          </div>
        </nav>

        <div className="px-6 pb-6 relative z-10">
          <div className="max-w-5xl mx-auto">
            <div className="mb-3">
              <button
                type="button"
                onClick={() => { setShowTimeRecommendation(false); setSelectedDestId(null); setTodayData(null); }}
                className="flex items-center gap-2 rounded-lg bg-blue-500 px-3 py-2 text-sm text-white transition-colors hover:bg-blue-600"
              >
                <ArrowLeft className="h-4 w-4" />
                <span>Back</span>
              </button>
            </div>
            <div className="bg-white/95 backdrop-blur-sm rounded-xl shadow-xl p-6 mb-6 border border-white/20">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-3 bg-gradient-to-br from-amber-500 to-orange-600 rounded-lg shadow-lg">
                  <Map className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1">
                  <h2 className="text-2xl font-semibold bg-gradient-to-r from-amber-600 to-orange-600 bg-clip-text text-transparent">Time-slot Recommendation</h2>
                  <p className="text-sm text-gray-600">Optimal travel times based on real-time sensor data</p>
                </div>
              </div>
              <div className="bg-gradient-to-r from-teal-50 to-cyan-50 rounded-lg p-4 border-2 border-teal-200">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-teal-500 rounded-full flex items-center justify-center text-white">📍</div>
                  <div>
                    <p className="text-sm text-gray-600">Destination</p>
                    <p className="text-xl font-bold text-teal-700">{destName}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white/95 backdrop-blur-sm rounded-xl shadow-xl p-6 mb-6 border border-white/20">
              <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <span className="text-2xl">⭐</span>
                <span>Right Now</span>
              </h3>
              {loadingToday ? (
                <div className="text-center py-4 text-gray-500">Loading sensor data…</div>
              ) : destPrecinct ? (
                <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-5 border-2 border-green-300">
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0 w-12 h-12 bg-green-500 rounded-full flex items-center justify-center text-white text-xl">✓</div>
                    <div className="flex-1">
                      <p className="text-lg font-semibold text-green-900 mb-2">
                        {todayData?.recommendation ?? (destPrecinct.comfort_label === 'Comfortable' ? 'Good time to travel. Conditions are comfortable right now.' : destPrecinct.comfort_label === 'Caution' ? 'Conditions are elevated. Consider travelling before 10am or after 5pm.' : 'High risk conditions. Consider waiting or using alternative transport.')}
                      </p>
                      <p className="text-sm text-gray-700 mb-3">
                        Current comfort score for {destName} is <span className="font-bold text-green-700">{destPrecinct.comfort_score}/100</span>
                      </p>
                      <div className="grid grid-cols-2 gap-3 mt-3">
                        <div className="bg-white/70 rounded-lg p-2 text-xs"><span className="text-gray-600">Temperature:</span><span className="font-bold ml-1">{destPrecinct.temperature !== null ? `${destPrecinct.temperature}°C` : 'N/A'}</span></div>
                        <div className="bg-white/70 rounded-lg p-2 text-xs"><span className="text-gray-600">Humidity:</span><span className="font-bold ml-1">{destPrecinct.humidity !== null ? `${destPrecinct.humidity}%` : 'N/A'}</span></div>
                        <div className="bg-white/70 rounded-lg p-2 text-xs"><span className="text-gray-600">Activity Level:</span><span className="font-bold ml-1">{destPrecinct.activity_level}</span></div>
                        <div className="bg-white/70 rounded-lg p-2 text-xs"><span className="text-gray-600">Wind Speed:</span><span className="font-bold ml-1">{destPrecinct.wind_speed !== null ? `${destPrecinct.wind_speed} m/s` : 'N/A'}</span></div>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-gray-500 text-sm">No data available for this precinct.</p>
              )}
            </div>

            <div className="bg-white/95 backdrop-blur-sm rounded-xl shadow-xl p-6 mb-6 border border-white/20">
              <h3 className="text-xl font-semibold mb-4">Recommended Time Slots</h3>
              <div className="space-y-4">
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-4 border-2 border-blue-200">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-2xl">🌅</span>
                    <div>
                      <p className="font-bold text-lg text-blue-900">Morning 7:00 – 10:00</p>
                      <p className="text-sm text-blue-700">Typically cooler with lower crowd density</p>
                    </div>
                  </div>
                  <div className="mt-3 p-3 bg-white/60 rounded-lg">
                    <p className="text-sm text-gray-700"><span className="font-semibold">Why:</span> Morning temperatures are generally more comfortable, crowds are lower, and air quality tends to be better before peak traffic.</p>
                  </div>
                </div>
                <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl p-4 border-2 border-purple-200">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-2xl">🌆</span>
                    <div>
                      <p className="font-bold text-lg text-purple-900">Evening After 17:00</p>
                      <p className="text-sm text-purple-700">Temperature drops, crowd density decreases</p>
                    </div>
                  </div>
                  <div className="mt-3 p-3 bg-white/60 rounded-lg">
                    <p className="text-sm text-gray-700"><span className="font-semibold">Why:</span> Evening conditions are typically cooler, avoiding the hottest afternoon period, with higher overall comfort levels.</p>
                  </div>
                </div>
              </div>
              <div className="mt-5 p-4 bg-yellow-50 rounded-lg border-l-4 border-yellow-400">
                <p className="text-sm font-semibold text-yellow-900 mb-2">💡 Alternative Suggestion</p>
                <p className="text-sm text-gray-700">If travelling between 12:00–15:00, consider indoor routes or bring sun protection as temperatures are higher during this period.</p>
              </div>
            </div>

            <div className="bg-white/95 backdrop-blur-sm rounded-xl shadow-xl p-6 border border-white/20">
              <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <span className="text-2xl">🎒</span>
                <span>Preparation Advice</span>
              </h3>
              <div className="space-y-3">
                {destPrecinct && getPreparationAdvice(destPrecinct).map((adv, i) => (
                  <div key={i} className="bg-gradient-to-r from-green-50 via-emerald-50 to-teal-50 rounded-xl border-2 border-green-200 hover:border-green-300 shadow-sm hover:shadow-md transition-all p-4">
                    <div className="flex items-start gap-3 mb-2">
                      <div className="flex-shrink-0 w-10 h-10 flex items-center justify-center bg-white rounded-full shadow-sm">
                        <span className="text-2xl">{adv.icon}</span>
                      </div>
                      <div className="flex-1 pt-1">
                        <p className="text-sm font-semibold text-gray-800 mb-2">{adv.text}</p>
                        <span className="text-xs bg-white px-2 py-1 rounded-full text-gray-600 border border-gray-200 font-medium">{adv.category}</span>
                      </div>
                    </div>
                    <div className="ml-14 mt-2 text-xs text-gray-600 bg-white/60 rounded-lg px-3 py-2 border border-gray-200">
                      <span className="font-medium inline-flex items-center gap-1">
                        <span>📊</span>
                        {adv.trigger.includes('PM2.5') ? (
                          <>
                            <span>{adv.trigger.slice(0, adv.trigger.indexOf('PM2.5'))}</span>
                            <span>PM2.5</span>
                            <Pm25Info />
                            <span>{adv.trigger.slice(adv.trigger.indexOf('PM2.5') + 'PM2.5'.length)}</span>
                          </>
                        ) : (
                          <span>{adv.trigger}</span>
                        )}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ─── Main Map View ────────────────────────────────────────────────────────────

  const showCardPrecinct = showCard ? precincts[showCard] : null;
  const betterPrecinctId = getBetterPrecinct();
  const selectedArea = getAreaInfo(selectedAreaId);

  if (selectedArea) {
    return <AreaDetailPage area={selectedArea} onBack={() => handleAreaNavigation(null)} />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/30 to-gray-100 relative overflow-hidden">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-blue-100/20 to-gray-200/20 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-gradient-to-tr from-gray-100/20 to-blue-100/20 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-gradient-to-br from-blue-100/10 to-gray-100/10 rounded-full blur-3xl" />
      </div>

      {/* Nav */}
      <nav className="bg-white/80 backdrop-blur-md shadow-lg mb-4 relative z-10 border-b border-white/20">
        <div className="px-6 py-2">
          <div className="flex items-center justify-between">
            <button
              type="button"
              className="relative h-14 w-56 cursor-pointer border-0 bg-transparent p-0"
              onClick={handleBrandClick}
              aria-label="Return to EaseMove landing"
            >
              <img src={logo} alt="EaseMove logo" className="absolute left-0 top-1/2 h-56 w-56 -translate-y-1/2 object-contain" />
            </button>
            <div className="flex items-center gap-4">
              {loading && <span className="text-sm text-gray-400 animate-pulse">Loading sensors…</span>}
              {error && <span className="text-sm text-red-500">⚠ {error}</span>}
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                Live sensors
              </div>
            </div>
          </div>
        </div>
      </nav>

      {/* Main */}
      <div className="px-6 pb-4 relative z-10">
        <div className="grid grid-cols-1 gap-6">
          <div className="bg-white/95 backdrop-blur-sm rounded-xl shadow-2xl border border-white/20" id="map-container">

            {/* Tabs */}
            <div className="border-b border-gray-200">
              <div className="flex items-center px-6 pt-4">
                {(['view', 'compare'] as const).map(tab => (
                  <button
                    type="button"
                    key={tab}
                    onClick={() => { setActiveTab(tab); setShowCard(null); }}
                    className={`px-6 py-3 font-medium text-sm transition-all relative ${activeTab === tab ? 'text-teal-600' : 'text-gray-600 hover:text-gray-900'}`}
                  >
                    {tab.charAt(0).toUpperCase() + tab.slice(1)}
                    {activeTab === tab && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-teal-600" />}
                  </button>
                ))}
              </div>
            </div>

            {/* ── View Tab ── */}
            {activeTab === "view" && (
              <>
                <div className="p-6 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-gradient-to-br from-teal-500 to-cyan-600 rounded-lg shadow-lg">
                      <Map className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex-1">
                      <h2 className="text-2xl font-semibold bg-gradient-to-r from-teal-600 to-cyan-600 bg-clip-text text-transparent">
                        Interactive Map View
                      </h2>
                      <p className="text-sm text-gray-600">
                        Choose what appears on the map using Filters.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex">
                  {/* Left sidebar — hidden when Ease Places is active */}
                  <div
                    className={`border-r border-gray-200 bg-gray-50/50 transition-all duration-300 overflow-x-hidden overflow-y-auto ${
                      sidebarCollapsed || !mapFilters.comfortArea ? 'w-0' : 'w-56'
                    }`}
                    style={{ height: "clamp(420px, calc(100vh - 230px), 680px)" }}
                  >
                    <div className="p-4 w-56">
                      <h3 className="font-semibold mb-3 text-sm text-gray-700">Filter by Comfort</h3>
                      <div className="space-y-2 map-legend-items">
                        {categories.map(cat => (
                          <button
                            type="button"
                            key={cat.name}
                            onClick={() => setSelectedCategory(selectedCategory === cat.level ? null : cat.level)}
                            className={`w-full text-left px-4 py-3 rounded-lg flex items-center gap-3 transition-all border-2 ${
                              selectedCategory === cat.level
                                ? `${cat.bgColor} ${cat.textColor} shadow-lg scale-105 font-semibold`
                                : 'bg-white hover:bg-gray-50 text-gray-700 border-gray-200'
                            }`}
                            style={{ borderColor: selectedCategory === cat.level ? cat.color : undefined }}
                          >
                            <div className="w-5 h-5 rounded-full" style={{ backgroundColor: cat.color }} />
                            <span className="text-sm font-medium">{cat.name}</span>
                            <span className="ml-auto text-xs font-semibold">
                              {precinctList.filter((p: Precinct) => riskLevel(p.comfort_label) === cat.level).length}
                            </span>
                          </button>
                        ))}
                      </div>

                      <div className="mt-5 border-t border-gray-200 pt-4">
                        <div className="flex items-center justify-between mb-3">
                          <h3 className="font-semibold text-sm text-gray-700">Comfort Preferences</h3>
                          <button
                            type="button"
                            onClick={() => setWeights(DEFAULT_WEIGHTS)}
                            className="text-xs font-semibold text-teal-700 hover:text-teal-900"
                          >
                            Reset
                          </button>
                        </div>
                        {([
                          ['temperature', 'Temperature'],
                          ['humidity', 'Humidity'],
                          ['activity', 'Activity'],
                        ] as const).map(([key, label]) => (
                          <label key={key} className="block mb-3">
                            <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
                              <span>{label}</span>
                              <span className="font-bold text-gray-800">{weights[key]}%</span>
                            </div>
                            <input
                              type="range"
                              min="0"
                              max="100"
                              value={weights[key]}
                              onChange={(event) => setWeights((current: ComfortWeights) => adjustWeights(current, key, Number(event.target.value)))}
                              className="w-full accent-teal-600"
                              aria-label={`${label} comfort weight`}
                            />
                          </label>
                        ))}
                        <p className="text-[11px] leading-4 text-gray-500">
                          Scores refresh through the backend as you adjust these weights. Your preferences are saved on this device only.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Map area */}
                  <div className="flex-1 relative">
                    {/* Left sidebar toggle — only visible when Comfort Area is enabled */}
                    {mapFilters.comfortArea && (
                      <button
                        type="button"
                        onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                        className="absolute top-20 left-4 z-30 bg-white/95 hover:bg-white shadow-lg rounded-lg p-2 transition-colors"
                        aria-label={sidebarCollapsed ? "Show sidebar" : "Hide sidebar"}
                        title={sidebarCollapsed ? "Show sidebar" : "Hide sidebar"}
                      >
                        {sidebarCollapsed ? (
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        ) : (
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                          </svg>
                        )}
                      </button>
                    )}

                    {/* Right-side sidebar controls */}
                    <MapSidebarControls
                      onZoomIn={handleZoomIn}
                      onZoomOut={handleZoomOut}
                      openPanel={openPanel}
                      onToggleLayers={handleToggleLayers}
                      onToggleLegend={handleToggleLegend}
                    />

                    {/* Right-side floating panel */}
                    {openPanel === 'layers' && (
                      <MapFilterPanel filters={mapFilters} onToggle={handleToggleMapFilter} />
                    )}
                    {openPanel === 'legend' && (
                      <LegendPanel />
                    )}

                    <LeafletMap
                      precincts={mapFilters.comfortArea ? precinctList : []}
                      selectedCategory={mapFilters.comfortArea ? selectedCategory : null}
                      activeMode="view"
                      compareSelection1={null}
                      compareSelection2={null}
                      onPrecinctClick={handleMapClickCombined}
                      onAreaClick={handleAreaNavigation}
                      showInteractiveAreas={mapFilters.comfortArea}
                      showEasePlaces={mapFilters.easePlaces}
                      showStreetFacilities={mapFilters.streetFacilities}
                      showNaturalPlaces={mapFilters.naturalPlaces}
                      onMapReady={handleMapReady}
                      onEasePlacesClick={handleEasePlacesClick}
                    />

                    {/* Ease Places popup */}
                    {easePlacesPopup && mapFilters.easePlaces && (
                      <EasePlacesPopup
                        feature={easePlacesPopup.feature}
                        anchorPoint={easePlacesPopup.point}
                        onClose={() => setEasePlacesPopup(null)}
                        onZoomTo={handleZoomTo}
                      />
                    )}

                    {/* Comfort Area detail card */}
                    {showCard && showCardPrecinct && mapFilters.comfortArea && (
                      <div className="fixed bottom-0 left-0 right-0 sm:absolute sm:bottom-4 sm:left-4 sm:right-auto sm:w-96 sm:max-h-[calc(100%-2rem)] bg-white/98 backdrop-blur rounded-t-2xl sm:rounded-xl shadow-2xl p-4 sm:p-5 z-[500] border-t border-gray-200 max-h-[60vh] overflow-y-auto">
                        <div className="flex justify-center mb-2 sm:hidden">
                          <div className="w-10 h-1 bg-gray-300 rounded-full" />
                        </div>
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <h3 className="font-bold text-xl">{showCardPrecinct.name}</h3>
                            <p className="text-sm text-gray-500 mt-1">{formatDetailSensorStatus(showCardPrecinct)}</p>
                          </div>
                          <button type="button" aria-label="Close" onClick={() => setShowCard(null)} className="text-gray-400 hover:text-gray-600 transition-colors">
                            <X className="w-5 h-5" />
                          </button>
                        </div>

                        {isStale(showCardPrecinct) && (
                          <div className="mb-4 p-3 bg-red-50 border-2 border-red-300 rounded-lg">
                            <div className="flex items-start gap-2">
                              <div className="flex-shrink-0 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center text-white text-xs font-bold">!</div>
                              <div>
                                <p className="text-sm font-semibold text-red-800">Data may be outdated</p>
                                <p className="text-sm text-red-700 mt-1">Sensor data has not been updated for more than 30 minutes. Conditions may have changed.</p>
                              </div>
                            </div>
                          </div>
                        )}

                        {!isStale(showCardPrecinct) && (
                          <div className="mb-4 p-3 bg-green-50 border-2 border-green-300 rounded-lg">
                            <div className="flex items-start gap-2">
                              <div className="flex-shrink-0 w-5 h-5 bg-green-500 rounded-full flex items-center justify-center text-white text-xs font-bold">✓</div>
                              <div>
                                <p className="text-sm font-semibold text-green-800">Data is up to date</p>
                                <p className="text-sm text-green-700 mt-1">Sensor data has been updated within the last 30 minutes.</p>
                              </div>
                            </div>
                          </div>
                        )}

                        <div
                          className={`mb-4 p-4 bg-gradient-to-r rounded-lg border-2 ${isStale(showCardPrecinct) ? 'from-gray-50 to-gray-100' : 'from-teal-50 to-cyan-50'}`}
                          style={{ borderColor: isStale(showCardPrecinct) ? '#9ca3af' : getRiskColor(riskLevel(showCardPrecinct.comfort_label)) }}
                        >
                          <div className="text-center">
                            <div className="mb-2 flex items-center justify-center">
                              <p className="text-sm text-gray-600">Comfort Score</p>
                              <ComfortScoreInfo />
                            </div>
                            <div className="flex items-center justify-center">
                              <span
                                className={`text-5xl font-bold ${isStale(showCardPrecinct) ? 'text-gray-400' : ''}`}
                                style={{ color: isStale(showCardPrecinct) ? undefined : getRiskColor(riskLevel(showCardPrecinct.comfort_label)) }}
                              >
                                {showCardPrecinct.comfort_score}
                              </span>
                              <span className="text-2xl text-gray-400 ml-1">/100</span>
                            </div>
                            <p className="text-sm font-semibold mt-2" style={{ color: isStale(showCardPrecinct) ? '#9ca3af' : getRiskColor(riskLevel(showCardPrecinct.comfort_label)) }}>
                              {showCardPrecinct.comfort_label}
                            </p>
                          </div>
                        </div>

                        <div className={`grid grid-cols-2 gap-3 mb-4 ${isStale(showCardPrecinct) ? 'opacity-60' : ''}`}>
                          <div className={`bg-gradient-to-br rounded-lg p-3 border ${isStale(showCardPrecinct) ? 'from-gray-50 to-gray-100 border-gray-300' : 'from-orange-50 to-orange-100 border-orange-200'}`}>
                            <div className="flex items-center gap-2 mb-1"><Thermometer className={`w-4 h-4 ${isStale(showCardPrecinct) ? 'text-gray-500' : 'text-orange-600'}`} /><p className="text-sm text-gray-600">Temperature</p></div>
                            <p className={`text-xl font-bold ${isStale(showCardPrecinct) ? 'text-gray-600' : 'text-orange-700'}`}>{showCardPrecinct.temperature !== null ? `${showCardPrecinct.temperature}°C` : 'N/A'}</p>
                          </div>
                          <div className={`bg-gradient-to-br rounded-lg p-3 border ${isStale(showCardPrecinct) ? 'from-gray-50 to-gray-100 border-gray-300' : 'from-blue-50 to-blue-100 border-blue-200'}`}>
                            <div className="flex items-center gap-2 mb-1"><Droplets className={`w-4 h-4 ${isStale(showCardPrecinct) ? 'text-gray-500' : 'text-blue-600'}`} /><p className="text-sm text-gray-600">Humidity</p></div>
                            <p className={`text-xl font-bold ${isStale(showCardPrecinct) ? 'text-gray-600' : 'text-blue-700'}`}>{showCardPrecinct.humidity !== null ? `${showCardPrecinct.humidity}%` : 'N/A'}</p>
                          </div>
                          <div className={`bg-gradient-to-br rounded-lg p-3 border ${isStale(showCardPrecinct) ? 'from-gray-50 to-gray-100 border-gray-300' : 'from-purple-50 to-purple-100 border-purple-200'}`}>
                            <div className="flex items-center gap-2 mb-1"><Users className={`w-4 h-4 ${isStale(showCardPrecinct) ? 'text-gray-500' : 'text-purple-600'}`} /><p className="text-sm text-gray-600">Activity Level</p></div>
                            <p className={`text-lg font-bold ${isStale(showCardPrecinct) ? 'text-gray-600' : 'text-purple-700'}`}>{showCardPrecinct.activity_level}</p>
                          </div>
                          <div className={`bg-gradient-to-br rounded-lg p-3 border ${isStale(showCardPrecinct) ? 'from-gray-50 to-gray-100 border-gray-300' : 'from-teal-50 to-teal-100 border-teal-200'}`}>
                            <div className="flex items-center gap-2 mb-1"><Wind className={`w-4 h-4 ${isStale(showCardPrecinct) ? 'text-gray-500' : 'text-teal-600'}`} /><p className="text-sm text-gray-600">Wind Speed</p></div>
                            <p className={`text-lg font-bold ${isStale(showCardPrecinct) ? 'text-gray-600' : 'text-teal-700'}`}>{showCardPrecinct.wind_speed !== null ? `${showCardPrecinct.wind_speed} m/s` : 'N/A'}</p>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleWantToGo(showCard)}
                          className="w-full py-3 bg-gradient-to-r from-teal-500 to-cyan-600 text-white font-semibold rounded-lg hover:from-teal-600 hover:to-cyan-700 transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2"
                        >
                          <img src={ideaIcon} alt="" className="h-4 w-4 object-contain" aria-hidden="true" />
                          <span>Best time & travel suggestion</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}

            {/* ── Compare Tab (unchanged) ── */}
            {activeTab === "compare" && (
              <>
                <div className="p-6 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg shadow-lg">
                      <Map className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex-1">
                      <h2 className="text-2xl font-semibold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">Precinct Comparison</h2>
                      <p className="text-sm text-gray-600">Click two markers on the map to compare their data</p>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 px-4 sm:px-6 pb-6">
                  <div className="sm:flex-[3] relative">
                    <div className="absolute top-4 right-4 bg-white/95 backdrop-blur rounded-lg shadow-lg p-4 z-30 pointer-events-none border border-gray-200">
                      <h3 className="font-semibold mb-3 text-sm">Comfort Levels</h3>
                      <div className="space-y-2">
                        <div className="flex items-center gap-2"><div className="w-4 h-4 rounded-full bg-green-500" /><span className="text-xs font-medium">Comfortable (70–100)</span></div>
                        <div className="flex items-center gap-2"><div className="w-4 h-4 rounded-full bg-yellow-500" /><span className="text-xs font-medium">Caution (40–69)</span></div>
                        <div className="flex items-center gap-2"><div className="w-4 h-4 rounded-full bg-red-500" /><span className="text-xs font-medium">High Risk (0–39)</span></div>
                      </div>
                    </div>
                    <LeafletMap
                      precincts={precinctList}
                      selectedCategory={null}
                      activeMode="compare"
                      compareSelection1={compareSelection1}
                      compareSelection2={compareSelection2}
                      onPrecinctClick={handleCompareClick}
                      showInteractiveAreas={false}
                      showEasePlaces={false}
                      showStreetFacilities={false}
                      showNaturalPlaces={false}
                    />
                  </div>

                  <div className="sm:flex-[2]">
                    {!compareSelection1 && !compareSelection2 ? (
                      <div className="flex items-center justify-center h-full bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                        <div className="text-center p-6">
                          <div className="text-4xl mb-4">👆</div>
                          <h3 className="text-lg font-semibold text-gray-700 mb-2">Select Two Areas</h3>
                          <p className="text-sm text-gray-500">Click markers on the map to select areas to compare</p>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4 mb-6">
                          {([
                            { id: compareSelection1, num: 1, color: 'blue' },
                            { id: compareSelection2, num: 2, color: 'purple' },
                          ] as const).map(({ id, num, color }) => {
                            if (!id) return (
                              <div key={num} className="flex items-center justify-center h-48 bg-gray-50 rounded-xl border-2 border-dashed border-gray-300">
                                <p className="text-sm text-gray-400">Select area {num}</p>
                              </div>
                            );
                            const p = precincts[id];
                            if (!p) return null;
                            const risk = riskLevel(p.comfort_label);
                            const stale = isStale(p);
                            const hasRecommendation = betterPrecinctId !== null;
                            const isRecommendedCard = betterPrecinctId === id;
                            return (
                              <div
                                key={num}
                                className={`border-2 rounded-xl p-4 shadow-lg bg-gradient-to-br from-white to-gray-50 relative transition-all duration-300 ${
                                  hasRecommendation
                                    ? (isRecommendedCard ? 'scale-[1.03] ring-2 ring-green-400' : 'scale-[0.90] opacity-85')
                                    : ''
                                }`}
                                style={{ borderColor: stale ? '#9ca3af' : getRiskColor(risk) }}
                              >
                                {betterPrecinctId === id && (
                                  <div className="absolute -top-3 -right-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white px-3 py-1.5 rounded-full text-xs font-bold shadow-lg flex items-center gap-1">
                                    <span>✓</span><span>Better</span>
                                  </div>
                                )}
                                {stale && (
                                  <div
                                    className={`absolute w-5 h-5 bg-red-500 rounded-full flex items-center justify-center text-white text-xs font-bold border-2 border-white ${
                                      isRecommendedCard ? 'top-2 right-2' : '-top-2 -right-2'
                                    }`}
                                  >
                                    !
                                  </div>
                                )}
                                <div className="mb-3">
                                  <div className="flex items-center gap-2 mb-1">
                                    <div className={`w-6 h-6 rounded-full bg-${color}-500 flex items-center justify-center text-white text-xs font-bold`}>{num}</div>
                                    <h3 className="font-bold text-sm truncate">{p.name}</h3>
                                  </div>
                                  <p className="text-sm text-gray-500 mt-1 ml-8">{formatDetailSensorStatus(p)}</p>
                                </div>
                                <div className={`mb-3 p-3 rounded-lg border ${stale ? 'bg-gray-50' : 'bg-white'}`}>
                                  <div className="mb-1 flex items-center">
                                    <p className="text-xs text-gray-600">Comfort Score</p>
                                    <ComfortScoreInfo placement="right" />
                                  </div>
                                  <p className={`text-3xl font-bold ${stale ? 'text-gray-400' : ''}`} style={{ color: stale ? undefined : getRiskColor(risk) }}>{p.comfort_score}</p>
                                </div>
                                <div className="space-y-2">
                                  <div className="bg-orange-50 rounded p-2 border border-orange-200">
                                    <div className="flex items-center gap-1 mb-1"><Thermometer className="w-3 h-3 text-orange-600" /><p className="text-[10px] text-gray-600">Temperature</p></div>
                                    <p className="text-sm font-bold text-orange-700">{p.temperature !== null ? `${p.temperature}°C` : 'N/A'}</p>
                                    <p className="text-[10px] text-gray-500 mt-1">Recommended: 18-26°C</p>
                                  </div>
                                  <div className="bg-blue-50 rounded p-2 border border-blue-200">
                                    <div className="flex items-center gap-1 mb-1"><Droplets className="w-3 h-3 text-blue-600" /><p className="text-[10px] text-gray-600">Humidity</p></div>
                                    <p className="text-sm font-bold text-blue-700">{p.humidity !== null ? `${p.humidity}%` : 'N/A'}</p>
                                    <p className="text-[10px] text-gray-500 mt-1">Recommended: 40-60%</p>
                                  </div>
                                  <div className="bg-purple-50 rounded p-2 border border-purple-200">
                                    <div className="flex items-center gap-1 mb-1"><Users className="w-3 h-3 text-purple-600" /><p className="text-[10px] text-gray-600">Activity</p></div>
                                    <p className="text-sm font-bold text-purple-700">{p.activity_level}</p>
                                    <p className="text-[10px] text-gray-500 mt-1">Recommended: Low / Medium</p>
                                  </div>
                                  <div className="bg-teal-50 rounded p-2 border border-teal-200">
                                    <div className="flex items-center gap-1 mb-1"><Wind className="w-3 h-3 text-teal-600" /><p className="text-[10px] text-gray-600">Wind</p></div>
                                    <p className="text-sm font-bold text-teal-700">{p.wind_speed !== null ? `${p.wind_speed} m/s` : 'N/A'}</p>
                                    <p className="text-[10px] text-gray-500 mt-1">Recommended: 2-8 m/s</p>
                                  </div>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => handleWantToGo(id)}
                                  className="w-full mt-3 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 transition-colors shadow-md flex items-center justify-center gap-2"
                                >
                                  <img src={ideaIcon} alt="" className="h-4 w-4 object-contain" aria-hidden="true" />
                                  <span>Best time & travel suggestion</span>
                                </button>
                              </div>
                            );
                          })}
                        </div>

                        {compareSelection1 && compareSelection2 && comparisonRecommendation && (
                          <div className="relative z-20 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-4 border-l-4 border-blue-500 shadow-sm">
                            <div className="flex items-start gap-3">
                              <div className="flex-shrink-0 w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center">
                                <img src={ideaIcon} alt="" className="h-5 w-5 object-contain" aria-hidden="true" />
                              </div>
                              <div className="flex-1">
                                <h3 className="font-bold text-sm mb-1 text-blue-900">Recommendation</h3>
                                <p className="text-sm text-gray-700">{comparisonRecommendation.base}</p>
                                {comparisonRecommendation.staleWarning && (
                                  <div className="mt-1 flex items-start gap-2">
                                    <img src={warningIcon} alt="" className="h-4 w-4 object-contain mt-0.5" aria-hidden="true" />
                                    <p className="text-sm font-bold text-red-700">{comparisonRecommendation.staleWarning}</p>
                                  </div>
                                )}
                                {comparisonRecommendation.nonOptimalNotice && (
                                  <div className="mt-1 flex items-start gap-2">
                                    <img src={warningIcon} alt="" className="h-4 w-4 object-contain mt-0.5" aria-hidden="true" />
                                    <p className="text-sm font-bold text-amber-700">{comparisonRecommendation.nonOptimalNotice}</p>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
