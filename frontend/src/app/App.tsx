import { useState, useCallback, useEffect, useRef, useLayoutEffect } from "react";
import { useLocation, useNavigate } from "react-router";
import { animate, utils } from "animejs";
import {
  Thermometer, Droplets, Users, X, Wind, Map, ArrowLeft,
  Layers, Plus, Minus, ZoomIn, Snowflake, Tag,
  ChevronDown, ChevronUp, ThermometerSun, Sun, Moon, Clock, Lightbulb,
  Eye, TrendingUp, TrendingDown, Star, MapPin, CheckCircle2, RefreshCw,
} from "lucide-react";
import { LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import L from "leaflet";
import ideaIcon from "../assets/idea.png";
import questionMarkIcon from "../assets/question-mark.png";
import warningIcon from "../assets/warning.png";
import logoTransparent from "../assets/logo-transparent.png";
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
let suppressNextAutoMapGuide = false;

const MAP_LAYOUT_NAV_ITEMS = [
  { label: "Landing Page", to: APP_ROUTES.home },
  { label: "Map", to: APP_ROUTES.map },
  { label: "3D Route", to: APP_ROUTES.map3dRoute },
  { label: "Risks", to: APP_ROUTES.risks },
  { label: "About Us", to: APP_ROUTES.about },
] as const;

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
      <div className="flex shrink-0 items-end justify-end gap-1 whitespace-nowrap sm:items-center sm:gap-2">
        <div className="w-[98px] shrink-0 sm:w-[174px]">
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
  hidden = false,
}: {
  onZoomIn: () => void;
  onZoomOut: () => void;
  hidden?: boolean;
}) {
  return (
    <div className={`map-sidebar-controls ${hidden ? "opacity-0 pointer-events-none translate-y-2" : "opacity-100 translate-y-0"}`}>
      <button className="map-ctrl-btn" title="Zoom in" onClick={onZoomIn}>
        <Plus size={18} />
      </button>
      <button className="map-ctrl-btn" title="Zoom out" onClick={onZoomOut}>
        <Minus size={18} />
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
  const navigate = useNavigate();
  const location = useLocation();
  const [weights, setWeights] = useState<ComfortWeights>(() => loadWeights());
  const [debouncedWeights, setDebouncedWeights] = useState<ComfortWeights>(weights);
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
  const shouldFetchPrecincts = true;

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
  const [panelOpen, setPanelOpen] = useState(false);
  const [landingMenuOpen, setLandingMenuOpen] = useState(false);
  const [activeView, setActiveView] = useState<"view" | "compare">("view");
  const [currentPageLabel, setCurrentPageLabel] = useState("Map");
  const [exploreOpen, setExploreOpen] = useState(false);
  const [legendDropdownOpen, setLegendDropdownOpen] = useState(false);
  const menuPanelRef = useRef<HTMLElement | null>(null);
  const leftPanelRef = useRef<HTMLDivElement | null>(null);
  const menuItemRefs = useRef<HTMLButtonElement[]>([]);
  const floatingUiRefs = useRef<HTMLElement[]>([]);
  const explorePanelRef = useRef<HTMLDivElement | null>(null);
  const legendPanelRef = useRef<HTMLDivElement | null>(null);
  const detailCardRef = useRef<HTMLDivElement | null>(null);
  const recommendationPageRef = useRef<HTMLDivElement | null>(null);
  const exploreItemRefs = useRef<HTMLButtonElement[]>([]);
  const legendItemRefs = useRef<HTMLElement[]>([]);
  const floatingUiFadeClass = panelOpen || landingMenuOpen ? "pointer-events-none" : "pointer-events-auto";
  const sideControlsFadeClass = activeView === "compare"
    ? "pointer-events-none opacity-0 -translate-y-40"
    : `${floatingUiFadeClass} opacity-100 translate-y-0`;
  const bottomControlsFadeClass = activeView === "compare"
    ? "pointer-events-none opacity-0 translate-y-28"
    : `${floatingUiFadeClass} opacity-100 translate-y-0`;

  // Right panel: 'layers' | 'legend' | null — mutually exclusive
  const [openPanel, setOpenPanel] = useState<'layers' | 'legend' | null>(null);
  const [leftPanelLayout, setLeftPanelLayout] = useState<{ width: number }>({
    width: 154,
  });

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
  const sectionContainerRef = useRef<HTMLDivElement | null>(null);
  const viewSectionRef = useRef<HTMLElement | null>(null);
  const compareSectionRef = useRef<HTMLElement | null>(null);
  const legacyScrollRef = useRef<HTMLDivElement | null>(null);
  const legacyCompareSectionRef = useRef<HTMLElement | null>(null);
  const compareLeftRef = useRef<HTMLDivElement | null>(null);
  const compareRightRef = useRef<HTMLDivElement | null>(null);
  const compareBottomRef = useRef<HTMLDivElement | null>(null);
  const compareCenterRef = useRef<HTMLDivElement | null>(null);
  const wheelLockRef = useRef(false);
  const [compareResetVisible, setCompareResetVisible] = useState(false);

  // Leaflet map instance for programmatic zoom / flyTo
  const mapInstanceRef = useRef<L.Map | null>(null);

  const handleMapReady = useCallback((map: L.Map) => {
    mapInstanceRef.current = map;
  }, []);

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

  const exploreFilters = [
    { label: "Ease Places", key: "easePlaces" as const },
    { label: "Comfort Area", key: "comfortArea" as const },
    { label: "Street Facilities", key: "streetFacilities" as const },
    { label: "Natural Places", key: "naturalPlaces" as const },
  ];

  useEffect(() => { saveWeights(weights); }, [weights]);
  useEffect(() => {
    const found = MAP_LAYOUT_NAV_ITEMS.find((item) => item.to === location.pathname);
    if (found) setCurrentPageLabel(found.label);
  }, [location.pathname]);

  useEffect(() => {
    const panel = menuPanelRef.current;
    const items = menuItemRefs.current.filter(Boolean);
    const floating = floatingUiRefs.current.filter(Boolean);
    if (!panel) return;

    if (panelOpen) {
      utils.remove(panel);
      utils.remove(items);
      utils.remove(floating);

      animate(panel, {
        translateX: ["100%", "0%"],
        duration: 620,
        ease: "out(3)",
      });

      animate(items, {
        opacity: [0, 1],
        translateY: [12, 0],
        delay: utils.stagger(90, { start: 180 }),
        duration: 420,
        ease: "out(3)",
      });

      animate(floating, {
        opacity: [1, 0],
        translateY: [0, 8],
        duration: 360,
        ease: "out(2)",
      });
      return;
    }

    utils.remove(panel);
    utils.remove(items);
    utils.remove(floating);

    animate(panel, {
      translateX: ["0%", "100%"],
      duration: 520,
      ease: "in(3)",
    });

    animate(floating, {
      opacity: [0, 1],
      translateY: [8, 0],
      duration: 380,
      ease: "out(2)",
    });
  }, [panelOpen]);

  useEffect(() => {
    const panel = explorePanelRef.current;
    const items = exploreItemRefs.current.filter(Boolean);
    if (!panel) return;
    utils.remove(panel);
    utils.remove(items);
    if (!exploreOpen) return;
    animate(panel, {
      opacity: [0, 1],
      translateY: [14, 0],
      duration: 480,
      ease: "out(3)",
    });
    animate(items, {
      opacity: [0, 1],
      translateY: [10, 0],
      delay: utils.stagger(80, { start: 120 }),
      duration: 360,
      ease: "out(3)",
    });
  }, [exploreOpen]);

  useEffect(() => {
    const panel = legendPanelRef.current;
    if (!panel) return;
    const items = Array.from(panel.querySelectorAll<HTMLElement>("[data-legend-item]"));
    utils.remove(panel);
    utils.remove(items);
    if (!legendDropdownOpen) return;
    animate(panel, {
      opacity: [0, 1],
      translateY: [14, 0],
      duration: 480,
      ease: "out(3)",
    });
    animate(items, {
      opacity: [0, 1],
      translateY: [10, 0],
      delay: utils.stagger(70, { start: 110 }),
      duration: 340,
      ease: "out(3)",
    });
  }, [legendDropdownOpen, mapFilters]);

  useEffect(() => {
    const card = detailCardRef.current;
    const selectedPrecinct = showCard ? precincts[showCard] : null;
    if (!card || !showCard || !selectedPrecinct || !mapFilters.comfortArea) return;
    const sections = Array.from(card.querySelectorAll<HTMLElement>("[data-comfort-reveal]"));
    utils.remove([card, ...sections]);
    animate(card, {
      opacity: [0, 1],
      translateY: [14, 0],
      duration: 680,
      ease: "out(3)",
    });
    if (sections.length > 0) {
      animate(sections, { opacity: 0, translateY: 12, duration: 0 });
      animate(sections, {
        opacity: [0, 1],
        translateY: [12, 0],
        delay: utils.stagger(130, { start: 160 }),
        duration: 420,
        ease: "out(3)",
      });
    }
  }, [showCard, precincts, mapFilters.comfortArea]);

  useEffect(() => {
    if (!showTimeRecommendation) return;
    const root = recommendationPageRef.current;
    if (!root) return;
    const nodes = Array.from(root.querySelectorAll<HTMLElement>("[data-reco-reveal]"));
    if (nodes.length === 0) return;
    utils.remove(nodes);
    animate(nodes, { opacity: 0, translateY: 18, duration: 0 });
    animate(nodes, {
      opacity: [0, 1],
      translateY: [18, 0],
      delay: utils.stagger(170),
      duration: 560,
      ease: "out(3)",
    });
  }, [showTimeRecommendation, selectedDestId]);

  useEffect(() => {
    const panel = leftPanelRef.current;
    if (!panel) return;
    const shouldShow = mapFilters.comfortArea && !sidebarCollapsed;
    utils.remove(panel);
    const contentItems = Array.from(panel.querySelectorAll<HTMLElement>("[data-left-item]"));
    utils.remove(contentItems);

    if (shouldShow) {
      panel.style.display = "block";
      panel.style.width = "0px";
      contentItems.forEach((item) => {
        item.style.opacity = "0";
        item.style.transform = "translateY(8px)";
      });
      animate(panel, {
        opacity: [0.92, 1],
        width: [0, leftPanelLayout.width],
        duration: 720,
        ease: "out(3)",
      });
      animate(contentItems, {
        opacity: [0, 1],
        translateY: [8, 0],
        delay: utils.stagger(95, { start: 220 }),
        duration: 360,
        ease: "out(3)",
      });
      return;
    }

    animate(contentItems, {
      opacity: [1, 0],
      translateY: [0, 6],
      duration: 220,
      ease: "in(2)",
    });
    animate(panel, {
      opacity: [1, 0],
      width: [panel.offsetWidth || leftPanelLayout.width, 0],
      duration: 620,
      ease: "in(3)",
      onComplete: () => {
        if (leftPanelRef.current && (!mapFilters.comfortArea || sidebarCollapsed)) {
          leftPanelRef.current.style.width = "0px";
          leftPanelRef.current.style.display = "none";
        }
      },
    });
  }, [mapFilters.comfortArea, sidebarCollapsed, leftPanelLayout.width]);

  useEffect(() => {
    const updateLeftPanelLayout = () => {
      const width = window.innerWidth < 640 ? 154 : 186;
      setLeftPanelLayout({ width });
    };

    updateLeftPanelLayout();
    window.addEventListener("resize", updateLeftPanelLayout);
    return () => window.removeEventListener("resize", updateLeftPanelLayout);
  }, []);

  useEffect(() => {
    setSelectedAreaId(getAreaIdFromSearch(location.search));
    setSelectedRecommendationId(getRecommendationIdFromSearch(location.search));
  }, [location.search]);

  useLayoutEffect(() => {
    if (!sectionContainerRef.current) return;
    sectionContainerRef.current.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, [location.pathname, location.search]);

  useEffect(() => {
    const host = sectionContainerRef.current;
    if (!host) return;
    const targetTop = activeView === "compare"
      ? (compareSectionRef.current?.offsetTop ?? 0)
      : (viewSectionRef.current?.offsetTop ?? 0);
    host.scrollTo({ top: targetTop, left: 0, behavior: "smooth" });
  }, [activeView]);

  useEffect(() => {
    if (suppressNextAutoMapGuide) {
      suppressNextAutoMapGuide = false;
      return;
    }
    if (
      !selectedAreaId &&
      !selectedRecommendationId &&
      !showTimeRecommendation &&
      !hasAutoShownMapGuideThisRuntime
    ) {
      hasAutoShownMapGuideThisRuntime = true;
      setShowMapGuide(true);
    }
  }, [
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
    if (!mapFilters.comfortArea) {
      setMapFilters((current: MapFilters) => ({ ...current, comfortArea: true }));
    }
    const selected = precincts[id];
    if (selected && Number.isFinite(selected.lat) && Number.isFinite(selected.lng)) {
      mapInstanceRef.current?.flyTo([selected.lat, selected.lng], Math.max(mapInstanceRef.current?.getZoom() ?? 13, 14), {
        duration: 0.8,
      });
    }
    setShowCard(id);
  }, [mapFilters.comfortArea, precincts]);

  const handleTopModeSwitch = useCallback((mode: "view" | "compare") => {
    setActiveView(mode);
    const host = legacyScrollRef.current;
    if (!host) return;
    if (mode === "view") {
      host.scrollTo({ top: 0, left: 0, behavior: "smooth" });
      return;
    }
    const targetTop = legacyCompareSectionRef.current?.offsetTop ?? host.scrollHeight;
    host.scrollTo({ top: targetTop, left: 0, behavior: "smooth" });
  }, []);

  const handleResetCompare = useCallback(() => {
    setCompareSelection1(null);
    setCompareSelection2(null);
    setCompareResetVisible(false);
    setShowCard(null);
  }, []);

  const compareReady = activeView === "compare" && !!compareSelection1 && !!compareSelection2;

  useEffect(() => {
    if (!compareReady) {
      setCompareResetVisible(false);
      return;
    }
    const left = compareLeftRef.current;
    const right = compareRightRef.current;
    const bottom = compareBottomRef.current;
    const center = compareCenterRef.current;
    if (!left || !right || !bottom || !center) return;
    utils.remove([left, right, bottom, center]);
    animate(left, { opacity: 0, translateX: -28, duration: 0 });
    animate(right, { opacity: 0, translateX: 28, duration: 0 });
    animate(bottom, { opacity: 0, translateY: 26, duration: 0 });
    animate(left, { opacity: [0, 1], translateX: [-28, 0], delay: 180, duration: 420, ease: "out(3)" });
    animate(right, { opacity: [0, 1], translateX: [28, 0], delay: 250, duration: 420, ease: "out(3)" });
    animate(bottom, { opacity: [0, 1], translateY: [26, 0], delay: 330, duration: 430, ease: "out(3)" });

    const revealItems = Array.from(
      document.querySelectorAll<HTMLElement>("[data-compare-reveal]")
    );
    utils.remove(revealItems);
    animate(revealItems, { opacity: 0, translateY: 10, duration: 0 });
    animate(revealItems, {
      opacity: [0, 1],
      translateY: [10, 0],
      delay: utils.stagger(70, { start: 420 }),
      duration: 320,
      ease: "out(3)",
    });

    const scoreBars = Array.from(
      document.querySelectorAll<HTMLElement>("[data-compare-score-bar]")
    );
    scoreBars.forEach((bar) => {
      const target = Number(bar.dataset.target ?? "0");
      bar.style.width = "0%";
      animate(bar, {
        width: [`0%`, `${Math.max(0, Math.min(100, target))}%`],
        delay: 420,
        duration: 650,
        ease: "out(3)",
      });
    });
    animate(center, {
      opacity: [0, 1],
      translateY: [10, 0],
      delay: 520,
      duration: 360,
      ease: "out(3)",
      onComplete: () => setCompareResetVisible(true),
    });
  }, [compareReady, compareSelection1, compareSelection2]);

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

  const handleSectionWheel = useCallback((event: React.WheelEvent<HTMLDivElement>) => {
    const target = event.target as HTMLElement | null;
    if (target?.closest(".leaflet-container")) {
      return;
    }

    if (wheelLockRef.current) return;
    if (Math.abs(event.deltaY) < 28) return;
    const host = sectionContainerRef.current;
    const viewTop = viewSectionRef.current?.offsetTop ?? 0;
    const compareTop = compareSectionRef.current?.offsetTop ?? 0;
    if (!host) return;

    const midpoint = (viewTop + compareTop) / 2;
    const inViewSection = host.scrollTop < midpoint;
    const targetTop = event.deltaY > 0
      ? (inViewSection ? compareTop : compareTop)
      : (inViewSection ? viewTop : viewTop);

    if (Math.abs(host.scrollTop - targetTop) < 4) return;

    wheelLockRef.current = true;
    event.preventDefault();
    host.scrollTo({ top: targetTop, left: 0, behavior: "smooth" });
    window.setTimeout(() => {
      wheelLockRef.current = false;
    }, 420);
  }, []);

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
      <div
        ref={recommendationPageRef}
        className="min-h-screen"
        style={{ background: "linear-gradient(180deg, #122d2b 0%, #eef8f5 16%, #f7fbfa 76%, #dfeee9 100%)" }}
      >
        <div data-reco-reveal className="relative h-64 overflow-hidden border-b border-[#d9d1c6]">
          <div className="relative z-10 px-4 py-6">
            <button
              type="button"
              onClick={() => {
                suppressNextAutoMapGuide = true;
                setShowTimeRecommendation(false);
                setSelectedDestId(null);
                setTodayData(null);
              }}
              className="mb-6 inline-flex items-center gap-2 rounded-xl border border-white/30 bg-gradient-to-b from-[#122d2b] to-[#17413f] px-3 py-2 text-white shadow-[0_8px_18px_rgba(0,0,0,0.18)] transition hover:brightness-110"
            >
              <ArrowLeft className="w-5 h-5" />
              <span>Back</span>
            </button>

            <div className="max-w-4xl mx-auto">
              <div className="flex items-center gap-2 mb-2">
                <MapPin className="w-5 h-5 text-emerald-400" />
                <span className="text-emerald-400 text-sm font-medium">Destination</span>
              </div>
              <h1 className="mb-2 text-3xl font-bold text-[#10201f]">{destName}</h1>
              <p className="text-sm text-[#456765]">Optimal time recommendations based on weather, crowd, and conditions</p>
            </div>
          </div>
        </div>

        <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">
          <div data-reco-reveal className="overflow-hidden rounded-2xl border border-[#d9d1c6] bg-[#f5f0e8]/95 shadow-[0_10px_28px_rgba(0,0,0,0.06)]">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="mb-1 text-2xl font-bold text-[#10201f]">Right Now</h2>
                  <p className="text-sm text-[#5f6f64]">Current conditions at {destName}</p>
                </div>
                <Clock className="w-8 h-8 text-emerald-400" />
              </div>

              <div className="flex items-end gap-6 mb-8">
                <div>
                  <div className="text-7xl font-bold text-emerald-400">{currentScore}</div>
                  <div className="flex items-center gap-2 mt-2">
                    <Star className="w-5 h-5 text-yellow-400 fill-yellow-400" />
                    <span className="text-[#3f5f5b]">{currentStatus}</span>
                  </div>
                </div>

                <div className="flex-1 pb-2">
                  <div className="mb-2 text-sm text-[#5f6f64]">Score Trend</div>
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
                <div className="rounded-xl border border-[#d9d1c6] bg-[#f1ecdf] p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <ThermometerSun className="w-5 h-5 text-orange-400" />
                    <span className="text-xs text-[#5f6f64]">Temperature</span>
                  </div>
                  <div className="text-2xl font-bold text-[#10201f]">{currentTemp !== null && currentTemp !== undefined ? `${currentTemp}°C` : "N/A"}</div>
                </div>
                <div className="rounded-xl border border-[#d9d1c6] bg-[#f1ecdf] p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Droplets className="w-5 h-5 text-blue-400" />
                    <span className="text-xs text-[#5f6f64]">Humidity</span>
                  </div>
                  <div className="text-2xl font-bold text-[#10201f]">{currentHumidity !== null && currentHumidity !== undefined ? `${currentHumidity}%` : "N/A"}</div>
                </div>
                <div className="rounded-xl border border-[#d9d1c6] bg-[#f1ecdf] p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Wind className="w-5 h-5 text-cyan-400" />
                    <span className="text-xs text-[#5f6f64]">Wind Speed</span>
                  </div>
                  <div className="text-2xl font-bold text-[#10201f]">{currentWind !== null && currentWind !== undefined ? `${currentWind} m/s` : "N/A"}</div>
                </div>
                <div className="rounded-xl border border-[#d9d1c6] bg-[#f1ecdf] p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Users className="w-5 h-5 text-purple-400" />
                    <span className="text-xs text-[#5f6f64]">Crowd Level</span>
                  </div>
                  <div className="text-2xl font-bold text-[#10201f]">{crowdLevel}</div>
                </div>
              </div>
            </div>

          </div>

          <div data-reco-reveal>
            <div className="flex items-center gap-3 mb-6">
              <TrendingUp className="w-6 h-6 text-emerald-400" />
              <h2 className="text-2xl font-bold text-[#10201f]">Recommended Time Slots</h2>
            </div>

            <div className="space-y-6">
              {timeSlots.map((slot) => (
                <div key={slot.period} className="group cursor-pointer overflow-hidden rounded-2xl border border-[#d9d1c6] bg-[#f5f0e8]/95 transition-all hover:border-[#9aa884]">
                  <div className="grid md:grid-cols-5 gap-0">
                    <div className="md:col-span-2 relative h-64 md:h-auto overflow-hidden">
                      <img src={slot.image} alt={slot.period} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent to-[#f5f0e8]/90" />
                      <div className="absolute top-4 left-4 bg-emerald-500 text-white px-4 py-2 rounded-full font-bold text-lg">
                        Score: {slot.score}
                      </div>
                    </div>

                    <div className="md:col-span-3 p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className="p-3 bg-emerald-500/20 rounded-xl text-emerald-400">{slot.icon}</div>
                          <div>
                            <h3 className="text-xl font-bold text-[#10201f]">{slot.period}</h3>
                            <p className="text-[#5f6f64]">{slot.time}</p>
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-3 mb-4">
                        {slot.stats.map((stat) => (
                          <div key={stat.label} className="rounded-lg border border-[#d9d1c6] bg-[#f1ecdf] p-3">
                            <div className="mb-1 flex items-center gap-2 text-[#5f6f64]">
                              {stat.icon}
                              <span className="text-xs">{stat.label}</span>
                            </div>
                            <div className="text-sm font-semibold text-[#10201f]">{stat.value}</div>
                          </div>
                        ))}
                      </div>

                      <div className="space-y-2">
                        {slot.reasons.map((reason) => (
                          <div key={reason} className="flex items-start gap-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-1.5 shrink-0" />
                            <span className="text-sm text-[#3f5f5b]">{reason}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              ))}

              <div className="rounded-xl border border-[#d9d1c6] bg-[#f1ecdf] p-5">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Clock className="w-5 h-5 text-[#5f6f64]" />
                      <span className="font-semibold text-[#10201f]">{alternativeSlot.period}</span>
                    </div>
                    <div className="mb-1 text-sm text-[#5f6f64]">{alternativeSlot.time}</div>
                    <div className="text-xs text-[#6f827f]">{alternativeSlot.note}</div>
                  </div>
                  <div className="text-3xl font-bold text-[#5f6f64]">{alternativeSlot.score}</div>
                </div>
              </div>
            </div>
          </div>

          <div data-reco-reveal className="pb-8">
            <div className="flex items-center gap-3 mb-6">
              <Lightbulb className="w-6 h-6 text-yellow-400" />
              <h2 className="text-2xl font-bold text-[#10201f]">Preparation Advice</h2>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              {preparations.map((prep) => (
                <div key={prep.title} className="rounded-xl border border-[#d9d1c6] bg-[#f5f0e8]/95 p-5 transition-colors hover:border-[#9aa884]">
                  <div className="flex items-start gap-4">
                    <div className="p-3 bg-gradient-to-br from-emerald-500/20 to-cyan-500/20 rounded-xl text-emerald-400 shrink-0">
                      {prep.icon}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-semibold text-[#10201f]">{prep.title}</h3>
                        <span className={`text-xs px-2 py-1 rounded-full ${prep.priority === "High" ? "bg-red-500/20 text-red-400" : "bg-yellow-500/20 text-yellow-400"}`}>
                          {prep.priority}
                        </span>
                      </div>
                      <p className="text-sm text-[#3f5f5b]">{prep.text}</p>
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
  const shouldLiftDetailCard = exploreOpen || legendDropdownOpen;
  const betterPrecinctId = getBetterPrecinct();
  const selectedArea = getAreaInfo(selectedAreaId);
  const selectedRecommendation = getAreaRecommendation(selectedAreaId, selectedRecommendationId);
  const useLegacyLayout = true;

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

  const compareLeftPrecinct = compareSelection1 ? precincts[compareSelection1] : null;
  const compareRightPrecinct = compareSelection2 ? precincts[compareSelection2] : null;

  if (useLegacyLayout) return (
    <div ref={legacyScrollRef} className="fixed inset-0 overflow-y-auto overflow-x-hidden snap-y snap-mandatory text-[#10201f]">
      {panelOpen && (
        <button
          type="button"
          aria-label="Close menu overlay"
          onClick={() => setPanelOpen(false)}
          className="fixed inset-0 z-[250] bg-black/30"
        />
      )}

      <aside
        ref={menuPanelRef}
        className={`fixed right-0 top-0 bottom-0 z-[300] max-w-[86vw] bg-[#f5f0e8] text-[#2a2a2a] ${
          panelOpen ? "pointer-events-auto" : "pointer-events-none"
        }`}
        style={{
          width: "clamp(260px, 34vw, 340px)",
          transform: panelOpen ? "translateX(0%)" : "translateX(100%)",
        }}
      >
        <div className="flex h-16 items-center justify-between bg-gradient-to-b from-[#122d2b] to-[#17413f] px-7 text-white">
          <span className="text-[11px] font-medium tracking-[0.3em] uppercase">Menu</span>
          <button type="button" onClick={() => setPanelOpen(false)} className="h-8 w-8 text-xl">
            ✕
          </button>
        </div>
        <nav className="flex flex-col py-10">
          {MAP_LAYOUT_NAV_ITEMS.map((item, index) => (
            <button
              ref={(el) => {
                if (!el) return;
                menuItemRefs.current[index] = el;
              }}
              key={item.label}
              type="button"
              onClick={() => {
                setCurrentPageLabel(item.label);
                setPanelOpen(false);
                navigate(item.to);
              }}
              className={`flex items-center justify-between border-b border-black/10 px-8 py-[18px] text-left font-['Cormorant_Garamond',serif] text-[26px] ${
                currentPageLabel === item.label ? "text-[#4a5c3a]" : "text-[#2a2a2a]"
              }`}
              style={{ fontSize: "clamp(20px, 2.6vw, 26px)", opacity: 0, transform: "translateY(8px)" }}
            >
              <span>{item.label}</span>
              <span className="text-base opacity-40">→</span>
            </button>
          ))}
        </nav>
      </aside>

      <header className="fixed left-0 right-0 top-0 z-[200] flex h-14 items-center justify-between px-3 sm:h-16 sm:px-8">
        <div
          ref={(el) => {
            if (!el) return;
            floatingUiRefs.current[0] = el;
          }}
          className="flex flex-col gap-1 pointer-events-auto"
          style={{ width: "clamp(64px, 11vw, 92px)" }}
        >
          {(["view", "compare"] as const).map((mode) => (
            <button
              key={mode}
              type="button"
              onClick={() => handleTopModeSwitch(mode)}
              className={`rounded-sm border-l-2 px-2 py-1 text-left text-[9px] font-medium tracking-[0.14em] uppercase transition-all duration-300 ease-out sm:px-3 sm:text-[10px] sm:tracking-[0.24em] ${
                activeView === mode
                  ? "scale-[1.04] border-white bg-gradient-to-b from-[#122d2b] to-[#17413f] text-white shadow-[0_8px_18px_rgba(0,0,0,0.2)]"
                  : "scale-100 border-transparent bg-gradient-to-b from-[#122d2b]/85 to-[#17413f]/85 text-white/45 brightness-90"
              }`}
            >
              {mode}
            </button>
          ))}
        </div>

        <div className="absolute left-1/2 -translate-x-1/2 text-center leading-tight text-white">
          <img src={logoTransparent} alt="Move Comfortly" className="mx-auto mt-6 h-45 w-auto object-contain sm:mt-14" />
        </div>

        <div className="pointer-events-auto">
          <AppTopNav
            variant="landing"
            landingMode="compact"
            landingTone="dark"
            landingTransitionProgress={1}
            landingOverlayOpen={landingMenuOpen}
            onLandingOverlayOpenChange={setLandingMenuOpen}
            landingOverlayContext="map"
            className="app-top-nav--map-overlay"
          />
        </div>
      </header>

      <MapGuideDialog
        open={showMapGuide}
        onOpenChange={setShowMapGuide}
        topPrecincts={guideTopPrecincts}
        loading={loading}
        onPrecinctSelect={handleGuidePrecinctSelect}
      />

      <div className="fixed inset-0 z-0">
        <LeafletMap
          precincts={mapFilters.comfortArea ? precinctList : []}
          selectedCategory={activeView === "compare" ? null : (mapFilters.comfortArea ? selectedCategory : null)}
          activeMode={activeView}
          compareSelection1={activeView === "compare" ? compareSelection1 : null}
          compareSelection2={activeView === "compare" ? compareSelection2 : null}
          onPrecinctClick={activeView === "compare" ? handleCompareClick : handleMapClickCombined}
          onAreaClick={activeView === "compare" ? undefined : handleAreaNavigation}
          showInteractiveAreas={activeView === "compare" ? false : mapFilters.comfortArea}
          showEasePlaces={mapFilters.easePlaces}
          showStreetFacilities={mapFilters.streetFacilities}
          showNaturalPlaces={mapFilters.naturalPlaces}
          onMapReady={handleMapReady}
          onEasePlacesClick={handleEasePlacesClick}
        />
      </div>

      <div className="relative z-10 pt-14 pointer-events-none sm:pt-16">
        <section className="snap-start h-[calc(100vh-56px)] w-full sm:h-[calc(100vh-64px)]">
            <div className="relative h-full w-full pointer-events-none">
              <div
                className={`absolute left-3 top-16 z-40 flex items-start transition-all duration-300 ease-out sm:left-8 sm:top-20 ${sideControlsFadeClass}`}
              >
                <div
                  ref={leftPanelRef}
                  className="left-panel-scroll hidden overflow-y-auto rounded-lg border border-[#4a5c3a]/25 bg-[#f5f0e8] shadow-[0_-8px_40px_rgba(0,0,0,0.2)]"
                  style={{
                    width: 0,
                    opacity: 0,
                    maxHeight: "min(172px, calc(100vh - 300px))",
                  }}
                >
                  <div data-left-item className="mb-2 px-2.5 pt-2 sm:px-3 sm:pt-2.5">
                    <h3 className="mb-2 text-[10px] font-semibold text-[#4a5c3a] sm:text-[11px] whitespace-normal break-words">Filter by Comfort</h3>
                    <div className="space-y-1.5 map-legend-items">
                      {categories.map(cat => (
                        <button
                          type="button"
                          key={cat.name}
                          onClick={() => setSelectedCategory(selectedCategory === cat.level ? null : cat.level)}
                          className={`flex w-full min-w-0 items-center gap-2 rounded-lg border px-2 py-1.5 text-left ${
                            selectedCategory === cat.level
                              ? `${cat.bgColor} ${cat.textColor} shadow-sm font-semibold`
                              : 'bg-white/70 hover:bg-white text-[#294745] border-[#17413f]/10'
                          }`}
                          style={{ borderColor: selectedCategory === cat.level ? cat.color : undefined }}
                        >
                          <div className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: cat.color }} />
                          <span className="min-w-0 text-[10px] leading-tight whitespace-normal break-words">{cat.name}</span>
                          <span className="ml-auto text-[9px] font-semibold">
                            {precinctList.filter((p: Precinct) => riskLevel(p.comfort_label) === cat.level).length}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div data-left-item className="mt-3 border-t border-[#4a5c3a]/15 px-2.5 pb-2 pt-3 sm:px-3 sm:pb-2.5">
                    <div className="mb-2 flex items-center justify-between">
                      <h3 className="text-[10px] font-semibold text-[#4a5c3a] sm:text-[11px] whitespace-normal break-words">Comfort Preferences</h3>
                      <button
                        type="button"
                        onClick={() => setWeights(DEFAULT_WEIGHTS)}
                        className="text-[9px] font-semibold text-[#006d77] hover:text-[#17413f]"
                      >
                        Reset
                      </button>
                    </div>
                    {([
                      ['temperature', 'Temperature'],
                      ['humidity', 'Humidity'],
                      ['activity', 'Crowd Density'],
                    ] as const).map(([key, label]) => (
                      <label key={key} className="mb-2 block">
                        <div className="mb-1 flex items-center justify-between text-[9px] text-[#5f8682]">
                          <span className="min-w-0 whitespace-normal break-words">{label}</span>
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
                  </div>
                </div>

              </div>

              <div className={`transition-all duration-300 ease-out ${sideControlsFadeClass}`}>
                <MapSidebarControls
                  onZoomIn={handleZoomIn}
                  onZoomOut={handleZoomOut}
                  hidden={panelOpen || landingMenuOpen}
                />
              </div>
              <button
                type="button"
                onClick={() => {
                  if (!mapFilters.comfortArea) {
                    handleToggleMapFilter("comfortArea");
                    setSidebarCollapsed(false);
                    return;
                  }
                  setSidebarCollapsed(!sidebarCollapsed);
                }}
                ref={(el) => {
                  if (!el) return;
                  floatingUiRefs.current[2] = el;
                }}
                className={`absolute left-3 z-40 rounded-xl border border-[#83c5be]/30 bg-gradient-to-b from-[#122d2b] to-[#17413f] p-1.5 text-white shadow-[0_16px_36px_rgba(4,14,14,0.18)] transition-all duration-300 ease-out sm:left-8 sm:rounded-2xl sm:p-2 ${sideControlsFadeClass}`}
                style={{
                  top: "34px",
                }}
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
              <div
                ref={(el) => {
                  if (!el) return;
                  floatingUiRefs.current[1] = el;
                }}
                className={`absolute left-3 z-40 rounded-md border px-1.5 py-1 text-[9px] font-semibold leading-tight backdrop-blur-sm whitespace-normal break-words transition-all duration-300 ease-out sm:left-8 sm:px-2 sm:text-[10px] ${sideControlsFadeClass} ${
                  loading
                    ? "border-amber-300/60 bg-amber-200/55 text-amber-950"
                    : error
                      ? "border-red-300/60 bg-red-200/55 text-red-950"
                      : "border-emerald-300/60 bg-emerald-200/55 text-emerald-950"
                }`}
                style={{
                  top: "6px",
                  width: "clamp(64px, 11vw, 92px)",
                }}
              >
                {loading ? "Loading sensors..." : error ? "Sensor load issue" : "Live sensors loaded"}
              </div>
              {openPanel === 'layers' && <MapFilterPanel filters={mapFilters} onToggle={handleToggleMapFilter} />}
              {openPanel === 'legend' && <DynamicLegendPanel filters={mapFilters} />}

              {easePlacesPopup && mapFilters.easePlaces && (
                <EasePlacesDetailPopup
                  feature={easePlacesPopup.feature}
                  anchorPoint={easePlacesPopup.point}
                  viewport={easePlacesPopup.viewport}
                  onClose={() => setEasePlacesPopup(null)}
                  onZoomTo={handleZoomTo}
                />
              )}

              {activeView === "view" && showCard && showCardPrecinct && mapFilters.comfortArea && (
                <div
                  ref={detailCardRef}
                  className="pointer-events-auto fixed left-1/2 z-[520] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-2xl border border-[#4a5c3a]/25 text-[#10201f] shadow-[0_28px_72px_rgba(4,14,14,0.24)] backdrop-blur-md"
                  style={{
                    top: shouldLiftDetailCard ? "40%" : "50%",
                    width: "clamp(280px, 42vw, 520px)",
                    maxHeight: "clamp(260px, 56vh, 620px)",
                    padding: "clamp(12px, 1.2vw, 18px)",
                    background: "linear-gradient(180deg, #122d2b 0%, #eef8f5 18%, #f7fbfa 64%, #b8d7d2 100%)",
                  }}
                >
                  <div data-comfort-reveal className="mb-3 flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-lg font-bold">{showCardPrecinct.name}</h3>
                      <p className="mt-1 text-xs text-[#27413f]">{formatDetailSensorStatus(showCardPrecinct)}</p>
                    </div>
                    <button
                      type="button"
                      aria-label="Close"
                      onClick={() => setShowCard(null)}
                      className="text-[#27413f] hover:text-[#10201f]"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>
                  <div data-comfort-reveal className="grid grid-cols-2 gap-3 text-sm">
                    <div className="rounded-xl border border-[#4a5c3a]/20 bg-[rgba(239,233,223,0.78)] p-3">
                      <p className="text-xs text-[#27413f]">Temperature</p>
                      <p className="mt-1 text-base font-bold text-orange-700">{showCardPrecinct.temperature !== null ? `${showCardPrecinct.temperature}°C` : "N/A"}</p>
                    </div>
                    <div className="rounded-xl border border-[#4a5c3a]/20 bg-[rgba(239,233,223,0.78)] p-3">
                      <p className="text-xs text-[#27413f]">Humidity</p>
                      <p className="mt-1 text-base font-bold text-blue-700">{showCardPrecinct.humidity !== null ? `${showCardPrecinct.humidity}%` : "N/A"}</p>
                    </div>
                    <div className="rounded-xl border border-[#4a5c3a]/20 bg-[rgba(239,233,223,0.78)] p-3">
                      <p className="text-xs text-[#27413f]">Wind Speed</p>
                      <p className="mt-1 text-base font-bold text-teal-700">{showCardPrecinct.wind_speed !== null ? `${showCardPrecinct.wind_speed} m/s` : "N/A"}</p>
                    </div>
                    <div className="rounded-xl border border-[#4a5c3a]/20 bg-[rgba(239,233,223,0.78)] p-3">
                      <p className="text-xs text-[#27413f]">Comfort Score</p>
                      <p className="mt-1 text-base font-bold text-[#17413f]">{showCardPrecinct.comfort_score}/100</p>
                    </div>
                  </div>
                  <div data-comfort-reveal className="mt-3 rounded-xl border border-[#4a5c3a]/20 bg-[rgba(239,233,223,0.78)] p-3">
                    <p className="text-xs text-[#27413f]">Crowd Density</p>
                    <p className="mt-1 text-base font-bold text-purple-700">{showCardPrecinct.activity_level}</p>
                  </div>
                  <button
                    data-comfort-reveal
                    type="button"
                    onClick={() => handleWantToGo(showCard)}
                    className="mt-4 w-full rounded-2xl bg-gradient-to-r from-[#006d77] to-[#17413f] py-3 font-semibold text-white shadow-md"
                  >
                    Best time & travel suggestion
                  </button>
                </div>
              )}

              {!compareReady && activeView === "compare" && (
                <div className="pointer-events-auto fixed bottom-6 left-1/2 z-[520] w-[92vw] max-w-[680px] -translate-x-1/2 rounded-2xl border border-[#d9d1c6] bg-[#fbf8f1]/95 p-4 shadow-[0_18px_42px_rgba(10,24,23,0.18)]">
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#4a5c3a]">Compare Mode</p>
                  <p className="mt-1 text-sm text-[#3f5f5b]">Click two comfort markers on the map to compare.</p>
                </div>
              )}
            </div>
        </section>
        <section ref={legacyCompareSectionRef} className="snap-start h-screen w-full" />
      </div>

      {compareReady && compareLeftPrecinct && compareRightPrecinct && comparisonRecommendation && (
        <div className="pointer-events-auto fixed inset-0 z-[560]">
          <div className="absolute inset-0 pt-2 sm:pt-3">
            <div className="relative h-full w-full">
              <div className="grid h-[64%] grid-cols-2 gap-2 px-2 sm:gap-3 sm:px-3">
              {([
                { side: "left", precinct: compareLeftPrecinct, selectedId: compareSelection1, refEl: compareLeftRef },
                { side: "right", precinct: compareRightPrecinct, selectedId: compareSelection2, refEl: compareRightRef },
              ] as const).map(({ side, precinct, selectedId, refEl }) => {
                const isBetter = betterPrecinctId === selectedId;
                return (
                  <div
                    key={selectedId}
                    ref={refEl}
                    className={`relative h-full overflow-y-auto rounded-3xl border p-4 shadow-[0_22px_50px_rgba(4,14,14,0.12)] sm:p-6 ${
                      side === "left" ? "bg-[#f4efe4]" : "bg-[#edf4f2]"
                    } ${
                      isBetter ? "border-[#1d9a5f] ring-2 ring-[#1d9a5f]/40" : "border-[#d3ddd9]"
                    }`}
                    style={{ opacity: 0 }}
                  >
                    {isBetter && (
                      <span className="absolute right-3 top-3 rounded-full bg-[#1d9a5f] px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.1em] text-white">
                        Better
                      </span>
                    )}
                    <p data-compare-reveal className="text-xs font-semibold uppercase tracking-[0.12em] text-[#4a5c3a]">{side === "left" ? "Point 1" : "Point 2"}</p>
                    <h3 data-compare-reveal className="mt-2 text-xl font-bold text-[#10201f]">{precinct.name}</h3>
                    <div data-compare-reveal className="mt-1 flex items-center gap-1.5 text-xs font-medium text-emerald-700">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      <span>{formatDetailSensorStatus(precinct)}</span>
                    </div>
                    <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
                      <div data-compare-reveal className="col-span-2 rounded-xl border border-[#d9d1c6] bg-white/85 p-3">
                        <p className="text-xs font-medium text-[#456765]">Comfort</p>
                        <p className="text-3xl font-bold tracking-tight text-[#17413f]">
                          {precinct.comfort_score}
                          <span className="ml-1 text-base font-normal text-[#5f8682]">/100</span>
                        </p>
                        <div className="mt-2 h-2 overflow-hidden rounded-full bg-[#d9d1c6]">
                          <div
                            data-compare-score-bar
                            data-target={Math.max(0, Math.min(100, precinct.comfort_score))}
                            className={`h-full rounded-full ${isBetter ? "bg-emerald-500" : "bg-[#7a8f8d]"}`}
                            style={{ width: "0%" }}
                          />
                        </div>
                      </div>
                      <div data-compare-reveal className="rounded-xl border border-[#e7cf9f] bg-gradient-to-br from-amber-50 to-amber-100/60 p-2.5">
                        <div className="mb-1 flex items-center gap-1.5"><Thermometer className="h-3.5 w-3.5 text-amber-600" /><p className="text-xs font-medium text-amber-700">Temp</p></div>
                        <p className="font-bold text-[#9a4b22]">{precinct.temperature !== null ? `${precinct.temperature}°C` : "N/A"}</p>
                      </div>
                      <div data-compare-reveal className="rounded-xl border border-[#bcd8e6] bg-gradient-to-br from-blue-50 to-blue-100/60 p-2.5">
                        <div className="mb-1 flex items-center gap-1.5"><Droplets className="h-3.5 w-3.5 text-blue-600" /><p className="text-xs font-medium text-blue-700">Humidity</p></div>
                        <p className="font-bold text-[#205f86]">{precinct.humidity !== null ? `${precinct.humidity}%` : "N/A"}</p>
                      </div>
                      <div data-compare-reveal className="col-span-2 rounded-xl border border-[#d9d1c6] bg-white/80 p-2.5">
                        <div className="mb-1 flex items-center gap-1.5"><Users className="h-3.5 w-3.5 text-[#5a6c6a]" /><p className="text-xs font-medium text-[#5a6c6a]">Crowd</p></div>
                        <p className="font-bold text-[#5a3f8c]">{precinct.activity_level}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
              </div>
              <div ref={compareBottomRef} className="h-[36%] overflow-y-auto rounded-t-3xl border-t border-[#d3ddd9] bg-[#f5f0e8] px-4 pb-5 pt-4 shadow-[0_-14px_34px_rgba(4,14,14,0.08)] sm:px-6 sm:pb-6 sm:pt-5" style={{ opacity: 0 }}>
                <div data-compare-reveal className="mb-2 flex items-center gap-2 text-sm font-bold uppercase tracking-[0.14em] text-[#4a5c3a]">
                  <TrendingUp className="h-4 w-4 text-emerald-600" />
                  <span>Recommendation</span>
                </div>
                <div data-compare-reveal className="rounded-xl border border-[#d9d1c6] bg-white/85 p-3">
                  <p className="text-sm text-[#10201f]">{comparisonRecommendation.base}</p>
                </div>
                {comparisonRecommendation.nonOptimalNotice && (
                  <div data-compare-reveal className="mt-2 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3">
                    <TrendingDown className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                    <p className="text-sm font-bold text-amber-700">{comparisonRecommendation.nonOptimalNotice}</p>
                  </div>
                )}
                {comparisonRecommendation.staleWarning && (
                  <div data-compare-reveal className="mt-2 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3">
                    <img src={warningIcon} alt="" className="mt-0.5 h-4 w-4 shrink-0 object-contain" aria-hidden="true" />
                    <p className="text-sm font-bold text-red-700">{comparisonRecommendation.staleWarning}</p>
                  </div>
                )}
              </div>
              <div ref={compareCenterRef} className="absolute left-1/2 top-[64%] z-20 -translate-x-1/2 -translate-y-1/2" style={{ opacity: 0 }}>
                <button
                  type="button"
                  onClick={handleResetCompare}
                  className={`rounded-2xl bg-gradient-to-r from-[#006d77] to-[#17413f] px-6 py-3 text-sm font-semibold text-white shadow-[0_16px_36px_rgba(4,14,14,0.24)] transition-all ${compareResetVisible ? "opacity-100" : "opacity-0"}`}
                >
                  <span className="inline-flex items-center gap-2">
                    <RefreshCw className="h-4 w-4" />
                    Reselect
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div
        ref={(el) => {
          if (!el) return;
          floatingUiRefs.current[3] = el;
        }}
        className={`map-bottom-actions fixed bottom-4 left-1/2 z-[460] w-[96vw] max-w-[980px] -translate-x-1/2 transition-all duration-300 ease-out sm:bottom-7 sm:w-[92vw] ${bottomControlsFadeClass}`}
      >
        <div className="map-bottom-actions-row flex items-stretch justify-center gap-2 sm:gap-3">
          <div className="relative map-explore-wrap flex-1">
            {exploreOpen && (
              <div
                ref={explorePanelRef}
                className="absolute bottom-full left-0 z-[420] mb-2 w-full overflow-hidden rounded-lg border border-[#4a5c3a]/25 bg-[#f5f0e8] shadow-[0_-8px_40px_rgba(0,0,0,0.2)] sm:mb-3"
                style={{ opacity: 0, transform: "translateY(14px)" }}
              >
                <div className="border-b border-black/10 px-3 pb-1.5 pt-2.5 text-center sm:px-6 sm:pb-2 sm:pt-3">
                  <div className="font-['Montserrat',sans-serif] text-[9px] font-semibold tracking-[0.24em] uppercase text-[#4a5c3a] sm:text-[10px] sm:tracking-[0.3em]">
                    Explore Map
                  </div>
                  <div className="mt-0.5 text-[9px] text-[#4a5c3a]/80 sm:text-[10px]">Multiple selection enabled</div>
                </div>
                <div className="explore-dropdown-scroll max-h-[34vh] overflow-y-auto py-1 sm:max-h-[40vh]">
                  {exploreFilters.map((filter, index) => (
                    <button
                      ref={(el) => {
                        if (!el) return;
                        exploreItemRefs.current[index] = el;
                      }}
                      key={filter.label}
                      type="button"
                      onClick={() => handleToggleMapFilter(filter.key)}
                      className={`relative flex w-full items-start justify-between border-b border-black/10 px-3 py-1.5 text-left font-['Cormorant_Garamond',serif] text-[12px] font-normal sm:px-4 sm:py-2 sm:text-[14px] ${
                        mapFilters[filter.key]
                          ? "bg-[rgba(74,92,58,0.2)] text-[#2f4430]"
                          : "text-[#2a2a2a]"
                      }`}
                      style={{ opacity: 0, transform: "translateY(10px)" }}
                    >
                      <span className="pr-2 leading-tight break-words whitespace-normal">{filter.label}</span>
                      <span className={`text-xs sm:text-sm ${mapFilters[filter.key] ? "text-[#4a5c3a]" : "text-black/30"}`}>
                        {mapFilters[filter.key] ? "✓" : ""}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}
            <button
              type="button"
              onClick={() => setExploreOpen((open) => !open)}
              className="map-bottom-action-btn flex h-full w-full items-center justify-center gap-2 rounded-sm bg-gradient-to-b from-[#122d2b] to-[#17413f] px-4 py-2 text-[10px] font-medium tracking-[0.18em] uppercase text-white backdrop-blur sm:gap-3 sm:px-6 sm:py-3 sm:text-[11px] sm:tracking-[0.24em]"
            >
              Explore Map
              <span className="text-[10px] opacity-60">{exploreOpen ? "▴" : "▾"}</span>
            </button>
          </div>
          <div className="flex-1">
            <button
              type="button"
              onClick={() => setShowMapGuide(true)}
              className="map-bottom-action-btn map-bottom-tips-btn flex h-full w-full items-center justify-center gap-2 rounded-sm bg-gradient-to-b from-[#122d2b] to-[#17413f] px-3 py-2 text-[10px] font-medium tracking-[0.14em] uppercase text-white backdrop-blur sm:gap-3 sm:px-6 sm:py-3 sm:text-[11px] sm:tracking-[0.24em]"
              aria-label="Open map tips"
              title="Open tips"
            >
              Tips
              <span className="text-[10px] opacity-60">▾</span>
            </button>
          </div>
          <div className="relative map-legend-wrap flex-1">
              {legendDropdownOpen && (
                <div
                  ref={legendPanelRef}
                  className="absolute bottom-full left-0 z-[420] mb-2 w-full overflow-hidden rounded-lg border border-[#4a5c3a]/25 bg-[#f5f0e8] shadow-[0_-8px_40px_rgba(0,0,0,0.2)] sm:mb-3"
                  style={{ opacity: 0, transform: "translateY(14px)" }}
                >
                  <div className="border-b border-black/10 px-3 pb-2 pt-3 text-center sm:px-4">
                    <div className="font-['Montserrat',sans-serif] text-[9px] font-semibold tracking-[0.2em] uppercase text-[#4a5c3a] sm:text-[10px]">
                      Legend
                    </div>
                  </div>
                  <div className="legend-dropdown-scroll max-h-[40vh] overflow-y-auto px-3 py-2 text-[11px] text-[#2a2a2a] sm:max-h-[46vh] sm:px-4 sm:text-xs">
                    {mapFilters.comfortArea && (
                      <>
                        <div data-legend-item className="mb-1 font-semibold text-[#4a5c3a]" style={{ opacity: 0, transform: "translateY(10px)" }}>Comfort Level</div>
                        <div data-legend-item className="mb-1 flex items-start gap-2" style={{ opacity: 0, transform: "translateY(10px)" }}><div className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-[#22c55e]" /><span className="min-w-0 whitespace-normal break-words leading-tight">Comfortable (70-100)</span></div>
                        <div data-legend-item className="mb-1 flex items-start gap-2" style={{ opacity: 0, transform: "translateY(10px)" }}><div className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-[#eab308]" /><span className="min-w-0 whitespace-normal break-words leading-tight">Caution (40-69)</span></div>
                        <div data-legend-item className="mb-2 flex items-start gap-2" style={{ opacity: 0, transform: "translateY(10px)" }}><div className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-[#ef4444]" /><span className="min-w-0 whitespace-normal break-words leading-tight">High Risk (0-39)</span></div>
                        <div data-legend-item className="mb-2 flex items-start gap-2" style={{ opacity: 0, transform: "translateY(10px)" }}><div className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-[#9ca3af]" /><span className="min-w-0 whitespace-normal break-words leading-tight">No sensor data</span></div>
                      </>
                    )}
                    {mapFilters.easePlaces && (
                      <>
                        <div data-legend-item className="mb-1 font-semibold text-[#4a5c3a]" style={{ opacity: 0, transform: "translateY(10px)" }}>Ease Places</div>
                        <div data-legend-item className="mb-1 flex items-start gap-2" style={{ opacity: 0, transform: "translateY(10px)" }}><div className="cp-dot cp-dot-arts !mt-1 !h-2.5 !w-2.5 shrink-0 !shadow-none" /><span className="min-w-0 whitespace-normal break-words leading-tight">Arts, Culture & Enrichment</span></div>
                        <div data-legend-item className="mb-1 flex items-start gap-2" style={{ opacity: 0, transform: "translateY(10px)" }}><div className="cp-dot cp-dot-recreation !mt-1 !h-2.5 !w-2.5 shrink-0 !shadow-none" /><span className="min-w-0 whitespace-normal break-words leading-tight">Recreation / Leisure & Open Spaces</span></div>
                        <div data-legend-item className="mb-1 flex items-start gap-2" style={{ opacity: 0, transform: "translateY(10px)" }}><div className="cp-dot cp-dot-shopping !mt-1 !h-2.5 !w-2.5 shrink-0 !shadow-none" /><span className="min-w-0 whitespace-normal break-words leading-tight">Shopping</span></div>
                        <div data-legend-item className="mb-2 flex items-start gap-2" style={{ opacity: 0, transform: "translateY(10px)" }}><div className="cp-dot cp-dot-food !mt-1 !h-2.5 !w-2.5 shrink-0 !shadow-none" /><span className="min-w-0 whitespace-normal break-words leading-tight">Food & Dining</span></div>
                      </>
                    )}
                    {mapFilters.streetFacilities && (
                      <>
                        <div data-legend-item className="mb-1 font-semibold text-[#4a5c3a]" style={{ opacity: 0, transform: "translateY(10px)" }}>Street Facilities</div>
                        <div data-legend-item className="mb-1 flex items-start gap-2" style={{ opacity: 0, transform: "translateY(10px)" }}><div className="furniture-dot furniture-dot-drinking mt-1 !h-2.5 !w-2.5 shrink-0" /><span className="min-w-0 whitespace-normal break-words leading-tight">Drinking Fountain</span></div>
                        <div data-legend-item className="mb-1 flex items-start gap-2" style={{ opacity: 0, transform: "translateY(10px)" }}><div className="furniture-dot furniture-dot-bike mt-1 !h-2.5 !w-2.5 shrink-0" /><span className="min-w-0 whitespace-normal break-words leading-tight">Bicycle Rack</span></div>
                        <div data-legend-item className="mb-2 flex items-start gap-2" style={{ opacity: 0, transform: "translateY(10px)" }}><div className="furniture-dot furniture-dot-seat mt-1 !h-2.5 !w-2.5 shrink-0" /><span className="min-w-0 whitespace-normal break-words leading-tight">Seat</span></div>
                      </>
                    )}
                    {mapFilters.naturalPlaces && (
                      <>
                        <div data-legend-item className="mb-1 font-semibold text-[#4a5c3a]" style={{ opacity: 0, transform: "translateY(10px)" }}>Natural Places</div>
                        <div data-legend-item className="mb-1 flex items-start gap-2" style={{ opacity: 0, transform: "translateY(10px)" }}><div className="mt-1 h-2.5 w-2.5 shrink-0 border border-blue-900 bg-blue-200" /><span className="min-w-0 whitespace-normal break-words leading-tight">Waterbody</span></div>
                        <div data-legend-item className="mb-2 flex items-start gap-2" style={{ opacity: 0, transform: "translateY(10px)" }}><div className="mt-1 h-2.5 w-2.5 shrink-0 border border-green-900 bg-green-300" /><span className="min-w-0 whitespace-normal break-words leading-tight">Park</span></div>
                      </>
                    )}
                    {!mapFilters.comfortArea && !mapFilters.easePlaces && !mapFilters.streetFacilities && !mapFilters.naturalPlaces && (
                      <div data-legend-item className="py-2 text-[11px] text-[#5f6f64]" style={{ opacity: 0, transform: "translateY(10px)" }}>
                        Turn on a layer in Explore Map to show its legend.
                      </div>
                    )}
                  </div>
                </div>
              )}
              <button
                type="button"
                onClick={() => setLegendDropdownOpen((open) => !open)}
                className={`map-bottom-action-btn flex h-full w-full items-center justify-center gap-2 rounded-sm bg-gradient-to-b from-[#122d2b] to-[#17413f] px-3 py-2 text-[10px] font-medium tracking-[0.14em] uppercase text-white backdrop-blur sm:gap-3 sm:px-6 sm:py-3 sm:text-[11px] sm:tracking-[0.24em] ${
                  legendDropdownOpen ? "ring-1 ring-white/80" : ""
                }`}
                aria-label="Toggle map legend"
                title="Legend"
              >
                Legend
                <span className="text-[10px] opacity-60">{legendDropdownOpen ? "▴" : "▾"}</span>
              </button>
          </div>
        </div>
      </div>

    </div>
  );

  return (
    <div
      ref={sectionContainerRef}
      onWheel={handleSectionWheel}
      className="fixed inset-0 overflow-y-auto overflow-x-hidden snap-y snap-mandatory bg-[#f7fbfa] text-[#10201f]"
    >
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

      {/* Nav (match risk style) */}
      <div className="fixed top-0 left-0 right-0 z-40 px-3 sm:px-4 pt-2 sm:pt-3 pointer-events-none">
        <div className="pointer-events-auto">
          <AppTopNav
            variant="app"
            className="app-top-nav--lift-right"
            brand={<img src={logoTransparent} alt="Move Comfortly" className="-mt-4 h-40 w-auto object-contain" />}
            onBackToTop={() =>
              sectionContainerRef.current?.scrollTo({ top: 0, left: 0, behavior: "smooth" })
            }
          />
        </div>
      </div>
      <div className="fixed top-16 right-4 z-40 pointer-events-none sm:top-18 sm:right-6">
        <SensorStatusRow loading={loading} error={error} />
      </div>

      {/* Main */}
      <div className="relative z-10 px-4 pb-12 pt-16 sm:px-6 sm:pt-20">
        <div className="grid grid-cols-1 gap-10 sm:gap-14">
          {/* ── View Section (webpage style, no card) ── */}
            <section
              id="map-container-view"
              ref={viewSectionRef}
              className="snap-start min-h-[100dvh] py-6 sm:py-8"
            >
              <div className="mx-auto w-full max-w-[1180px]">
                <div className="p-6 pb-4">
                  <div className="flex items-center justify-between gap-3">
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
                    <button
                      type="button"
                      onClick={() => setShowMapGuide(true)}
                      className="inline-flex items-center gap-2 rounded-xl border border-[#83c5be]/28 bg-[rgba(247,255,253,0.94)] px-4 py-2 text-sm font-semibold text-[#17413f] shadow-[0_12px_28px_rgba(16,32,31,0.08)] transition-all hover:border-[#83c5be]/52 hover:bg-white hover:shadow-[0_16px_34px_rgba(16,32,31,0.12)]"
                      aria-label="Open map tips"
                      title="Open tips"
                    >
                      <img src={ideaIcon} alt="" className="h-4 w-4 object-contain" aria-hidden="true" />
                      <span>Tips</span>
                    </button>
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
              </div>
          </section>

          <div className="mx-auto w-full max-w-[1320px]" id="map-container-compare">
            {/* ── Compare Tab ── */}
            <section ref={compareSectionRef} className="snap-start min-h-[100dvh] border-t border-[#17413f]/10 py-6 sm:py-8">
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
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
