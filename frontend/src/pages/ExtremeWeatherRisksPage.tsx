import { useEffect, useRef, useState, type ReactNode, type WheelEvent } from "react";
import { AnimatePresence, motion } from "motion/react";
import { animate, utils } from "animejs";
import { Flame, CloudRain, Snowflake, ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router";
import AppTopNav from "../components/AppTopNav";
import heatImage from "../assets/Heat.png";
import heavyRainImage from "../assets/Heavy_rain.jpg";
import coldImage from "../assets/Cold.jpg";
import normalBodyImage from "../assets/normal_body.png";
import heatstrokeBodyImage from "../assets/heatstroke_body.png";
import temperatureLegendImage from "../assets/temperature_legend.png";

interface HealthRisk {
  name: string;
  impact: string;
  severity: string;
  whyItHappens: {
    en: string;
  };
  whatYouCanDo: {
    en: string[];
  };
}

interface WeatherType {
  id: number;
  riskId: string;
  name: string;
  description: string;
  color: string;
  segmentImage: string;
  segmentPattern: {
    scale: number;
    offsetX: number;
    offsetY: number;
  };
  heroTitle: string;
  heroIntro: string;
  icon: ReactNode;
  risks: HealthRisk[];
}

function HeatBodyImpactDemo() {
  const [temp, setTemp] = useState(28);
  const [compareSplit, setCompareSplit] = useState(50);
  const [isDraggingSplit, setIsDraggingSplit] = useState(false);
  const compareRef = useRef<HTMLDivElement | null>(null);

  const impactLevel =
    temp >= 40
      ? {
          level: "Extreme",
          color: "text-red-700",
          bg: "bg-red-50 border-red-200",
          notes: [
            "Very high heat stress risk.",
            "Dizziness and rapid fatigue can occur quickly outdoors.",
            "Avoid long walking/cycling exposure and seek cooling immediately.",
          ],
        }
      : temp >= 35
        ? {
            level: "High",
            color: "text-orange-700",
            bg: "bg-orange-50 border-orange-200",
            notes: [
              "High outdoor discomfort and dehydration risk.",
              "Walking and cycling effort feels much harder.",
              "Use shade routes and shorten trip duration.",
            ],
          }
        : temp >= 30
          ? {
              level: "Moderate",
              color: "text-amber-700",
              bg: "bg-amber-50 border-amber-200",
              notes: [
                "Noticeable heat discomfort outdoors.",
                "Fatigue builds up during longer trips.",
                "Carry water and avoid peak afternoon heat.",
              ],
            }
          : {
              level: "Low",
              color: "text-teal-700",
              bg: "bg-teal-50 border-teal-200",
              notes: [
                "Generally manageable heat conditions.",
                "Outdoor comfort is relatively stable.",
                "Normal precautions are still recommended.",
              ],
            };
  const heatStatus =
    temp >= 40
      ? "Skin flushing and heavy sweating likely. Immediate cooling is recommended."
      : temp >= 35
        ? "Noticeable heat stress signs, including fatigue and faster breathing."
        : temp >= 30
          ? "Mild heat load appears, with increased discomfort during movement."
          : "Body signs are generally stable in this temperature range.";

  const updateCompareSplit = (clientX: number) => {
    const host = compareRef.current;
    if (!host) return;
    const rect = host.getBoundingClientRect();
    if (rect.width <= 0) return;
    const next = ((clientX - rect.left) / rect.width) * 100;
    setCompareSplit(Math.max(4, Math.min(96, next)));
  };

  useEffect(() => {
    if (!isDraggingSplit) return;

    const handleMouseMove = (event: MouseEvent) => {
      updateCompareSplit(event.clientX);
    };
    const handleTouchMove = (event: TouchEvent) => {
      const point = event.touches[0];
      if (!point) return;
      updateCompareSplit(point.clientX);
    };
    const handleEnd = () => setIsDraggingSplit(false);

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleEnd);
    window.addEventListener("touchmove", handleTouchMove, { passive: true });
    window.addEventListener("touchend", handleEnd);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleEnd);
      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("touchend", handleEnd);
    };
  }, [isDraggingSplit]);

  return (
    <div className="mt-4 rounded-lg border border-red-200 bg-white p-4">
      <h5 className="text-sm sm:text-base font-bold text-red-900">Heat Impact on Human Body (Interactive)</h5>
      <p className="text-xs sm:text-sm text-red-900/80 mt-1">
        Drag the temperature bar to explore how rising heat can affect outdoor movement comfort.
      </p>

      <div className="mt-3 grid grid-cols-1 sm:grid-cols-[72px_1fr] gap-3 items-start">
        <div className="rounded-md border border-red-200 bg-red-50 py-2 text-center">
          <p className="text-[11px] text-red-800 font-semibold">Temp</p>
          <p className="text-xl font-extrabold text-red-700">{temp}°C</p>
        </div>

        <div>
          <input
            type="range"
            min={20}
            max={45}
            step={1}
            value={temp}
            onChange={(event) => setTemp(Number(event.target.value))}
            className="w-full accent-red-600"
            aria-label="Heat temperature impact slider"
          />
          <div className="mt-1 flex justify-between text-[11px] text-gray-500">
            <span>20°C</span>
            <span>45°C</span>
          </div>
        </div>
      </div>

      <div className={`mt-3 rounded-md border p-3 ${impactLevel.bg}`}>
        <p className={`text-sm font-bold ${impactLevel.color}`}>Impact Level: {impactLevel.level}</p>
        <ul className="mt-1 space-y-1">
          {impactLevel.notes.map((item) => (
            <li key={item} className="text-xs sm:text-sm text-gray-700">• {item}</li>
          ))}
        </ul>
      </div>

      <div className="mt-3 rounded-md border border-red-200 bg-red-50/40 p-3">
        <p className="text-[11px] font-semibold text-red-900">Body response comparison (drag the vertical line)</p>
        <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-3 items-start">
          <div
            ref={compareRef}
            className="relative h-72 sm:h-80 rounded-lg overflow-hidden border border-red-200 bg-white select-none touch-none"
            onMouseDown={(event) => {
              updateCompareSplit(event.clientX);
              setIsDraggingSplit(true);
            }}
            onTouchStart={(event) => {
              const point = event.touches[0];
              if (!point) return;
              updateCompareSplit(point.clientX);
              setIsDraggingSplit(true);
            }}
          >
            <img src={normalBodyImage} alt="Before: normal body condition under regular temperature" className="h-full w-full object-contain bg-white" />
            <div className="absolute inset-0 bg-white/18" />
            <div className="absolute left-2 bottom-2 rounded bg-black/45 px-2 py-1 text-[10px] text-white">Before</div>

            <div className="absolute inset-0" style={{ clipPath: `inset(0 0 0 ${compareSplit}%)` }}>
              <img src={heatstrokeBodyImage} alt="After: body condition under extreme heat" className="h-full w-full object-contain bg-white" />
              <div className="absolute right-2 bottom-2 rounded bg-black/45 px-2 py-1 text-[10px] text-white">After</div>
            </div>

            <div className="absolute inset-y-0 z-20" style={{ left: `${compareSplit}%`, transform: "translateX(-50%)" }}>
              <div className="h-full w-[2px] bg-white/95 shadow-[0_0_0_1px_rgba(0,0,0,0.25)]" />
              <button
                type="button"
                aria-label="Drag to compare before and after"
                className="absolute left-1/2 top-1/2 h-6 w-6 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white bg-red-600/90 text-white text-[10px] font-bold shadow"
              >
                ⇆
              </button>
            </div>

            <div
              className="absolute top-2 left-1/2 -translate-x-1/2 rounded bg-black/45 px-2 py-1 text-[10px] text-white"
              aria-hidden="true"
            >
              Extreme heat preview
            </div>
          </div>
          <div className="space-y-2">
            <img src={temperatureLegendImage} alt="Temperature legend" className="h-72 sm:h-80 w-full rounded border border-red-100 bg-white object-contain" />
            <p className="text-xs sm:text-sm text-red-900/90 leading-relaxed">{heatStatus}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function HeavyRainBodyImpactDemo() {
  const [rain, setRain] = useState(10);

  const impactLevel =
    rain >= 35
      ? {
          level: "Extreme",
          color: "text-blue-800",
          bg: "bg-blue-50 border-blue-200",
          notes: [
            "Severe rain can significantly reduce route safety.",
            "Visibility drops sharply and road conditions worsen.",
            "Avoid exposed routes and postpone non-essential cycling.",
          ],
        }
      : rain >= 20
        ? {
            level: "High",
            color: "text-sky-800",
            bg: "bg-sky-50 border-sky-200",
            notes: [
              "Wet roads increase slipping risk for walking and cycling.",
              "Braking and cornering stability can reduce.",
              "Slow down and choose safer, sheltered paths.",
            ],
          }
        : rain >= 10
          ? {
              level: "Moderate",
              color: "text-cyan-800",
              bg: "bg-cyan-50 border-cyan-200",
              notes: [
                "Travel comfort starts to decline under sustained rain.",
                "Visibility and footing can become inconsistent.",
                "Wear waterproof layers and plan extra travel time.",
              ],
            }
          : {
              level: "Low",
              color: "text-teal-700",
              bg: "bg-teal-50 border-teal-200",
              notes: [
                "Light rain has limited impact on short trips.",
                "Movement remains mostly manageable with preparation.",
                "Basic caution is still recommended outdoors.",
              ],
            };

  return (
    <div className="mt-4 rounded-lg border border-blue-200 bg-white p-4">
      <h5 className="text-sm sm:text-base font-bold text-blue-900">Heavy Rain Outdoor Impact (Interactive)</h5>
      <p className="text-xs sm:text-sm text-blue-900/80 mt-1">
        Drag rainfall intensity to explore how rain affects outdoor movement safety.
      </p>
      <div className="mt-3 grid grid-cols-1 sm:grid-cols-[88px_1fr] gap-3 items-start">
        <div className="rounded-md border border-blue-200 bg-blue-50 py-2 text-center">
          <p className="text-[11px] text-blue-800 font-semibold">Rainfall</p>
          <p className="text-lg font-extrabold text-blue-700">{rain} mm/h</p>
        </div>
        <div>
          <input
            type="range"
            min={0}
            max={45}
            step={1}
            value={rain}
            onChange={(event) => setRain(Number(event.target.value))}
            className="w-full accent-blue-600"
            aria-label="Heavy rain impact slider"
          />
          <div className="mt-1 flex justify-between text-[11px] text-gray-500">
            <span>0</span>
            <span>45 mm/h</span>
          </div>
        </div>
      </div>
      <div className={`mt-3 rounded-md border p-3 ${impactLevel.bg}`}>
        <p className={`text-sm font-bold ${impactLevel.color}`}>Impact Level: {impactLevel.level}</p>
        <ul className="mt-1 space-y-1">
          {impactLevel.notes.map((item) => (
            <li key={item} className="text-xs sm:text-sm text-gray-700">• {item}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function ColdBodyImpactDemo() {
  const [temp, setTemp] = useState(12);

  const impactLevel =
    temp <= 2
      ? {
          level: "Extreme",
          color: "text-indigo-800",
          bg: "bg-indigo-50 border-indigo-200",
          notes: [
            "Very cold conditions can make movement uncomfortable quickly.",
            "Long exposure reduces outdoor tolerance and trip quality.",
            "Limit exposure time and prioritise short, necessary trips.",
          ],
        }
      : temp <= 7
        ? {
            level: "High",
            color: "text-sky-800",
            bg: "bg-sky-50 border-sky-200",
            notes: [
              "Cold air can reduce comfort during walking and cycling.",
              "Hands/face discomfort may increase with longer exposure.",
              "Use warmer layers and reduce total outdoor duration.",
            ],
          }
        : temp <= 12
          ? {
              level: "Moderate",
              color: "text-cyan-800",
              bg: "bg-cyan-50 border-cyan-200",
              notes: [
                "Cool conditions may reduce movement enjoyment.",
                "Comfort can vary by route wind exposure.",
                "Plan shorter routes and keep warm where possible.",
              ],
            }
          : {
              level: "Low",
              color: "text-teal-700",
              bg: "bg-teal-50 border-teal-200",
              notes: [
                "Mild cold has limited effect on short trips.",
                "Outdoor movement remains manageable for most users.",
                "Basic layering is generally sufficient.",
              ],
            };
  return (
    <div className="mt-4 rounded-lg border border-sky-200 bg-white p-4">
      <h5 className="text-sm sm:text-base font-bold text-sky-900">Cold Outdoor Impact (Interactive)</h5>
      <p className="text-xs sm:text-sm text-sky-900/80 mt-1">
        Drag temperature to explore how colder conditions affect comfort and willingness to move.
      </p>
      <div className="mt-3 grid grid-cols-1 sm:grid-cols-[72px_1fr] gap-3 items-start">
        <div className="rounded-md border border-sky-200 bg-sky-50 py-2 text-center">
          <p className="text-[11px] text-sky-800 font-semibold">Temp</p>
          <p className="text-xl font-extrabold text-sky-700">{temp}°C</p>
        </div>
        <div>
          <input
            type="range"
            min={-2}
            max={20}
            step={1}
            value={temp}
            onChange={(event) => setTemp(Number(event.target.value))}
            className="w-full accent-sky-600"
            aria-label="Cold temperature impact slider"
          />
          <div className="mt-1 flex justify-between text-[11px] text-gray-500">
            <span>-2°C</span>
            <span>20°C</span>
          </div>
        </div>
      </div>
      <div className={`mt-3 rounded-md border p-3 ${impactLevel.bg}`}>
        <p className={`text-sm font-bold ${impactLevel.color}`}>Impact Level: {impactLevel.level}</p>
        <ul className="mt-1 space-y-1">
          {impactLevel.notes.map((item) => (
            <li key={item} className="text-xs sm:text-sm text-gray-700">• {item}</li>
          ))}
        </ul>
      </div>

    </div>
  );
}

const weatherTypes: WeatherType[] = [
  {
    id: 0,
    riskId: "heat",
    name: "Heat",
    description: "Very hot weather",
    color: "#ff6b6b",
    segmentImage: heatImage,
    segmentPattern: { scale: 1.45, offsetX: -220, offsetY: -60 },
    heroTitle: "Heat",
    heroIntro:
      "Heat refers to weather conditions where temperatures are significantly higher than normal. It commonly occurs during summer or heatwave periods.",
    icon: <Flame className="size-12" />,
    risks: [
      {
        name: "Heat Stroke",
        impact: "Body temperature becomes too high and may be life-threatening",
        severity: "High",
        whyItHappens: {
          en: "High temperatures make it difficult for the body to cool itself through sweating. This causes body temperature to rise and may lead to heat stroke.",
        },
        whatYouCanDo: {
          en: ["Drink plenty of water to stay hydrated", "Avoid outdoor activities during peak heat hours"],
        },
      },
      {
        name: "Smoke Exposure",
        impact: "High temperatures may increase bushfire risk, smoke affects breathing",
        severity: "Moderate",
        whyItHappens: {
          en: "Heat increases the likelihood of bushfires. Smoke particles enter the respiratory system and affect breathing.",
        },
        whatYouCanDo: {
          en: ["Limit outdoor exposure and stay indoors when possible", "Wear a mask if needed to protect your breathing"],
        },
      },
    ],
  },
  {
    id: 1,
    riskId: "heavy-rain",
    name: "Heavy Rain",
    description: "Very strong rainfall",
    color: "#4dabf7",
    segmentImage: heavyRainImage,
    segmentPattern: { scale: 1.15, offsetX: -60, offsetY: -20 },
    heroTitle: "Heavy Rain",
    heroIntro:
      "Heavy rain refers to intense rainfall over a short period. It often involves continuous or high-volume precipitation.",
    icon: <CloudRain className="size-12" />,
    risks: [
      {
        name: "Flood Risk",
        impact: "May lead to drowning or serious accidents",
        severity: "High",
        whyItHappens: {
          en: "Heavy rainfall leads to water accumulation and flooding. Rising water levels can be dangerous and may cause drowning.",
        },
        whatYouCanDo: {
          en: ["Avoid flooded or low-lying areas", "Follow weather alerts and move to safe places"],
        },
      },
      {
        name: "Infection Risk",
        impact: "Floodwater may contain bacteria and pollutants",
        severity: "Moderate",
        whyItHappens: {
          en: "Floodwater may contain bacteria and contaminants. Contact with it can lead to infections or illness.",
        },
        whatYouCanDo: {
          en: ["Avoid contact with contaminated water", "Maintain hygiene and clean yourself if exposed"],
        },
      },
    ],
  },
  {
    id: 2,
    riskId: "cold",
    name: "Cold",
    description: "Very cold weather",
    color: "#74c0fc",
    segmentImage: coldImage,
    segmentPattern: { scale: 1.35, offsetX: -20, offsetY: -120 },
    heroTitle: "Cold",
    heroIntro:
      "Cold refers to weather conditions where temperatures are significantly lower than normal. It commonly occurs during winter or cold wave periods.",
    icon: <Snowflake className="size-12" />,
    risks: [
      {
        name: "Hypothermia",
        impact: "Can be fatal in severe cases",
        severity: "High",
        whyItHappens: {
          en: "Cold conditions cause the body to lose heat continuously. This lowers body temperature and may become life-threatening.",
        },
        whatYouCanDo: {
          en: ["Wear warm clothing", "Limit time outdoors in cold conditions"],
        },
      },
      {
        name: "Frostbite",
        impact: "Prolonged exposure may damage skin",
        severity: "Moderate",
        whyItHappens: {
          en: "Prolonged exposure to cold damages skin and tissue. In severe cases, it may cause serious injury.",
        },
        whatYouCanDo: {
          en: ["Protect exposed skin (hands, face, feet)", "Avoid prolonged exposure"],
        },
      },
    ],
  },
];

export default function ExtremeWeatherRisksPage() {
  const navigate = useNavigate();
  const [selectedWeather, setSelectedWeather] = useState<number | null>(null);
  const [rotation, setRotation] = useState(0);
  const [hoveredSegment, setHoveredSegment] = useState<number | null>(null);
  const [isSmallScreen, setIsSmallScreen] = useState(false);
  const [viewportWidth, setViewportWidth] = useState(1440);
  const [showPanelDetail, setShowPanelDetail] = useState(false);
  const [isDetailPanelHovered, setIsDetailPanelHovered] = useState(false);
  const [centerVisible, setCenterVisible] = useState(true);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const topSectionRef = useRef<HTMLElement | null>(null);
  const quizSectionRef = useRef<HTMLElement | null>(null);
  const quizIntroRef = useRef<HTMLDivElement | null>(null);
  const wheelLockedRef = useRef(false);
  const [activePanel, setActivePanel] = useState<"ring" | "quiz">("ring");
  const [landingMenuOpen, setLandingMenuOpen] = useState(false);
  const [legendDropdownOpen, setLegendDropdownOpen] = useState(false);
  const [introAnimated, setIntroAnimated] = useState(false);
  const ringIntroRef = useRef<HTMLDivElement | null>(null);
  const ringTitleRef = useRef<HTMLHeadingElement | null>(null);
  const ringDiskRef = useRef<HTMLDivElement | null>(null);
  const detailScrollRef = useRef<HTMLDivElement | null>(null);

  const segmentAngle = 360 / weatherTypes.length;
  const viewSize = isSmallScreen ? 500 : 780;
  const center = viewSize / 2;
  const outerRadius = isSmallScreen ? 205 : 315;
  const innerRadius = isSmallScreen ? 135 : 210;
  const labelRadius = isSmallScreen ? 172 : 268;

  useEffect(() => {
    const check = () => {
      setIsSmallScreen(window.innerWidth < 640);
      setViewportWidth(window.innerWidth);
    };
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => setIntroAnimated(true), 360);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!landingMenuOpen) return;
    setLegendDropdownOpen(false);
  }, [landingMenuOpen]);

  useEffect(() => {
    const host = ringIntroRef.current;
    const title = ringTitleRef.current;
    const disk = ringDiskRef.current;
    if (!host || !title || !disk) return;
    utils.remove([title, disk]);
    if (activePanel !== "ring") return;

    animate(title, {
      opacity: [0, 1],
      translateY: [-14, 0],
      duration: 620,
      ease: "out(3)",
    });

    animate(disk, {
      opacity: [0, 1],
      translateY: [22, 0],
      delay: 260,
      duration: 760,
      ease: "out(3)",
    });
  }, [activePanel]);

  useEffect(() => {
    const node = quizIntroRef.current;
    if (!node) return;
    const items = Array.from(node.querySelectorAll<HTMLElement>("[data-quiz-intro-item]"));
    utils.remove(node);
    utils.remove(items);
    if (activePanel !== "quiz") return;

    animate(node, { opacity: [0, 1], duration: 220, ease: "out(2)" });
    animate(items, {
      opacity: [0, 1],
      translateY: [-16, 0],
      delay: utils.stagger(130, { start: 120 }),
      duration: 560,
      ease: "out(3)",
    });
  }, [activePanel]);

  const detailOffsetX = isSmallScreen
    ? 0
    : viewportWidth < 1280
      ? 56
      : viewportWidth < 1536
        ? 110
        : 180;

  const detailOffsetY = isSmallScreen ? 0 : -56;

  const createSegmentPath = (index: number) => {
    const gap = 4;
    const startAngle = (index * segmentAngle - 90 + gap) * (Math.PI / 180);
    const endAngle = ((index + 1) * segmentAngle - 90 - gap) * (Math.PI / 180);
    const centerX = center;
    const centerY = center;

    const x1 = centerX + outerRadius * Math.cos(startAngle);
    const y1 = centerY + outerRadius * Math.sin(startAngle);
    const x2 = centerX + outerRadius * Math.cos(endAngle);
    const y2 = centerY + outerRadius * Math.sin(endAngle);
    const x3 = centerX + innerRadius * Math.cos(endAngle);
    const y3 = centerY + innerRadius * Math.sin(endAngle);
    const x4 = centerX + innerRadius * Math.cos(startAngle);
    const y4 = centerY + innerRadius * Math.sin(startAngle);

    return `M ${x1} ${y1} A ${outerRadius} ${outerRadius} 0 0 1 ${x2} ${y2} L ${x3} ${y3} A ${innerRadius} ${innerRadius} 0 0 0 ${x4} ${y4} Z`;
  };

  const handleSegmentClick = (index: number) => {
    const nextRotation = -index * segmentAngle - segmentAngle / 2;
    setCenterVisible(false);
    setSelectedWeather(index);
    if (Math.abs(nextRotation - rotation) < 0.001) {
      window.setTimeout(() => setCenterVisible(true), 80);
      return;
    }
    setRotation(nextRotation);
    window.setTimeout(() => setCenterVisible(true), 160);
  };

  const handleLearnMore = () => {
    if (selectedWeather === null) return;
    setShowPanelDetail(true);
  };

  const handleBackToRing = () => {
    if (showPanelDetail) {
      setShowPanelDetail(false);
      return;
    }
    const topSection = topSectionRef.current;
    if (!topSection) return;
    containerRef.current?.scrollTo({ top: topSection.offsetTop, left: 0, behavior: "smooth" });
  };

  const handlePageWheel = (event: WheelEvent<HTMLDivElement>) => {
    if (showPanelDetail && isDetailPanelHovered) {
      event.preventDefault();
      return;
    }
    if (wheelLockedRef.current) return;
    if (Math.abs(event.deltaY) < 8) return;

    const container = containerRef.current;
    const topSection = topSectionRef.current;
    const quizSection = quizSectionRef.current;
    if (!container || !topSection || !quizSection) return;

    event.preventDefault();
    wheelLockedRef.current = true;

    const topRect = topSection.getBoundingClientRect();
    const quizRect = quizSection.getBoundingClientRect();
    const distances = [
      { key: "ring", el: topSection, d: Math.abs(topRect.top) },
      { key: "quiz", el: quizSection, d: Math.abs(quizRect.top) },
    ].sort((a, b) => a.d - b.d);
    const current = distances[0].key;
    setActivePanel(current as "ring" | "quiz");

    if (event.deltaY > 0) {
      if (current === "ring") {
        containerRef.current?.scrollTo({ top: quizSection.offsetTop, left: 0, behavior: "smooth" });
      } else {
        containerRef.current?.scrollTo({ top: quizSection.offsetTop, left: 0, behavior: "smooth" });
      }
    } else {
      if (current === "quiz") {
        setShowPanelDetail(false);
        containerRef.current?.scrollTo({ top: topSection.offsetTop, left: 0, behavior: "smooth" });
      } else {
        containerRef.current?.scrollTo({ top: topSection.offsetTop, left: 0, behavior: "smooth" });
      }
    }

    window.setTimeout(() => {
      wheelLockedRef.current = false;
    }, 520);
  };

  const handleContainerScroll = () => {
    const topSection = topSectionRef.current;
    const quizSection = quizSectionRef.current;
    if (!topSection || !quizSection) return;
    const distances = [
      { key: "ring", d: Math.abs(topSection.getBoundingClientRect().top) },
      { key: "quiz", d: Math.abs(quizSection.getBoundingClientRect().top) },
    ].sort((a, b) => a.d - b.d);
    setActivePanel(distances[0].key as "ring" | "quiz");
  };

  const handleDetailPanelWheel = (event: WheelEvent<HTMLDivElement>) => {
    // While cursor is inside detail panel, keep wheel interaction here.
    event.stopPropagation();
  };

  useEffect(() => {
    if (activePanel !== "ring" && legendDropdownOpen) {
      setLegendDropdownOpen(false);
    }
  }, [activePanel, legendDropdownOpen]);

  useEffect(() => {
    if (!showPanelDetail && isDetailPanelHovered) {
      setIsDetailPanelHovered(false);
    }
  }, [showPanelDetail, isDetailPanelHovered]);

  const selectedWeatherType = selectedWeather !== null ? weatherTypes[selectedWeather] : null;
  const selectedWeatherCenterSummary =
    selectedWeatherType?.riskId === "heat"
      ? {
          title: "HEAT",
          subtitle: "Outdoor movement may feel exhausting",
          severity: "HIGH",
          bullets: ["fatigue", "dehydration risk", "uncomfortable walking"],
        }
      : selectedWeatherType?.riskId === "heavy-rain"
        ? {
            title: "HEAVY RAIN",
            subtitle: "Wet roads may reduce travel safety",
            severity: "MODERATE",
            bullets: ["slippery roads", "reduced visibility", "difficult cycling"],
          }
        : selectedWeatherType?.riskId === "cold"
          ? {
              title: "COLD",
              subtitle: "Cold weather may reduce outdoor comfort",
              severity: "MILD",
              bullets: ["uncomfortable movement", "reduced outdoor willingness", "low comfort"],
            }
          : null;
  const selectedWeatherCaseStudy =
    selectedWeatherType?.riskId === "heavy-rain"
      ? {
            title: "Melbourne has experienced this weather",
            body:
              "14 December 2018 - Flash flooding occurred with roughly 30 mm of rain falling within 15 minutes before 5:45 p.m. during rush hour, flooding roads in inner Melbourne and other suburbs while shutting down most tram lines and train lines in Melbourne's East.",
            sourceHref:
              "https://www.heraldsun.com.au/news/victoria/melbourne-and-surrounding-suburbs-cops-a-soaking-in-peakhour-downpour/news-story/dd3f259ff594dfc3bec9320a94536f46",
            sourceLabel: "Source: Herald Sun report",
            tone: "blue" as const,
          }
      : selectedWeatherType?.riskId === "heat"
        ? {
            title: "Melbourne has experienced this weather",
            body: "4–12 March 2013 - Melbourne faced a 10-day heatwave.",
            sourceHref:
              "https://www.theage.com.au/environment/weather/melbourne-faces-10-day-heatwave-20130306-2fl8a.html",
            sourceLabel: "Source: The Age report",
            tone: "red" as const,
          }
        : selectedWeatherType?.riskId === "cold"
          ? {
              title: "Melbourne has experienced this weather",
              body:
                "Cold mornings in Melbourne can significantly reduce outdoor comfort, especially for longer walking or cycling trips before sunrise.",
              sourceHref: "",
              sourceLabel: "Local seasonal pattern reference",
              tone: "blue" as const,
            }
        : null;

  const selectedWeatherDetailContent =
    selectedWeatherType?.riskId === "heat"
      ? {
          environmentalChanges: [
            "Roads and pavements retain more heat.",
            "Direct sunlight increases outdoor exposure.",
            "Outdoor environments may feel hotter over time.",
          ],
          movementExperience:
            "Long outdoor exposure during hot weather may make walking or cycling feel exhausting.",
          tags: ["outdoor fatigue", "heat exposure", "dehydration risk"],
        }
      : selectedWeatherType?.riskId === "heavy-rain"
        ? {
            environmentalChanges: [
              "Roads become wet and slippery.",
              "Visibility becomes lower during rainfall.",
              "Movement through the city may become slower.",
            ],
            movementExperience:
              "Wet roads and low visibility may make outdoor movement feel slower and more difficult.",
            tags: ["slippery roads", "low visibility", "difficult cycling"],
          }
        : selectedWeatherType?.riskId === "cold"
          ? {
              environmentalChanges: [
                "Cold air changes outdoor comfort.",
                "Outdoor environments feel less inviting.",
                "People may spend less time outdoors.",
              ],
              movementExperience:
                "Cold weather may reduce outdoor comfort and make movement feel less enjoyable.",
              tags: ["low comfort", "cold exposure", "reduced activity"],
            }
          : null;

  return (
    <div
      ref={containerRef}
      onWheel={handlePageWheel}
      onScroll={handleContainerScroll}
      className="h-screen overflow-y-auto overflow-x-hidden snap-y snap-mandatory"
      style={{
        background:
          "linear-gradient(180deg, #122d2b 0%, #eef8f5 16%, #f7fbfa 76%, #dfeee9 100%)",
      }}
    >
      <AppTopNav
        variant="landing"
        landingMode="compact"
        landingTone="dark"
        landingTransitionProgress={1}
        landingOverlayOpen={landingMenuOpen}
        onLandingOverlayOpenChange={setLandingMenuOpen}
        className="app-top-nav--map-overlay"
      />

      <nav
        className="fixed top-0 left-0 z-50 py-3 px-4 sm:py-4 sm:px-6 transition-opacity duration-200"
        style={{
          backgroundColor: "transparent",
          opacity: landingMenuOpen ? 0 : 1,
          pointerEvents: landingMenuOpen ? "none" : "auto",
        }}
      >
        <div className="flex flex-col items-start gap-1.5">
          {([
            { id: "ring", label: "Extreme Weather Panel" },
            { id: "quiz", label: "Start Quiz" },
          ] as const).map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                const sectionMap = {
                  ring: topSectionRef.current,
                  quiz: quizSectionRef.current,
                } as const;
                const target = sectionMap[item.id];
                if (!target) return;
                if (item.id === "ring") setShowPanelDetail(false);
                containerRef.current?.scrollTo({ top: target.offsetTop, left: 0, behavior: "smooth" });
              }}
              className={`px-2.5 py-1 rounded-md text-xs font-semibold border text-left ${
                activePanel === item.id
                  ? "bg-[#17413f] text-white border-[#17413f]"
                  : "text-[#10201f] border-[#17413f]/35 hover:bg-[#17413f]/10"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </nav>

      <section ref={topSectionRef} className="snap-start h-screen pt-12 sm:pt-14">
        <div ref={ringIntroRef} className="relative h-full flex flex-col items-center justify-center px-2 sm:px-4 overflow-hidden">
          <div
            ref={ringDiskRef}
            className="relative z-10"
            style={{
              opacity: introAnimated ? 1 : 0,
              transform: showPanelDetail
                ? `translate(${isSmallScreen ? -175 : -560}px, ${isSmallScreen ? 110 : 165}px) scale(${isSmallScreen ? 0.42 : 0.48})`
                : `translate(0px, ${isSmallScreen ? 30 : 54}px) scale(1)`,
              transition: "transform 520ms cubic-bezier(0.22, 1, 0.36, 1), opacity 360ms ease-out",
            }}
          >
            <motion.svg
            data-testid="weather-ring"
            width={viewSize}
            height={viewSize}
            viewBox={`0 0 ${viewSize} ${viewSize}`}
            className="drop-shadow-2xl w-[min(96vw,780px)] h-auto"
            animate={{ rotate: rotation }}
            transition={{ type: "spring", stiffness: 60, damping: 20, mass: 1.05 }}
            >
            <defs>
              {weatherTypes.map((weather) => (
                <pattern
                  key={`pattern-${weather.id}`}
                  id={`weather-pattern-${weather.id}`}
                  patternUnits="objectBoundingBox"
                  width="1"
                  height="1"
                >
                  <image
                    href={weather.segmentImage}
                    x={weather.segmentPattern.offsetX}
                    y={weather.segmentPattern.offsetY}
                    width={viewSize * weather.segmentPattern.scale}
                    height={viewSize * weather.segmentPattern.scale}
                    preserveAspectRatio="none"
                  />
                </pattern>
              ))}
            </defs>
            {weatherTypes.map((weather, index) => (
              <motion.g
                key={weather.id}
                animate={{
                  scale: hoveredSegment === index ? 1.07 : 1,
                }}
                transition={{ duration: 0.16, ease: "easeOut" }}
                style={{
                  transformOrigin: `${center}px ${center}px`,
                }}
              >
                <motion.path
                  d={createSegmentPath(index)}
                  fill={`url(#weather-pattern-${weather.id})`}
                  stroke="white"
                  strokeWidth={hoveredSegment === index ? 3 : 2}
                  style={{ cursor: "pointer" }}
                  onClick={() => handleSegmentClick(index)}
                  onMouseEnter={() => setHoveredSegment(index)}
                  onMouseLeave={() => setHoveredSegment(null)}
                  initial={false}
                  animate={{ opacity: 1, scale: 1, filter: hoveredSegment === index ? "brightness(1.08)" : "brightness(1)" }}
                  transition={{ duration: 0.1, ease: "easeOut" }}
                />
                <text
                  x={center}
                  y={center}
                  fill="white"
                  fontSize={isSmallScreen ? "13" : "16"}
                  fontWeight="800"
                  fontFamily="'Avenir Next', 'Trebuchet MS', 'Segoe UI', sans-serif"
                  letterSpacing="0.6"
                  paintOrder="stroke"
                  stroke="rgba(0, 0, 0, 0.55)"
                  strokeWidth={isSmallScreen ? "1.4" : "1.8"}
                  textAnchor="middle"
                  transform={`rotate(${index * segmentAngle + segmentAngle / 2}, ${center}, ${center}) translate(0, -${labelRadius})`}
                  style={{ pointerEvents: "none", userSelect: "none" }}
                >
                  {weather.name}
                </text>
              </motion.g>
            ))}
          </motion.svg>

          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <motion.div
              className="w-[min(56vw,390px)] h-[min(56vw,390px)] min-w-[170px] min-h-[170px] sm:min-w-[250px] sm:min-h-[250px] rounded-full flex flex-col items-center justify-center p-2 sm:p-7 lg:p-10 text-center relative overflow-hidden"
              style={{
                background: "#ffffff",
                border: "2px solid rgba(229,231,235,0.9)",
                boxShadow: "0 18px 42px rgba(0,0,0,0.28)",
              }}
              initial={false}
              animate={{
                opacity: centerVisible ? 1 : 0,
                rotate: centerVisible ? 0 : -8,
                scale: centerVisible ? 1 : 0.96,
              }}
              transition={{ type: "spring", stiffness: 120, damping: 16, mass: 0.9 }}
            >
              <AnimatePresence mode="wait">
                {centerVisible && selectedWeather !== null ? (
                  <motion.div
                    key={weatherTypes[selectedWeather].riskId}
                    className="relative z-10 flex flex-col items-center justify-center w-full h-full overflow-hidden max-h-full px-0.5 sm:px-0"
                    initial="hidden"
                    animate="show"
                    exit={{ opacity: 0, rotate: 6, scale: 0.98 }}
                    variants={{
                      hidden: { opacity: 0, rotate: -10, scale: 0.96 },
                      show: {
                        opacity: 1,
                        rotate: 0,
                        scale: 1,
                        transition: { staggerChildren: 0.12, delayChildren: 0.04 },
                      },
                    }}
                  >
                    <motion.div
                      className="relative z-10 flex items-center gap-1.5 sm:gap-3 mb-2 sm:mb-4"
                      variants={{
                        hidden: { opacity: 0, y: 8, rotate: -4 },
                        show: {
                          opacity: 1,
                          y: 0,
                          rotate: 0,
                          transition: { type: "spring", stiffness: 180, damping: 14 }
                        },
                      }}
                    >
                      <h2
                        className="text-[10px] max-[548px]:text-[9px] sm:text-xl lg:text-2xl tracking-wide"
                        style={{
                          color:
                            selectedWeatherCenterSummary?.title === "HEAVY RAIN"
                              ? "#1d4ed8"
                              : weatherTypes[selectedWeather].color,
                          textShadow: `0 2px 10px ${weatherTypes[selectedWeather].color}33`,
                        }}
                      >
                        {selectedWeatherCenterSummary?.title ?? weatherTypes[selectedWeather].name.toUpperCase()}
                      </h2>
                      <motion.button
                        type="button"
                        onClick={handleLearnMore}
                        className="pointer-events-auto px-2 py-0.5 sm:px-4 sm:py-1.5 text-[8px] sm:text-xs rounded-full text-white shadow-lg"
                        style={{
                          background: `linear-gradient(135deg, ${weatherTypes[selectedWeather].color} 0%, ${weatherTypes[selectedWeather].color}cc 100%)`,
                        }}
                        whileHover={{ scale: 1.08 }}
                        whileTap={{ scale: 0.95 }}
                      >
                        Explore Impacts
                      </motion.button>
                    </motion.div>
                    {selectedWeatherCenterSummary && (
                      <motion.div
                        className="relative z-10 w-full px-0.5 sm:px-3 lg:px-4 text-center"
                        variants={{
                          hidden: { opacity: 0, y: 8, rotate: 3 },
                          show: {
                            opacity: 1,
                            y: 0,
                            rotate: 0,
                            transition: { type: "spring", stiffness: 170, damping: 15 }
                          },
                        }}
                      >
                        <p className="text-[7px] max-[548px]:text-[6px] sm:text-[11px] lg:text-xs text-gray-700 leading-relaxed">
                          {selectedWeatherCenterSummary.subtitle}
                        </p>
                        <p className="text-[7px] max-[548px]:text-[6px] sm:text-[11px] lg:text-xs mt-1.5 sm:mt-2">
                          <span className="font-medium text-gray-600">Severity: </span>
                          <span className={`font-semibold ${
                            selectedWeatherCenterSummary.severity === "HIGH"
                              ? "text-red-600"
                              : selectedWeatherCenterSummary.severity === "MODERATE"
                                ? "text-amber-600"
                                : "text-blue-600"
                          }`}>
                            {selectedWeatherCenterSummary.severity}
                          </span>
                        </p>
                        <ul className="mt-1.5 sm:mt-2 space-y-0.5 sm:space-y-1">
                          {selectedWeatherCenterSummary.bullets.map((item) => (
                            <li
                              key={item}
                              className="text-[7px] max-[548px]:text-[6px] sm:text-[11px] lg:text-xs text-gray-700 rounded-md px-1.5 py-0.5 sm:px-2 sm:py-1"
                              style={{
                                backgroundColor: `${weatherTypes[selectedWeather].color}14`,
                              }}
                            >
                              {item}
                            </li>
                          ))}
                        </ul>
                      </motion.div>
                    )}
                  </motion.div>
                ) : centerVisible ? (
                  <motion.div
                    key="empty-state"
                    className="text-gray-400"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2, ease: "easeOut" }}
                  >
                    <p className="text-xs sm:text-base lg:text-lg">Select a weather type</p>
                    <p className="text-[10px] sm:text-sm mt-2 sm:mt-3">Click on the ring segments</p>
                  </motion.div>
                ) : null}
              </AnimatePresence>
            </motion.div>
          </div>
          </div>

          <AnimatePresence>
            {showPanelDetail && selectedWeatherType !== null && (
              <motion.div
                className="pointer-events-none absolute inset-0 z-20 overflow-y-auto px-3 sm:px-4 py-16 sm:py-14"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0, transition: { duration: 0.24, ease: "easeInOut" } }}
                transition={{ duration: 0.36, ease: "easeOut", delay: 0.42 }}
              >
                <motion.div
                  ref={detailScrollRef}
                  onMouseEnter={() => setIsDetailPanelHovered(true)}
                  onMouseLeave={() => setIsDetailPanelHovered(false)}
                  onWheel={handleDetailPanelWheel}
                  className="pointer-events-auto mx-auto w-[min(96vw,64rem)] max-h-[calc(100vh-7rem)] overflow-y-auto rounded-2xl border border-white/30 bg-white/95 shadow-2xl p-4 sm:p-5 lg:p-6"
                  initial={{ opacity: 0, x: 0, y: 0, scale: 0.97 }}
                  animate={{
                    opacity: 1,
                    x: detailOffsetX,
                    y: 0,
                    scale: 1
                  }}
                  exit={{
                    opacity: 0,
                    x: isSmallScreen ? 18 : 56,
                    y: 0,
                    scale: 0.98,
                    transition: { duration: 0.26, ease: [0.4, 0, 0.2, 1] }
                  }}
                  transition={{ duration: 0.64, ease: [0.22, 1, 0.36, 1], delay: 0.48 }}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-xl sm:text-2xl lg:text-3xl font-extrabold" style={{ color: weatherTypes[selectedWeather].color }}>
                        {selectedWeatherType.heroTitle}
                      </h3>
                      <p className="text-sm sm:text-[15px] text-gray-700 mt-1.5 leading-relaxed max-w-3xl">
                        {selectedWeatherType.heroIntro}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowPanelDetail(false)}
                      className="shrink-0 px-3 py-1.5 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-100 transition-colors text-sm"
                    >
                      Back to Panel
                    </button>
                  </div>

                  <div className="mt-4 space-y-3 sm:space-y-4">
                    {selectedWeatherCaseStudy && (
                      <div
                        className={`rounded-lg border p-3.5 sm:p-4 ${
                          selectedWeatherCaseStudy.tone === "amber"
                            ? "border-amber-200 bg-amber-50"
                            : selectedWeatherCaseStudy.tone === "blue"
                              ? "border-blue-200 bg-blue-50"
                              : "border-red-200 bg-red-50"
                        }`}
                      >
                        <h4
                          className={`text-sm sm:text-base font-bold ${
                            selectedWeatherCaseStudy.tone === "amber"
                              ? "text-amber-900"
                              : selectedWeatherCaseStudy.tone === "blue"
                                ? "text-blue-900"
                                : "text-red-900"
                          }`}
                        >
                          {selectedWeatherCaseStudy.title}
                        </h4>
                        <p
                          className={`text-sm mt-1.5 leading-relaxed ${
                            selectedWeatherCaseStudy.tone === "amber"
                              ? "text-amber-900"
                              : selectedWeatherCaseStudy.tone === "blue"
                                ? "text-blue-900"
                                : "text-red-900"
                          }`}
                        >
                          {selectedWeatherCaseStudy.body}
                        </p>
                        {selectedWeatherCaseStudy.sourceHref ? (
                          <p className="text-xs mt-3">
                            <a
                              href={selectedWeatherCaseStudy.sourceHref}
                              target="_blank"
                              rel="noreferrer"
                              className={`underline ${
                                selectedWeatherCaseStudy.tone === "amber"
                                  ? "text-amber-800 hover:text-amber-900"
                                  : selectedWeatherCaseStudy.tone === "blue"
                                    ? "text-blue-800 hover:text-blue-900"
                                    : "text-red-800 hover:text-red-900"
                              }`}
                            >
                              {selectedWeatherCaseStudy.sourceLabel}
                            </a>
                          </p>
                        ) : (
                          <p className="text-xs mt-3 text-blue-800">{selectedWeatherCaseStudy.sourceLabel}</p>
                        )}

                        {selectedWeatherType.riskId === "heat" && <HeatBodyImpactDemo />}
                        {selectedWeatherType.riskId === "heavy-rain" && <HeavyRainBodyImpactDemo />}
                        {selectedWeatherType.riskId === "cold" && <ColdBodyImpactDemo />}
                      </div>
                    )}

                    {selectedWeatherDetailContent && (
                      <div className="rounded-lg border border-gray-200 bg-gray-50 p-3.5 sm:p-4 space-y-3">
                        <div>
                          <h4 className="text-base sm:text-lg font-extrabold text-gray-900">Environmental changes</h4>
                          <ul className="mt-1 space-y-1">
                            {selectedWeatherDetailContent.environmentalChanges.map((item) => (
                              <li key={item} className="text-sm text-gray-700">• {item}</li>
                            ))}
                          </ul>
                        </div>

                        <div>
                          <h5 className="text-sm font-extrabold text-gray-900">Movement experience</h5>
                          <p className="text-sm text-gray-700 mt-1">{selectedWeatherDetailContent.movementExperience}</p>
                        </div>

                        <div>
                          <h5 className="text-sm font-extrabold text-gray-900">Outdoor impact tags</h5>
                          <div className="mt-1.5 flex flex-wrap gap-2">
                            {selectedWeatherDetailContent.tags.map((tag) => (
                              <span
                                key={tag}
                                className="inline-flex items-center rounded-full bg-white border border-gray-300 px-2.5 py-1 text-xs font-semibold text-gray-700"
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </section>
      <section
        ref={quizSectionRef}
        className="snap-start h-screen pt-12 sm:pt-14 border-t border-white/20"
      >
        <div
          ref={quizIntroRef}
          className="h-full px-4 sm:px-6 py-6 sm:py-8"
          style={{ opacity: activePanel === "quiz" ? 1 : 0.72 }}
        >
          <div className="h-full w-full max-w-6xl mx-auto flex flex-col items-center justify-center text-center">
            <h2 data-quiz-intro-item className="text-5xl sm:text-7xl lg:text-8xl font-extrabold text-[#10201f] tracking-wide leading-tight">
              Start Quiz
            </h2>
            <p data-quiz-intro-item className="text-lg sm:text-2xl lg:text-3xl text-[#2d4947] mt-6 max-w-4xl leading-relaxed">
              Want to check how well you understand these risks? Give it a try and see your result.
            </p>
            <button
              data-quiz-intro-item
              type="button"
              onClick={() => navigate("/extreme-weather-risks-quiz")}
              className="mt-10 px-10 py-4 rounded-xl bg-teal-600 text-white text-xl sm:text-2xl font-semibold hover:bg-teal-700 transition-colors shadow-lg shadow-teal-900/40"
            >
              Enter Quiz
            </button>
          </div>
        </div>
      </section>

      {activePanel === "ring" && (
        <div className="fixed bottom-4 left-3 sm:bottom-7 sm:left-6 z-30 w-[min(38vw,160px)] sm:w-[160px]">
          <div className="relative">
            {legendDropdownOpen && (
              <div
                className="fixed bottom-16 left-3 sm:bottom-20 sm:left-6 w-[min(52vw,220px)] sm:w-[220px] overflow-hidden rounded-lg border border-[#4a5c3a]/25 bg-[#f5f0e8] shadow-[0_-8px_40px_rgba(0,0,0,0.2)]"
              >
                <div className="border-b border-black/10 px-3 pb-2 pt-3 text-center sm:px-4">
                  <div className="font-['Montserrat',sans-serif] text-[9px] font-semibold tracking-[0.2em] uppercase text-[#4a5c3a] sm:text-[10px]">
                    Legend
                  </div>
                </div>
                <div className="legend-dropdown-scroll max-h-[24vh] overflow-y-auto px-3 py-2 text-[11px] text-[#2a2a2a] sm:max-h-[28vh] sm:px-4 sm:text-xs">
                  <div className="mb-1 flex items-start gap-2">
                    <span className="mt-[5px] h-2.5 w-2.5 shrink-0 rounded-full bg-red-500" />
                    <span><span className="font-semibold text-red-700">High:</span> May cause severe health risk.</span>
                  </div>
                  <div className="mb-1 flex items-start gap-2">
                    <span className="mt-[5px] h-2.5 w-2.5 shrink-0 rounded-full bg-amber-500" />
                    <span><span className="font-semibold text-amber-700">Moderate:</span> Noticeable impact, usually manageable.</span>
                  </div>
                  <div className="mb-1 flex items-start gap-2">
                    <span className="mt-[5px] h-2.5 w-2.5 shrink-0 rounded-full bg-blue-500" />
                    <span><span className="font-semibold text-blue-700">Mild:</span> Low concern for most people.</span>
                  </div>
                </div>
              </div>
            )}
            <button
              type="button"
              onClick={() => setLegendDropdownOpen((open) => !open)}
              className={`map-bottom-action-btn flex w-full items-center justify-center gap-2 rounded-sm bg-gradient-to-b from-[#122d2b] to-[#17413f] px-3 py-2 text-[10px] font-medium tracking-[0.14em] uppercase text-white backdrop-blur sm:gap-3 sm:px-6 sm:py-3 sm:text-[11px] sm:tracking-[0.24em] ${
                legendDropdownOpen ? "ring-1 ring-white/80" : ""
              }`}
              aria-label="Toggle risk legend"
              title="Legend"
            >
              Legend
              <span className="text-[10px] opacity-60">{legendDropdownOpen ? "▴" : "▾"}</span>
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
