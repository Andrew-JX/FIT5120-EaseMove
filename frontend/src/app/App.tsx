import { useState, useCallback, useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router";
import {
  Thermometer, Droplets, Users, X, Wind, Map, ArrowLeft,
  Layers, List, Plus, Minus, ZoomIn, Snowflake, Tag,
  ChevronDown, ChevronUp, ThermometerSun, Sun, Moon, Clock, Lightbulb,
  Eye, TrendingUp, Star, MapPin,
} from "lucide-react";
import { LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import L from "leaflet";
import logo from "../assets/logo-transparent.png";
import ideaIcon from "../assets/idea.png";
import questionMarkIcon from "../assets/question-mark.png";
import warningIcon from "../assets/warning.png";
import AppTopNav from "../components/AppTopNav";
import LeafletMap from "../components/LeafletMap";
import EasePlacesDetailPopup from "../components/map/EasePlacesDetailPopup";
import DynamicLegendPanel from "../components/map/DynamicLegendPanel";
import MapGuideDialog from "../components/map/MapGuideDialog";
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
import {
  getAreaInfo,
  getAreaRecommendation,
  type AreaComfortRoute,
} from "../lib/areaInfo";
import { type EasePlacesFeature } from "../lib/easePlaces";
import { APP_ROUTES } from "../lib/navigation";
import AreaDetailPage from "../pages/AreaDetailPage";
import RecommendationFacilitiesPage from "../pages/RecommendationFacilitiesPage";
let hasAutoShownMapGuideThisRuntime = false;

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

function getAreaIdFromSearch(search: string): string | null {
  const areaId = new URLSearchParams(search).get("area");
  return getAreaInfo(areaId)?.id ?? null;
}

function getRecommendationIdFromSearch(search: string): string | null {
  const params = new URLSearchParams(search);
  const areaId = params.get("area");
  const recommendationId = params.get("place");
  return getAreaRecommendation(areaId, recommendationId)?.id ?? null;
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
  if (category.includes('Food') || category.includes('Dining')) return 'cp-dot cp-dot-food';
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

function SensorStatusBadge({
  children,
  tone = 'neutral',
  pulse = false,
  invisible = false,
}: {
  children: React.ReactNode;
  tone?: 'neutral' | 'success' | 'error';
  pulse?: boolean;
  invisible?: boolean;
}) {
  const toneClass =
    tone === 'success'
      ? 'border-[#83c5be]/38 text-[#17413f]'
      : tone === 'error'
        ? 'border-[#e29578]/38 text-[#8f3d24]'
        : 'border-[#17413f]/10 text-[#5f8682]';

  return (
    <div
      className={`inline-flex min-h-10 items-center gap-2 rounded-full border px-4 text-xs font-semibold shadow-[inset_0_1px_0_rgba(255,255,255,0.6),0_12px_28px_rgba(16,32,31,0.08)] backdrop-blur-md ${
        invisible ? 'invisible' : ''
      } ${toneClass}`}
      style={{
        background:
          'radial-gradient(circle at 18% 0%, rgba(255,255,255,0.4), transparent 38%), linear-gradient(135deg, rgba(255,255,255,0.72), rgba(237,246,249,0.52))',
      }}
    >
      <span
        className={`h-2.5 w-2.5 rounded-full ${
          tone === 'success' ? 'bg-green-500' : tone === 'error' ? 'bg-[#e29578]' : 'bg-[#83c5be]'
        } ${pulse ? 'animate-pulse' : ''}`}
      />
      <span className="whitespace-nowrap">{children}</span>
    </div>
  );
}

function SensorStatusRow({
  loading,
  error,
}: {
  loading: boolean;
  error: string | null;
  }) {
    return (
      <div className="flex shrink-0 items-center justify-end gap-2 whitespace-nowrap">
        <div className="w-[126px] shrink-0 sm:w-[174px]">
          {loading ? (
            <SensorStatusBadge tone="neutral" pulse>
              Loading sensors...
          </SensorStatusBadge>
        ) : error ? (
          <SensorStatusBadge tone="error">
            Sensor load issue
          </SensorStatusBadge>
        ) : (
          <SensorStatusBadge invisible>
            Loading sensors...
          </SensorStatusBadge>
        )}
      </div>
      <SensorStatusBadge tone="success" pulse>
        Live sensors
      </SensorStatusBadge>
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
            {feature.reviewSource ? (
              <div className="cpp-detail-row">
                <span className="cpp-detail-label">Recommended by</span>
                <span className="cpp-detail-value">{feature.reviewSource}</span>
              </div>
            ) : null}
            {feature.reviewNote ? (
              <div className="cpp-detail-row">
                <span className="cpp-detail-label">Why it stands out</span>
                <span className="cpp-detail-value">{feature.reviewNote}</span>
              </div>
            ) : null}
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

export default function App({ mode }: { mode: "view" | "compare" }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [weights, setWeights] = useState<ComfortWeights>(() => loadWeights());
  const [debouncedWeights, setDebouncedWeights] = useState<ComfortWeights>(weights);
  const activeTab = mode;
  const [selectedAreaId, setSelectedAreaId] = useState<string | null>(() =>
    getAreaIdFromSearch(location.search)
  );
  const [selectedRecommendationId, setSelectedRecommendationId] = useState<string | null>(
    () => getRecommendationIdFromSearch(location.search)
  );
  const [mapFilters, setMapFilters] = useState<MapFilters>({
    easePlaces: false,
    comfortArea: true,
    streetFacilities: false,
    naturalPlaces: false,
  });
  const [showMapGuide, setShowMapGuide] = useState(false);
  const shouldFetchPrecincts = activeTab === 'compare' || mapFilters.comfortArea;

  const { precincts: precinctList, loading, error } = usePrecincts(
    shouldFetchPrecincts ? debouncedWeights : undefined
  );

  const precincts: Record<string, Precinct> = Object.fromEntries(
    precinctList.map((p: Precinct) => [p.id, p])
  );

  const [showCard, setShowCard] = useState<string | null>(null);
  // Left sidebar starts collapsed — only relevant when Comfort Area filter is enabled
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [compareSelection1, setCompareSelection1] = useState<string | null>(null);
  const [compareSelection2, setCompareSelection2] = useState<string | null>(null);

  // Right panel: 'layers' | 'legend' | null — mutually exclusive
  const [openPanel, setOpenPanel] = useState<'layers' | 'legend' | null>('legend');

  // Ease Places popup
  const [easePlacesPopup, setEasePlacesPopup] = useState<{
    feature: EasePlacesFeature;
    point: { x: number; y: number };
    viewport: { width: number; height: number };
  } | null>(null);

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
    navigate(APP_ROUTES.home);
  }, [navigate]);

  const handleAreaNavigation = useCallback((
    areaId: string | null,
    recommendationId: string | null = null
  ) => {
    const params = new URLSearchParams(location.search);
    const pathname = location.pathname;
    if (areaId) params.set("area", areaId);
    else params.delete("area");
    if (areaId && recommendationId) params.set("place", recommendationId);
    else params.delete("place");
    const nextSearch = params.toString();
    const nextUrl = `${pathname}${nextSearch ? `?${nextSearch}` : ""}`;
    const currentUrl = `${pathname}${location.search}`;
    if (nextUrl === currentUrl) {
      setSelectedAreaId(areaId);
      setSelectedRecommendationId(recommendationId);
      return;
    }
    navigate(nextUrl);
  }, [location.pathname, location.search, navigate]);

  const categories = [
    { name: "Comfortable", level: "low",     color: "#22c55e", bgColor: "bg-green-100",  textColor: "text-green-800" },
    { name: "Caution",     level: "caution", color: "#eab308", bgColor: "bg-yellow-100", textColor: "text-yellow-800" },
    { name: "High Risk",   level: "high",    color: "#ef4444", bgColor: "bg-red-100",    textColor: "text-red-800" },
  ];

  useEffect(() => { saveWeights(weights); }, [weights]);

  useEffect(() => {
    setSelectedAreaId(getAreaIdFromSearch(location.search));
    setSelectedRecommendationId(getRecommendationIdFromSearch(location.search));
  }, [location.search]);

  useEffect(() => {
    if (
      activeTab === "view" &&
      !selectedAreaId &&
      !selectedRecommendationId &&
      !showTimeRecommendation &&
      !hasAutoShownMapGuideThisRuntime
    ) {
      hasAutoShownMapGuideThisRuntime = true;
      setShowMapGuide(true);
    }
  }, [
    activeTab,
    selectedAreaId,
    selectedRecommendationId,
    showTimeRecommendation,
  ]);

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

  const handleEasePlacesClick = useCallback((
    feature: EasePlacesFeature,
    point: { x: number; y: number },
    viewport: { width: number; height: number }
  ) => {
    setEasePlacesPopup({ feature, point, viewport });
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

  const guideTopPrecincts = [...precinctList]
    .sort((a, b) => {
      const staleDiff = Number(isStale(a)) - Number(isStale(b));
      if (staleDiff !== 0) return staleDiff;
      if (b.comfort_score !== a.comfort_score) return b.comfort_score - a.comfort_score;
      return a.name.localeCompare(b.name);
    })
    .slice(0, 5);

  const handleGuidePrecinctSelect = useCallback((precinct: Precinct) => {
    const params = new URLSearchParams({
      endLat: String(precinct.lat),
      endLng: String(precinct.lng),
      endName: precinct.name,
      autoLocateStart: "1",
    });
    setShowMapGuide(false);
    navigate(`${APP_ROUTES.map3dRoute}?${params.toString()}`);
  }, [navigate]);

  const handleComfortRouteSelect = useCallback((route: AreaComfortRoute) => {
    const params = new URLSearchParams({
      endLat: String(route.end.lat),
      endLng: String(route.end.lng),
      endName: route.end.name,
      routeName: route.title,
    });

    if (route.start) {
      params.set("startLat", String(route.start.lat));
      params.set("startLng", String(route.start.lng));
      params.set("startName", route.start.name);
    } else {
      params.set("autoLocateStart", "1");
    }

    navigate(`${APP_ROUTES.map3dRoute}?${params.toString()}`);
  }, [navigate]);

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
    const currentScore = destPrecinct?.comfort_score ?? 0;
    const currentTemp = destPrecinct?.temperature;
    const currentHumidity = destPrecinct?.humidity;
    const currentWind = destPrecinct?.wind_speed;
    const crowdLevel = destPrecinct?.activity_level ?? "Unknown";
    const currentStatus = todayData?.recommendation ?? (destPrecinct?.comfort_label === 'Comfortable'
      ? 'Excellent conditions right now.'
      : destPrecinct?.comfort_label === 'Caution'
        ? 'Conditions are elevated. Consider safer time windows.'
        : 'High risk conditions. Delay travel if possible.');

    const hourlyData = [
      { time: "6AM", score: Math.min(100, currentScore + 8), temp: currentTemp !== null && currentTemp !== undefined ? Math.max(8, currentTemp - 4) : 16, crowd: 24 },
      { time: "9AM", score: Math.min(100, currentScore + 4), temp: currentTemp !== null && currentTemp !== undefined ? Math.max(10, currentTemp - 2) : 18, crowd: 42 },
      { time: "12PM", score: Math.max(45, currentScore - 12), temp: currentTemp !== null && currentTemp !== undefined ? currentTemp + 2 : 24, crowd: 80 },
      { time: "3PM", score: Math.max(48, currentScore - 8), temp: currentTemp !== null && currentTemp !== undefined ? currentTemp + 3 : 25, crowd: 72 },
      { time: "6PM", score: Math.min(100, currentScore + 3), temp: currentTemp !== null && currentTemp !== undefined ? Math.max(10, currentTemp - 1) : 20, crowd: 44 },
      { time: "9PM", score: Math.max(52, currentScore - 10), temp: currentTemp !== null && currentTemp !== undefined ? Math.max(8, currentTemp - 5) : 16, crowd: 18 },
    ];

    const timeSlots = [
      {
        period: "Morning Golden Hour",
        time: "6:00 AM - 10:00 AM",
        score: Math.min(100, currentScore + 8),
        icon: <Sun className="w-7 h-7" />,
        image: "https://images.unsplash.com/photo-1494548162494-384bba4ab999?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080",
        reasons: [
          "Cooler temperatures usually reduce heat stress.",
          "Crowd density is typically lower in early hours.",
          "Better comfort window for walking and cycling.",
          "Lower exposure to peak daytime heat.",
        ],
        stats: [
          { label: "Temperature", value: currentTemp !== null && currentTemp !== undefined ? `${Math.max(8, currentTemp - 4)}-${Math.max(10, currentTemp - 2)}°C` : "15-18°C", icon: <ThermometerSun className="w-4 h-4" /> },
          { label: "Crowd", value: "Low", icon: <Users className="w-4 h-4" /> },
          { label: "Visibility", value: "Good", icon: <Eye className="w-4 h-4" /> },
        ],
      },
      {
        period: "Evening Sunset",
        time: "5:00 PM - 8:00 PM",
        score: Math.min(100, currentScore + 3),
        icon: <Moon className="w-7 h-7" />,
        image: "https://images.unsplash.com/photo-1542159919831-40fb0656b45a?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080",
        reasons: [
          "Temperature tends to drop from afternoon peaks.",
          "Crowds usually become more manageable.",
          "More relaxed travel conditions for casual routes.",
          "Lower heat exposure than midday.",
        ],
        stats: [
          { label: "Temperature", value: currentTemp !== null && currentTemp !== undefined ? `${Math.max(10, currentTemp - 1)}-${Math.max(8, currentTemp - 4)}°C` : "20-24°C", icon: <ThermometerSun className="w-4 h-4" /> },
          { label: "Crowd", value: "Medium", icon: <Users className="w-4 h-4" /> },
          { label: "Visibility", value: "Good", icon: <Eye className="w-4 h-4" /> },
        ],
      },
    ];

    const alternativeSlot = {
      period: "Midday",
      time: "12:00 PM - 2:00 PM",
      score: Math.max(45, currentScore - 12),
      note: "Usually hotter and busier than morning/evening windows.",
    };

    const preparations = [
      {
        icon: <ThermometerSun className="w-6 h-6" />,
        title: "Sun Protection",
        text: "Bring sunscreen, sunglasses, and a hat for stronger daytime heat exposure.",
        priority: "High",
      },
      {
        icon: <Droplets className="w-6 h-6" />,
        title: "Hydration",
        text: "Carry enough water and rehydrate before and during outdoor travel.",
        priority: "High",
      },
      {
        icon: <Wind className="w-6 h-6" />,
        title: "Layered Clothing",
        text: "Use breathable layers to adapt to temperature shifts across time periods.",
        priority: "Medium",
      },
      {
        icon: <Clock className="w-6 h-6" />,
        title: "Arrival Time",
        text: "Start earlier to avoid peak crowding and reduce midday heat exposure.",
        priority: "High",
      },
    ];

    return (
      <div className="min-h-screen bg-[#081515]">
        <div className="relative h-64 overflow-hidden">
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{ backgroundImage: "url('https://images.unsplash.com/photo-1562310503-a918c4c61e38?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1080')" }}
          >
            <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/40 to-transparent" />
          </div>

          <div className="relative z-10 px-4 py-6">
            <button
              type="button"
              onClick={() => { setShowTimeRecommendation(false); setSelectedDestId(null); setTodayData(null); }}
              className="flex items-center gap-2 text-white/90 hover:text-white mb-6 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              <span>Back</span>
            </button>

            <div className="max-w-4xl mx-auto">
              <div className="flex items-center gap-2 mb-2">
                <MapPin className="w-5 h-5 text-emerald-400" />
                <span className="text-emerald-400 text-sm font-medium">Destination</span>
              </div>
              <h1 className="text-3xl font-bold text-white mb-2">{destName}</h1>
              <p className="text-white/80 text-sm">Optimal time recommendations based on weather, crowd, and conditions</p>
            </div>
          </div>
        </div>

        <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">
          <div className="bg-gradient-to-br from-slate-800/90 to-slate-900/90 backdrop-blur-sm rounded-2xl border border-slate-700/50 overflow-hidden">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-white mb-1">Right Now</h2>
                  <p className="text-slate-400 text-sm">Current conditions at {destName}</p>
                </div>
                <Clock className="w-8 h-8 text-emerald-400" />
              </div>

              <div className="flex items-end gap-6 mb-8">
                <div>
                  <div className="text-7xl font-bold text-emerald-400">{currentScore}</div>
                  <div className="flex items-center gap-2 mt-2">
                    <Star className="w-5 h-5 text-yellow-400 fill-yellow-400" />
                    <span className="text-slate-300">{currentStatus}</span>
                  </div>
                </div>

                <div className="flex-1 pb-2">
                  <div className="text-sm text-slate-400 mb-2">Score Trend</div>
                  <div className="h-16">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={hourlyData}>
                        <defs>
                          <linearGradient id="scoreGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <Area type="monotone" dataKey="score" stroke="#10b981" strokeWidth={2} fill="url(#scoreGradient)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/30">
                  <div className="flex items-center gap-2 mb-2">
                    <ThermometerSun className="w-5 h-5 text-orange-400" />
                    <span className="text-slate-400 text-xs">Temperature</span>
                  </div>
                  <div className="text-2xl font-bold text-white">{currentTemp !== null && currentTemp !== undefined ? `${currentTemp}°C` : "N/A"}</div>
                </div>
                <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/30">
                  <div className="flex items-center gap-2 mb-2">
                    <Droplets className="w-5 h-5 text-blue-400" />
                    <span className="text-slate-400 text-xs">Humidity</span>
                  </div>
                  <div className="text-2xl font-bold text-white">{currentHumidity !== null && currentHumidity !== undefined ? `${currentHumidity}%` : "N/A"}</div>
                </div>
                <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/30">
                  <div className="flex items-center gap-2 mb-2">
                    <Wind className="w-5 h-5 text-cyan-400" />
                    <span className="text-slate-400 text-xs">Wind Speed</span>
                  </div>
                  <div className="text-2xl font-bold text-white">{currentWind !== null && currentWind !== undefined ? `${currentWind} m/s` : "N/A"}</div>
                </div>
                <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/30">
                  <div className="flex items-center gap-2 mb-2">
                    <Users className="w-5 h-5 text-purple-400" />
                    <span className="text-slate-400 text-xs">Crowd Level</span>
                  </div>
                  <div className="text-2xl font-bold text-white">{crowdLevel}</div>
                </div>
              </div>
            </div>

            <div className="px-6 pb-6">
              <div className="bg-slate-900/50 rounded-xl p-4 border border-slate-700/30">
                <h3 className="text-white font-semibold mb-4">Today's Forecast</h3>
                <ResponsiveContainer width="100%" height={120}>
                  <LineChart data={hourlyData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                    <XAxis dataKey="time" stroke="#94a3b8" style={{ fontSize: "12px" }} />
                    <YAxis stroke="#94a3b8" style={{ fontSize: "12px" }} />
                    <Tooltip contentStyle={{ backgroundColor: "#1e293b", border: "1px solid #334155", borderRadius: "8px" }} labelStyle={{ color: "#e2e8f0" }} />
                    <Line type="monotone" dataKey="score" stroke="#10b981" strokeWidth={2} dot={{ fill: "#10b981", r: 4 }} />
                    <Line type="monotone" dataKey="temp" stroke="#f59e0b" strokeWidth={2} dot={{ fill: "#f59e0b", r: 4 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          <div>
            <div className="flex items-center gap-3 mb-6">
              <TrendingUp className="w-6 h-6 text-emerald-400" />
              <h2 className="text-2xl font-bold text-white">Recommended Time Slots</h2>
            </div>

            <div className="space-y-6">
              {timeSlots.map((slot) => (
                <div key={slot.period} className="group bg-slate-800/90 backdrop-blur-sm rounded-2xl border border-slate-700/50 overflow-hidden hover:border-emerald-500/50 transition-all cursor-pointer">
                  <div className="grid md:grid-cols-5 gap-0">
                    <div className="md:col-span-2 relative h-64 md:h-auto overflow-hidden">
                      <img src={slot.image} alt={slot.period} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent to-slate-800/90" />
                      <div className="absolute top-4 left-4 bg-emerald-500 text-white px-4 py-2 rounded-full font-bold text-lg">
                        Score: {slot.score}
                      </div>
                    </div>

                    <div className="md:col-span-3 p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className="p-3 bg-emerald-500/20 rounded-xl text-emerald-400">{slot.icon}</div>
                          <div>
                            <h3 className="text-xl font-bold text-white">{slot.period}</h3>
                            <p className="text-slate-400">{slot.time}</p>
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-3 mb-4">
                        {slot.stats.map((stat) => (
                          <div key={stat.label} className="bg-slate-900/50 rounded-lg p-3 border border-slate-700/30">
                            <div className="flex items-center gap-2 text-slate-400 mb-1">
                              {stat.icon}
                              <span className="text-xs">{stat.label}</span>
                            </div>
                            <div className="text-white font-semibold text-sm">{stat.value}</div>
                          </div>
                        ))}
                      </div>

                      <div className="space-y-2">
                        {slot.reasons.map((reason) => (
                          <div key={reason} className="flex items-start gap-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-1.5 shrink-0" />
                            <span className="text-slate-300 text-sm">{reason}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              ))}

              <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700/30 p-5">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Clock className="w-5 h-5 text-slate-400" />
                      <span className="font-semibold text-white">{alternativeSlot.period}</span>
                    </div>
                    <div className="text-sm text-slate-400 mb-1">{alternativeSlot.time}</div>
                    <div className="text-xs text-slate-500">{alternativeSlot.note}</div>
                  </div>
                  <div className="text-3xl font-bold text-slate-400">{alternativeSlot.score}</div>
                </div>
              </div>
            </div>
          </div>

          <div className="pb-8">
            <div className="flex items-center gap-3 mb-6">
              <Lightbulb className="w-6 h-6 text-yellow-400" />
              <h2 className="text-2xl font-bold text-white">Preparation Advice</h2>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              {preparations.map((prep) => (
                <div key={prep.title} className="bg-slate-800/90 backdrop-blur-sm rounded-xl border border-slate-700/50 p-5 hover:border-emerald-500/50 transition-colors">
                  <div className="flex items-start gap-4">
                    <div className="p-3 bg-gradient-to-br from-emerald-500/20 to-cyan-500/20 rounded-xl text-emerald-400 shrink-0">
                      {prep.icon}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-semibold text-white">{prep.title}</h3>
                        <span className={`text-xs px-2 py-1 rounded-full ${prep.priority === "High" ? "bg-red-500/20 text-red-400" : "bg-yellow-500/20 text-yellow-400"}`}>
                          {prep.priority}
                        </span>
                      </div>
                      <p className="text-sm text-slate-300">{prep.text}</p>
                    </div>
                  </div>
                </div>
              ))}
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
  const selectedRecommendation = getAreaRecommendation(selectedAreaId, selectedRecommendationId);

  if (selectedArea && selectedRecommendation) {
    return (
      <RecommendationFacilitiesPage
        area={selectedArea}
        recommendation={selectedRecommendation}
        onBack={() => handleAreaNavigation(selectedArea.id, null)}
      />
    );
  }

  if (selectedArea) {
    return (
      <AreaDetailPage
        area={selectedArea}
        onBack={() => handleAreaNavigation(null)}
        onRecommendationClick={(recommendationId) =>
          handleAreaNavigation(selectedArea.id, recommendationId)
        }
        onComfortRouteClick={handleComfortRouteSelect}
      />
    );
  }

  return (
    <div className="relative min-h-[100dvh] overflow-hidden bg-[#f7fbfa] text-[#10201f]">
      <MapGuideDialog
        open={showMapGuide}
        onOpenChange={setShowMapGuide}
        topPrecincts={guideTopPrecincts}
        loading={loading}
        onPrecinctSelect={handleGuidePrecinctSelect}
      />

      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute inset-0 bg-[linear-gradient(180deg,#122d2b_0%,#edf8f5_17%,#f7fbfa_74%,#dfeee9_100%)]" />
        <div className="absolute inset-x-0 top-0 h-[26vh] bg-[radial-gradient(circle_at_50%_0%,rgba(131,197,190,0.26),transparent_62%)]" />
        <div className="absolute inset-x-0 bottom-0 h-[24vh] bg-[radial-gradient(circle_at_50%_100%,rgba(23,65,63,0.14),transparent_66%)]" />
        <div className="absolute -top-36 -right-28 h-80 w-80 rounded-full bg-[#83c5be]/10 blur-3xl" />
        <div className="absolute -bottom-44 -left-24 h-96 w-96 rounded-full bg-[#83c5be]/12 blur-3xl" />
      </div>

      {/* Nav */}
        <nav className="relative z-[130] mb-0 px-4 pt-4 sm:px-6">
          <div className="w-full rounded-t-[26px] rounded-b-none border border-white/36 border-b-0 bg-[radial-gradient(circle_at_18%_0%,rgba(255,255,255,0.42),transparent_36%),linear-gradient(135deg,rgba(247,250,251,0.84),rgba(232,238,241,0.66))] px-4 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.6),0_18px_40px_rgba(56,71,77,0.08)] backdrop-blur-md sm:px-6 sm:py-4">
            <div className="flex flex-nowrap items-center justify-between gap-3 max-[720px]:gap-2">
              <button
                type="button"
                className="relative h-16 w-60 shrink-0 max-w-full overflow-hidden cursor-pointer border-0 bg-transparent p-0 max-[980px]:h-14 max-[980px]:w-52 max-[720px]:h-12 max-[720px]:w-40"
                onClick={handleBrandClick}
                aria-label="Return to EaseMove landing"
              >
                <img
                  src={logo}
                  alt="EaseMove logo"
                  className="pointer-events-none absolute left-0 top-1/2 h-60 w-60 -translate-y-1/2 object-contain max-[980px]:h-56 max-[980px]:w-56 max-[720px]:h-44 max-[720px]:w-44"
                />
              </button>
              <div className="map-nav-status-shell ml-auto flex min-w-0 shrink-0 items-center justify-end gap-2 sm:gap-3">
                <AppTopNav variant="app" className="app-map-top-nav" />
                <SensorStatusRow loading={loading} error={error} />
                {loading && <span className="text-sm text-gray-400 animate-pulse">Loading sensors…</span>}
                {error && <span className="text-sm text-red-500">⚠ {error}</span>}
                <div className="hidden shrink-0 items-center gap-2 text-xs text-gray-500">
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                Live sensors
              </div>
            </div>
          </div>
        </div>
      </nav>

      {/* Main */}
      <div className="relative z-10 px-4 pb-4 sm:px-6">
        <div className="grid grid-cols-1 gap-6">
          <div className="-mt-px overflow-hidden rounded-b-[28px] rounded-t-none border border-white/36 border-t-0 bg-[radial-gradient(circle_at_18%_0%,rgba(255,255,255,0.42),transparent_36%),linear-gradient(135deg,rgba(247,250,251,0.84),rgba(232,238,241,0.66))] shadow-[0_24px_60px_rgba(16,32,31,0.14)] backdrop-blur-md" id="map-container">

            {/* Tabs */}
            <div className="border-b border-[#17413f]/10 bg-[radial-gradient(circle_at_18%_0%,rgba(255,255,255,0.36),transparent_38%),linear-gradient(180deg,rgba(255,255,255,0.08),rgba(255,255,255,0.02))]">
              <div className="flex items-center justify-between px-6 pt-4">
                <div className="flex items-center">
                  {(['view', 'compare'] as const).map(tab => (
                    <button
                      type="button"
                      key={tab}
                      onClick={() => {
                        setShowCard(null);
                        navigate(tab === "view" ? APP_ROUTES.map : APP_ROUTES.compare);
                      }}
                      className={`px-6 py-3 font-medium text-sm transition-all relative ${activeTab === tab ? 'text-[#006d77]' : 'text-[#5f8682] hover:text-[#17413f]'}`}
                    >
                      {tab.charAt(0).toUpperCase() + tab.slice(1)}
                      {activeTab === tab && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#006d77]" />}
                    </button>
                  ))}
                </div>
                {activeTab === "view" && (
                  <button
                    type="button"
                    onClick={() => setShowMapGuide(true)}
                    className="mb-2 inline-flex items-center gap-2 rounded-xl border border-[#83c5be]/28 bg-[rgba(247,255,253,0.94)] px-4 py-2 text-sm font-semibold text-[#17413f] shadow-[0_12px_28px_rgba(16,32,31,0.08)] transition-all hover:border-[#83c5be]/52 hover:bg-white hover:shadow-[0_16px_34px_rgba(16,32,31,0.12)]"
                    aria-label="Open map tips"
                    title="Open tips"
                  >
                    <img src={ideaIcon} alt="" className="h-4 w-4 object-contain" aria-hidden="true" />
                    <span>Tips</span>
                  </button>
                )}
              </div>
            </div>

            {/* ── View Tab ── */}
            {activeTab === "view" && (
              <>
                <div className="p-6 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-gradient-to-br from-[#006d77] to-[#17413f] rounded-2xl shadow-lg">
                      <Map className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex-1">
                      <h2 className="text-2xl font-semibold bg-gradient-to-r from-[#17413f] to-[#006d77] bg-clip-text text-transparent">
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
                    className={`border-r border-[#17413f]/8 bg-[linear-gradient(180deg,rgba(237,246,249,0.92),rgba(247,251,250,0.86))] transition-all duration-300 overflow-x-hidden overflow-y-auto ${
                      sidebarCollapsed || !mapFilters.comfortArea ? 'w-0' : 'w-56'
                    }`}
                    style={{ height: "clamp(420px, calc(100vh - 230px), 680px)" }}
                  >
                    <div className="p-4 w-56">
                      <h3 className="font-semibold mb-3 text-sm text-[#17413f]">Filter by Comfort</h3>
                      <div className="space-y-2 map-legend-items">
                        {categories.map(cat => (
                          <button
                            type="button"
                            key={cat.name}
                            onClick={() => setSelectedCategory(selectedCategory === cat.level ? null : cat.level)}
                            className={`w-full text-left px-4 py-3 rounded-lg flex items-center gap-3 transition-all border-2 ${
                              selectedCategory === cat.level
                                ? `${cat.bgColor} ${cat.textColor} shadow-lg scale-105 font-semibold`
                                : 'bg-white/78 hover:bg-white text-[#294745] border-[#17413f]/10'
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

                      <div className="mt-5 border-t border-[#17413f]/10 pt-4">
                        <div className="flex items-center justify-between mb-3">
                          <h3 className="font-semibold text-sm text-[#17413f]">Comfort Preferences</h3>
                          <button
                            type="button"
                            onClick={() => setWeights(DEFAULT_WEIGHTS)}
                            className="text-xs font-semibold text-[#006d77] hover:text-[#17413f]"
                          >
                            Reset
                          </button>
                        </div>
                        {([
                          ['temperature', 'Temperature'],
                          ['humidity', 'Humidity'],
                          ['activity', 'Crowd Density'],
                        ] as const).map(([key, label]) => (
                          <label key={key} className="block mb-3">
                            <div className="flex items-center justify-between text-xs text-[#5f8682] mb-1">
                              <span>{label}</span>
                              <span className="font-bold text-[#17413f]">{weights[key]}%</span>
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
                        <p className="text-[11px] leading-4 text-[#5f8682]">
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
                        className="absolute top-20 left-4 z-30 bg-[rgba(247,255,253,0.94)] hover:bg-white shadow-[0_16px_36px_rgba(4,14,14,0.18)] rounded-2xl border border-[#83c5be]/20 p-2 transition-colors text-[#17413f]"
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
                      <DynamicLegendPanel filters={mapFilters} />
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
                      <EasePlacesDetailPopup
                        feature={easePlacesPopup.feature}
                        anchorPoint={easePlacesPopup.point}
                        viewport={easePlacesPopup.viewport}
                        onClose={() => setEasePlacesPopup(null)}
                        onZoomTo={handleZoomTo}
                      />
                    )}

                    {/* Comfort Area detail card */}
                    {showCard && showCardPrecinct && mapFilters.comfortArea && (
                      <div className="fixed bottom-0 left-0 right-0 sm:absolute sm:bottom-4 sm:left-4 sm:right-auto sm:w-96 sm:max-h-[calc(100%-2rem)] bg-[rgba(247,255,253,0.98)] backdrop-blur-md rounded-t-[28px] sm:rounded-[24px] shadow-[0_28px_72px_rgba(4,14,14,0.24)] p-4 sm:p-5 z-[500] border-t border-[#83c5be]/18 max-h-[60vh] overflow-y-auto text-[#10201f]">
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
                          <div className="mb-4 p-3 bg-[#fff5f3] border border-[#e29578]/36 rounded-2xl">
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
                          <div className="mb-4 p-3 bg-[#edf6f9] border border-[#83c5be]/36 rounded-2xl">
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
                          className={`mb-4 p-4 bg-gradient-to-r rounded-2xl border ${isStale(showCardPrecinct) ? 'from-gray-50 to-gray-100' : 'from-[#edf6f9] to-[#e3f3ef]'}`}
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
                          <div className={`bg-gradient-to-br rounded-2xl p-3 border ${isStale(showCardPrecinct) ? 'from-gray-50 to-gray-100 border-gray-300' : 'from-[#fff3eb] to-[#fff8f3] border-[#e29578]/24'}`}>
                            <div className="flex items-center gap-2 mb-1"><Thermometer className={`w-4 h-4 ${isStale(showCardPrecinct) ? 'text-gray-500' : 'text-orange-600'}`} /><p className="text-sm text-gray-600">Temperature</p></div>
                            <p className={`text-xl font-bold ${isStale(showCardPrecinct) ? 'text-gray-600' : 'text-orange-700'}`}>{showCardPrecinct.temperature !== null ? `${showCardPrecinct.temperature}°C` : 'N/A'}</p>
                          </div>
                          <div className={`bg-gradient-to-br rounded-2xl p-3 border ${isStale(showCardPrecinct) ? 'from-gray-50 to-gray-100 border-gray-300' : 'from-[#edf6f9] to-[#f3fbf8] border-[#83c5be]/24'}`}>
                            <div className="flex items-center gap-2 mb-1"><Droplets className={`w-4 h-4 ${isStale(showCardPrecinct) ? 'text-gray-500' : 'text-blue-600'}`} /><p className="text-sm text-gray-600">Humidity</p></div>
                            <p className={`text-xl font-bold ${isStale(showCardPrecinct) ? 'text-gray-600' : 'text-blue-700'}`}>{showCardPrecinct.humidity !== null ? `${showCardPrecinct.humidity}%` : 'N/A'}</p>
                          </div>
                          <div className={`bg-gradient-to-br rounded-2xl p-3 border ${isStale(showCardPrecinct) ? 'from-gray-50 to-gray-100 border-gray-300' : 'from-[#f5f8f8] to-[#eef8f5] border-[#83c5be]/20'}`}>
                            <div className="flex items-center gap-2 mb-1"><Users className={`w-4 h-4 ${isStale(showCardPrecinct) ? 'text-gray-500' : 'text-purple-600'}`} /><p className="text-sm text-gray-600">Crowd Density</p></div>
                            <p className={`text-lg font-bold ${isStale(showCardPrecinct) ? 'text-gray-600' : 'text-purple-700'}`}>{showCardPrecinct.activity_level}</p>
                          </div>
                          <div className={`bg-gradient-to-br rounded-2xl p-3 border ${isStale(showCardPrecinct) ? 'from-gray-50 to-gray-100 border-gray-300' : 'from-[#eef8f5] to-[#edf6f9] border-[#83c5be]/24'}`}>
                            <div className="flex items-center gap-2 mb-1"><Wind className={`w-4 h-4 ${isStale(showCardPrecinct) ? 'text-gray-500' : 'text-teal-600'}`} /><p className="text-sm text-gray-600">Wind Speed</p></div>
                            <p className={`text-lg font-bold ${isStale(showCardPrecinct) ? 'text-gray-600' : 'text-teal-700'}`}>{showCardPrecinct.wind_speed !== null ? `${showCardPrecinct.wind_speed} m/s` : 'N/A'}</p>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleWantToGo(showCard)}
                          className="w-full py-3 bg-gradient-to-r from-[#006d77] to-[#17413f] text-white font-semibold rounded-2xl hover:from-[#17413f] hover:to-[#006d77] transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2"
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
                    <div className="p-3 bg-gradient-to-br from-[#17413f] to-[#0f2524] rounded-2xl shadow-lg">
                      <Map className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex-1">
                      <h2 className="text-2xl font-semibold bg-gradient-to-r from-[#17413f] to-[#006d77] bg-clip-text text-transparent">Precinct Comparison</h2>
                      <p className="text-sm text-gray-600">Click two markers on the map to compare their data</p>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 px-4 sm:px-6 pb-6">
                  <div className="sm:flex-[3] relative">
                    <div className="absolute top-4 right-4 bg-[rgba(247,255,253,0.82)] backdrop-blur-md rounded-2xl shadow-[0_16px_34px_rgba(16,32,31,0.12)] p-4 z-30 pointer-events-none border border-[#83c5be]/16 text-[#10201f]">
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
                    <button
                      type="button"
                      onClick={() => navigate(APP_ROUTES.map3dRoute)}
                      className="mb-4 w-full rounded-[20px] border border-[#83c5be]/28 bg-[rgba(247,255,253,0.92)] px-4 py-3 text-left shadow-[0_14px_36px_rgba(4,14,14,0.12)] transition-colors hover:bg-white"
                    >
                      <span className="block text-xs font-semibold uppercase tracking-[0.18em] text-[#5f8682]">
                        3D Route
                      </span>
                      <span className="mt-1 block text-base font-semibold text-[#17413f]">
                        Preview a walking or cycling route in 3D
                      </span>
                      <span className="mt-1 block text-sm text-[#456765]">
                        Keep the original compare map unchanged while planning a default route on a dedicated page.
                      </span>
                    </button>
                    {!compareSelection1 && !compareSelection2 ? (
                      <div className="flex items-center justify-center h-full bg-[rgba(237,246,249,0.82)] rounded-[24px] border border-dashed border-[#83c5be]/34">
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
                                className={`border rounded-[24px] p-4 shadow-[0_18px_44px_rgba(4,14,14,0.16)] bg-gradient-to-br from-[rgba(247,255,253,0.96)] to-[rgba(237,246,249,0.92)] relative transition-all duration-300 ${
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
                                <div className={`mb-3 p-3 rounded-2xl border ${stale ? 'bg-gray-50' : 'bg-white/80'}`}>
                                  <div className="mb-1 flex items-center">
                                    <p className="text-xs text-gray-600">Comfort Score</p>
                                    <ComfortScoreInfo placement="right" />
                                  </div>
                                  <p className={`text-3xl font-bold ${stale ? 'text-gray-400' : ''}`} style={{ color: stale ? undefined : getRiskColor(risk) }}>{p.comfort_score}</p>
                                </div>
                                <div className="space-y-2">
                                  <div className="bg-[#fff3eb] rounded-xl p-2 border border-[#e29578]/24">
                                    <div className="flex items-center gap-1 mb-1"><Thermometer className="w-3 h-3 text-orange-600" /><p className="text-[10px] text-gray-600">Temperature</p></div>
                                    <p className="text-sm font-bold text-orange-700">{p.temperature !== null ? `${p.temperature}°C` : 'N/A'}</p>
                                    <p className="text-[10px] text-gray-500 mt-1">Recommended: 18-26°C</p>
                                  </div>
                                  <div className="bg-[#edf6f9] rounded-xl p-2 border border-[#83c5be]/24">
                                    <div className="flex items-center gap-1 mb-1"><Droplets className="w-3 h-3 text-blue-600" /><p className="text-[10px] text-gray-600">Humidity</p></div>
                                    <p className="text-sm font-bold text-blue-700">{p.humidity !== null ? `${p.humidity}%` : 'N/A'}</p>
                                    <p className="text-[10px] text-gray-500 mt-1">Recommended: 40-60%</p>
                                  </div>
                                  <div className="bg-[#f5f8f8] rounded-xl p-2 border border-[#83c5be]/18">
                                    <div className="flex items-center gap-1 mb-1"><Users className="w-3 h-3 text-purple-600" /><p className="text-[10px] text-gray-600">Crowd Density</p></div>
                                    <p className="text-sm font-bold text-purple-700">{p.activity_level}</p>
                                    <p className="text-[10px] text-gray-500 mt-1">Recommended: Low / Medium</p>
                                  </div>
                                  <div className="bg-[#eef8f5] rounded-xl p-2 border border-[#83c5be]/22">
                                    <div className="flex items-center gap-1 mb-1"><Wind className="w-3 h-3 text-teal-600" /><p className="text-[10px] text-gray-600">Wind</p></div>
                                    <p className="text-sm font-bold text-teal-700">{p.wind_speed !== null ? `${p.wind_speed} m/s` : 'N/A'}</p>
                                    <p className="text-[10px] text-gray-500 mt-1">Recommended: 2-8 m/s</p>
                                  </div>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => handleWantToGo(id)}
                                  className="w-full mt-3 py-2 bg-gradient-to-r from-[#006d77] to-[#17413f] text-white text-sm font-semibold rounded-2xl hover:from-[#17413f] hover:to-[#006d77] transition-colors shadow-md flex items-center justify-center gap-2"
                                >
                                  <img src={ideaIcon} alt="" className="h-4 w-4 object-contain" aria-hidden="true" />
                                  <span>Best time & travel suggestion</span>
                                </button>
                              </div>
                            );
                          })}
                        </div>

                        {compareSelection1 && compareSelection2 && comparisonRecommendation && (
                          <div className="relative z-20 bg-gradient-to-r from-[#edf6f9] to-[#eef8f5] rounded-[24px] p-4 border-l-4 border-[#006d77] shadow-sm text-[#10201f]">
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
