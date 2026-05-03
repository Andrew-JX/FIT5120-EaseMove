import { useEffect, useRef, useState, type ReactNode, type WheelEvent } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Flame, CloudRain, CloudLightning, Snowflake, Sun, ArrowLeft } from "lucide-react";
import { navigateTo } from "../lib/navigation";
import headerImage from "../assets/Melbourne-Extreme-Weather.png";
import heatImage from "../assets/Heat.png";
import heavyRainImage from "../assets/Heavy_rain.jpg";
import stormImage from "../assets/Storm.jpg";
import coldImage from "../assets/Cold.jpg";
import dryImage from "../assets/Dry.jpg";

interface HealthRisk {
  name: string;
  impact: string;
  severity: string;
  whyItHappens: {
    zh: string;
    en: string;
  };
  whatYouCanDo: {
    zh: string[];
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
          zh: "高温环境会让人体难以通过出汗散热。体温持续升高可能导致中暑甚至危及生命。",
          en: "High temperatures make it difficult for the body to cool itself through sweating. This causes body temperature to rise and may lead to heat stroke.",
        },
        whatYouCanDo: {
          zh: ["多喝水，保持身体水分", "避开中午等高温时段，减少户外活动"],
          en: ["Drink plenty of water to stay hydrated", "Avoid outdoor activities during peak heat hours"],
        },
      },
      {
        name: "Smoke Exposure",
        impact: "High temperatures may increase bushfire risk, smoke affects breathing",
        severity: "Moderate",
        whyItHappens: {
          zh: "高温会增加山火发生的可能性。烟雾中的颗粒物进入呼吸道，会影响呼吸系统。",
          en: "Heat increases the likelihood of bushfires. Smoke particles enter the respiratory system and affect breathing.",
        },
        whatYouCanDo: {
          zh: ["减少户外活动，尽量待在室内", "必要时佩戴口罩保护呼吸道"],
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
          zh: "持续强降雨会导致大量积水或洪水。水位迅速上升可能对人体造成危险甚至溺水。",
          en: "Heavy rainfall leads to water accumulation and flooding. Rising water levels can be dangerous and may cause drowning.",
        },
        whatYouCanDo: {
          zh: ["避免进入积水或低洼区域", "关注天气预警并及时避险"],
          en: ["Avoid flooded or low-lying areas", "Follow weather alerts and move to safe places"],
        },
      },
      {
        name: "Infection Risk",
        impact: "Floodwater may contain bacteria and pollutants",
        severity: "Moderate",
        whyItHappens: {
          zh: "积水可能含有细菌或污染物。与这些水接触可能引发感染或身体不适。",
          en: "Floodwater may contain bacteria and contaminants. Contact with it can lead to infections or illness.",
        },
        whatYouCanDo: {
          zh: ["避免接触脏水或积水", "注意个人卫生，及时清洁身体"],
          en: ["Avoid contact with contaminated water", "Maintain hygiene and clean yourself if exposed"],
        },
      },
    ],
  },
  {
    id: 2,
    riskId: "storm",
    name: "Storm",
    description: "Thunder and strong winds",
    color: "#845ef7",
    segmentImage: stormImage,
    segmentPattern: { scale: 1.55, offsetX: -120, offsetY: -210 },
    heroTitle: "Storm",
    heroIntro:
      "A storm is a weather event that includes lightning, strong winds, and often rain. It is usually caused by unstable atmospheric conditions.",
    icon: <CloudLightning className="size-12" />,
    risks: [
      {
        name: "Lightning Strike",
        impact: "Can be life-threatening",
        severity: "High",
        whyItHappens: {
          zh: "雷暴会产生强电流的闪电。电流通过人体可能造成严重伤害甚至死亡。",
          en: "Storms produce lightning with strong electrical currents. These currents can pass through the body and cause serious injury or death.",
        },
        whatYouCanDo: {
          zh: ["避免在空旷地区停留", "尽量进入室内避险"],
          en: ["Avoid staying in open areas", "Seek shelter indoors immediately"],
        },
      },
      {
        name: "Strong Winds",
        impact: "May cause injury from strong winds or falling objects",
        severity: "High",
        whyItHappens: {
          zh: "强风可能吹动或击落物体。被这些物体击中可能导致身体受伤。",
          en: "Strong winds can move or drop objects. Being hit by these objects may cause injury.",
        },
        whatYouCanDo: {
          zh: ["远离不稳定物体或高处结构", "尽量待在室内"],
          en: ["Stay away from unstable structures", "Remain indoors if possible"],
        },
      },
    ],
  },
  {
    id: 3,
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
          zh: "寒冷环境会使人体持续失去热量。体温下降可能影响身体功能甚至危及生命。",
          en: "Cold conditions cause the body to lose heat continuously. This lowers body temperature and may become life-threatening.",
        },
        whatYouCanDo: {
          zh: ["穿保暖衣物，减少暴露", "缩短在寒冷环境中的时间"],
          en: ["Wear warm clothing", "Limit time outdoors in cold conditions"],
        },
      },
      {
        name: "Frostbite",
        impact: "Prolonged exposure may damage skin",
        severity: "Moderate",
        whyItHappens: {
          zh: "长时间暴露在低温下会损伤皮肤和组织。严重时可能导致组织损伤。",
          en: "Prolonged exposure to cold damages skin and tissue. In severe cases, it may cause serious injury.",
        },
        whatYouCanDo: {
          zh: ["保护手脚等暴露部位", "避免长时间暴露在寒冷中"],
          en: ["Protect exposed skin (hands, face, feet)", "Avoid prolonged exposure"],
        },
      },
    ],
  },
  {
    id: 4,
    riskId: "dry-conditions",
    name: "Dry Conditions",
    description: "Very little rain",
    color: "#ffd43b",
    segmentImage: dryImage,
    segmentPattern: { scale: 1.6, offsetX: -160, offsetY: -300 },
    heroTitle: "Dry Conditions",
    heroIntro:
      "Dry conditions refer to environments with little rainfall and low humidity. They often occur during droughts or extended dry periods.",
    icon: <Sun className="size-12" />,
    risks: [
      {
        name: "Dehydration",
        impact: "Lack of water affects body function",
        severity: "Moderate",
        whyItHappens: {
          zh: "干燥环境会加速人体水分流失。水分不足会影响身体正常功能。",
          en: "Dry conditions increase water loss from the body. Lack of water affects normal body function.",
        },
        whatYouCanDo: {
          zh: ["多喝水，保持水分", "避免长时间户外暴露"],
          en: ["Drink plenty of water", "Avoid prolonged outdoor exposure"],
        },
      },
      {
        name: "Respiratory Irritation",
        impact: "Dry air irritates the nose and throat",
        severity: "Moderate",
        whyItHappens: {
          zh: "干燥空气会刺激鼻腔和喉咙。长时间暴露可能引起不适或咳嗽。",
          en: "Dry air irritates the nose and throat. Prolonged exposure may cause discomfort or coughing.",
        },
        whatYouCanDo: {
          zh: ["使用加湿设备改善空气", "多喝水缓解不适"],
          en: ["Use a humidifier", "Stay hydrated"],
        },
      },
    ],
  },
];

export default function ExtremeWeatherRisksPage() {
  const [selectedWeather, setSelectedWeather] = useState<number | null>(null);
  const [rotation, setRotation] = useState(0);
  const [hoveredSegment, setHoveredSegment] = useState<number | null>(null);
  const [isSmallScreen, setIsSmallScreen] = useState(false);
  const detailSectionRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const containerRef = useRef<HTMLDivElement | null>(null);
  const heroSectionRef = useRef<HTMLElement | null>(null);
  const topSectionRef = useRef<HTMLElement | null>(null);
  const detailSectionRef = useRef<HTMLElement | null>(null);
  const quizSectionRef = useRef<HTMLElement | null>(null);
  const detailScrollRef = useRef<HTMLDivElement | null>(null);
  const wheelLockedRef = useRef(false);
  const [activePanel, setActivePanel] = useState<"hero" | "ring" | "detail" | "quiz">("hero");

  const segmentAngle = 360 / weatherTypes.length;
  const viewSize = isSmallScreen ? 500 : 780;
  const center = viewSize / 2;
  const outerRadius = isSmallScreen ? 205 : 315;
  const innerRadius = isSmallScreen ? 135 : 210;
  const labelRadius = isSmallScreen ? 172 : 268;

  useEffect(() => {
    const check = () => setIsSmallScreen(window.innerWidth < 640);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

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
    setSelectedWeather(index);
    setRotation(-index * segmentAngle - segmentAngle / 2);
  };

  const handleLearnMore = (riskId: string) => {
    const detailSection = detailSectionRef.current;
    const detailScroll = detailScrollRef.current;
    const target = detailSectionRefs.current[riskId];
    if (!detailSection || !detailScroll || !target) return;
    detailSection.scrollIntoView({ behavior: "smooth", block: "start" });
    window.setTimeout(() => {
      target.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 420);
  };

  const handleBackToRing = () => {
    const topSection = topSectionRef.current;
    if (!topSection) return;
    topSection.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const handlePageWheel = (event: WheelEvent<HTMLDivElement>) => {
    if (wheelLockedRef.current) return;
    if (Math.abs(event.deltaY) < 8) return;

    const container = containerRef.current;
    const heroSection = heroSectionRef.current;
    const topSection = topSectionRef.current;
    const detailSection = detailSectionRef.current;
    const quizSection = quizSectionRef.current;
    if (!container || !heroSection || !topSection || !detailSection || !quizSection) return;

    event.preventDefault();
    wheelLockedRef.current = true;

    const heroRect = heroSection.getBoundingClientRect();
    const topRect = topSection.getBoundingClientRect();
    const detailRect = detailSection.getBoundingClientRect();
    const quizRect = quizSection.getBoundingClientRect();
    const distances = [
      { key: "hero", el: heroSection, d: Math.abs(heroRect.top) },
      { key: "ring", el: topSection, d: Math.abs(topRect.top) },
      { key: "detail", el: detailSection, d: Math.abs(detailRect.top) },
      { key: "quiz", el: quizSection, d: Math.abs(quizRect.top) },
    ].sort((a, b) => a.d - b.d);
    const current = distances[0].key;
    setActivePanel(current as "hero" | "ring" | "detail" | "quiz");

    if (current === "detail" && detailScrollRef.current) {
      const detailScroll = detailScrollRef.current;
      const maxScrollTop = detailScroll.scrollHeight - detailScroll.clientHeight;
      const canScrollDownInside = event.deltaY > 0 && detailScroll.scrollTop < maxScrollTop - 1;
      const canScrollUpInside = event.deltaY < 0 && detailScroll.scrollTop > 1;
      if (canScrollDownInside || canScrollUpInside) {
        return;
      }
    }

    if (event.deltaY > 0) {
      if (current === "hero") {
        topSection.scrollIntoView({ behavior: "smooth", block: "start" });
      } else if (current === "ring") {
        detailSection.scrollIntoView({ behavior: "smooth", block: "start" });
      } else if (current === "detail") {
        quizSection.scrollIntoView({ behavior: "smooth", block: "start" });
      } else {
        quizSection.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    } else {
      if (current === "quiz") {
        detailSection.scrollIntoView({ behavior: "smooth", block: "start" });
      } else if (current === "detail") {
        topSection.scrollIntoView({ behavior: "smooth", block: "start" });
      } else {
        heroSection.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }

    window.setTimeout(() => {
      wheelLockedRef.current = false;
    }, 520);
  };

  const handleContainerScroll = () => {
    const heroSection = heroSectionRef.current;
    const topSection = topSectionRef.current;
    const detailSection = detailSectionRef.current;
    const quizSection = quizSectionRef.current;
    if (!heroSection || !topSection || !detailSection || !quizSection) return;
    const distances = [
      { key: "hero", d: Math.abs(heroSection.getBoundingClientRect().top) },
      { key: "ring", d: Math.abs(topSection.getBoundingClientRect().top) },
      { key: "detail", d: Math.abs(detailSection.getBoundingClientRect().top) },
      { key: "quiz", d: Math.abs(quizSection.getBoundingClientRect().top) },
    ].sort((a, b) => a.d - b.d);
    setActivePanel(distances[0].key as "hero" | "ring" | "detail" | "quiz");
  };

  return (
    <div
      ref={containerRef}
      onWheel={handlePageWheel}
      onScroll={handleContainerScroll}
      className="h-screen overflow-y-auto overflow-x-hidden snap-y snap-mandatory"
      style={{ backgroundColor: "#081515" }}
    >
      <nav
        className="fixed top-0 left-0 z-30 bg-opacity-80 backdrop-blur-sm py-3 px-4 sm:py-4 sm:px-6"
        style={{ backgroundColor: "rgba(8, 21, 21, 0.8)" }}
      >
        <div className="flex flex-col items-start gap-2">
          <button
            type="button"
            onClick={() => navigateTo("/map")}
            className="flex items-center gap-2 text-white hover:text-gray-300 transition-colors"
          >
            <ArrowLeft className="size-4 sm:size-5" />
            <span className="text-xs sm:text-sm">Back</span>
          </button>
          <div className="flex flex-col items-start gap-1.5">
            {([
              { id: "hero", label: "Extreme Weather Introduction" },
              { id: "ring", label: "Circle" },
              { id: "detail", label: "Risk Detail" },
              { id: "quiz", label: "Start Quiz" },
            ] as const).map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  const sectionMap = {
                    hero: heroSectionRef.current,
                    ring: topSectionRef.current,
                    detail: detailSectionRef.current,
                    quiz: quizSectionRef.current,
                  } as const;
                  const target = sectionMap[item.id];
                  if (!target) return;
                  target.scrollIntoView({ behavior: "smooth", block: "start" });
                }}
                className={`px-2.5 py-1 rounded-md text-xs font-semibold border text-left ${
                  activePanel === item.id
                    ? "bg-white text-[#081515] border-white"
                    : "text-white border-white/40 hover:bg-white/10"
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
      </nav>

      <section ref={heroSectionRef} className="snap-start h-screen pt-12 sm:pt-14">
        <div className="relative w-full h-full overflow-hidden bg-[#081515]">
          <img src={headerImage} alt="Extreme Weather" className="w-full h-full object-contain" />
          <div className="absolute inset-0 bg-black/40 flex flex-col items-start justify-end text-white px-4 sm:px-8 lg:px-12 pb-5 sm:pb-8 lg:pb-12">
            <h1 className="text-3xl sm:text-5xl lg:text-6xl mb-2 sm:mb-3 lg:mb-4">Extreme Weather</h1>
            <p className="text-sm sm:text-lg lg:text-xl max-w-3xl">
              Understanding the risks and impacts of severe weather events on human health and safety
            </p>
          </div>
        </div>
      </section>

      <section ref={topSectionRef} className="snap-start h-screen pt-12 sm:pt-14">
        <div className="h-full flex items-center justify-center px-2 sm:px-4">
          <div className="relative">
          <motion.svg
            width={viewSize}
            height={viewSize}
            viewBox={`0 0 ${viewSize} ${viewSize}`}
            className="drop-shadow-2xl w-[min(96vw,780px)] h-auto"
            animate={{ rotate: rotation }}
            transition={{ duration: 0.58, ease: [0.22, 1, 0.36, 1] }}
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
              className="w-[min(54vw,384px)] h-[min(54vw,384px)] min-w-[170px] min-h-[170px] sm:min-w-[250px] sm:min-h-[250px] rounded-full bg-white shadow-2xl flex flex-col items-center justify-center p-2 sm:p-7 lg:p-10 text-center overflow-hidden"
              initial={false}
            >
              <AnimatePresence mode="wait">
                {selectedWeather !== null ? (
                  <motion.div
                    key={weatherTypes[selectedWeather].riskId}
                    className="flex flex-col items-center justify-center w-full h-full overflow-y-auto max-h-full px-0.5 sm:px-0"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2, ease: "easeOut" }}
                  >
                    <div className="flex items-center gap-1.5 sm:gap-3 mb-2 sm:mb-4">
                      <h2 className="text-[10px] max-[548px]:text-[9px] sm:text-lg lg:text-2xl" style={{ color: weatherTypes[selectedWeather].color }}>
                        {weatherTypes[selectedWeather].name}
                      </h2>
                      <button
                        type="button"
                        onClick={() => handleLearnMore(weatherTypes[selectedWeather].riskId)}
                        className="pointer-events-auto px-1.5 py-0 sm:px-3 sm:py-1 text-[8px] sm:text-xs rounded-full border-2 transition-colors hover:bg-gray-100"
                        style={{
                          borderColor: weatherTypes[selectedWeather].color,
                          color: weatherTypes[selectedWeather].color,
                        }}
                      >
                        Learn More
                      </button>
                    </div>
                    <div className="space-y-1 max-[548px]:space-y-0.5 sm:space-y-3 lg:space-y-4 w-full px-0.5 sm:px-3 lg:px-4">
                      {weatherTypes[selectedWeather].risks.map((risk, idx) => (
                        <div key={idx} className="text-center">
                          <p className="text-[8px] max-[548px]:text-[7px] sm:text-xs lg:text-sm mb-0.5 sm:mb-1">
                            <span className="text-gray-500">Risk Name: </span>
                            <span className="font-medium">{risk.name}</span>
                          </p>
                          <p className="text-[7px] max-[548px]:text-[6px] sm:text-[11px] lg:text-xs text-gray-700 mb-0.5 sm:mb-1 leading-relaxed">
                            <span className="text-gray-500">Impact on Human Body: </span>
                            {risk.impact}
                          </p>
                          <p className="text-[7px] max-[548px]:text-[6px] sm:text-[11px] lg:text-xs">
                            <span className={`font-medium ${risk.severity === "High" ? "text-red-600" : "text-amber-600"}`}>
                              Severity: {risk.severity}
                            </span>
                        </p>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                ) : (
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
                )}
              </AnimatePresence>
            </motion.div>
          </div>
          </div>
        </div>
      </section>

      <section
        ref={detailSectionRef}
        className="snap-start h-screen pt-12 sm:pt-14 border-t border-white/20"
      >
        <div ref={detailScrollRef} className="h-full overflow-y-auto px-4 sm:px-6 py-8 sm:py-10">
          <div className="max-w-6xl mx-auto mb-4 sm:mb-6 grid grid-cols-3 items-center">
            <div className="justify-self-start">
              <button
                type="button"
                onClick={handleBackToRing}
                className="px-3 py-1.5 rounded-lg border border-white/40 text-white hover:bg-white/10 transition-colors text-xs sm:text-sm"
              >
                ← Back to Circle
              </button>
            </div>
            <div className="justify-self-center text-center">
              <h2 className="text-base sm:text-lg font-bold text-white">
                {selectedWeather !== null ? `${weatherTypes[selectedWeather].name} Risks` : "Risk Details"}
              </h2>
            </div>
            <div />
          </div>
          <div className="max-w-6xl mx-auto space-y-4 sm:space-y-6">
          {weatherTypes.map((weather) => (
            <div
              key={weather.riskId}
              ref={(element) => {
                detailSectionRefs.current[weather.riskId] = element;
              }}
              className="rounded-xl border border-white/20 bg-white/95 shadow-lg p-5 sm:p-6"
            >
              <div className="mb-3">
                <button
                  type="button"
                  onClick={handleBackToRing}
                  className="px-2.5 py-1 rounded-md border border-gray-300 text-gray-700 hover:bg-gray-100 transition-colors text-xs"
                >
                  ← Back
                </button>
              </div>

              <div className={`mb-4 ${weather.riskId === "storm" || weather.riskId === "heavy-rain" || weather.riskId === "heat" ? "grid grid-cols-1 lg:grid-cols-2 gap-4" : ""}`}>
                <div className="overflow-hidden rounded-lg border border-gray-200 relative">
                  <img
                    src={weather.segmentImage}
                    alt={weather.name}
                    className="w-full h-44 sm:h-52 object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-r from-black/78 via-black/48 to-black/10 flex items-end">
                    <div className="px-4 pb-3 sm:px-5 sm:pb-4 w-full sm:w-1/2">
                      <h2 className="text-white text-xl sm:text-2xl font-bold drop-shadow-[0_2px_6px_rgba(0,0,0,0.8)]">
                        {weather.heroTitle}
                      </h2>
                      <p className="text-gray-100 text-xs sm:text-sm mt-1 max-w-3xl leading-relaxed drop-shadow-[0_2px_6px_rgba(0,0,0,0.85)]">
                        {weather.heroIntro}
                      </p>
                    </div>
                  </div>
                </div>
                {weather.riskId === "storm" && (
                  <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 sm:p-5">
                    <h3 className="text-sm sm:text-base font-bold text-amber-900">Melbourne has experienced this weather</h3>
                    <p className="text-sm text-amber-900 mt-2 leading-relaxed">
                      13 February 2024 - Severe thunderstorms swept across Victoria, causing power outages to over half a million households.
                      Public transportation around metropolitan Melbourne was heavily disrupted as multiple train lines were damaged.
                      One person died during these storms while on a farm in Mirboo North.
                    </p>
                    <p className="text-xs mt-3">
                      <a
                        href="https://www.9news.com.au/national/victoria-news-storms-bring-down-powerlines-and-rip-apart-backyards-in-victoria/3cdd39ee-9648-4c53-80f0-14f9043539e1"
                        target="_blank"
                        rel="noreferrer"
                        className="text-amber-800 underline hover:text-amber-900"
                      >
                        Source: 9News report
                      </a>
                    </p>
                  </div>
                )}
                {weather.riskId === "heavy-rain" && (
                  <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 sm:p-5">
                    <h3 className="text-sm sm:text-base font-bold text-blue-900">Melbourne has experienced this weather</h3>
                    <p className="text-sm text-blue-900 mt-2 leading-relaxed">
                      14 December 2018 - Flash flooding occurred with roughly 30 mm of rain falling within 15 minutes before 5:45 p.m. during rush hour, flooding roads in inner Melbourne and other suburbs while shutting down most tram lines and train lines in Melbourne&apos;s East.
                    </p>
                    <p className="text-xs mt-3">
                      <a
                        href="https://www.heraldsun.com.au/news/victoria/melbourne-and-surrounding-suburbs-cops-a-soaking-in-peakhour-downpour/news-story/dd3f259ff594dfc3bec9320a94536f46"
                        target="_blank"
                        rel="noreferrer"
                        className="text-blue-800 underline hover:text-blue-900"
                      >
                        Source: Herald Sun report
                      </a>
                    </p>
                  </div>
                )}
                {weather.riskId === "heat" && (
                  <div className="rounded-lg border border-red-200 bg-red-50 p-4 sm:p-5">
                    <h3 className="text-sm sm:text-base font-bold text-red-900">Melbourne has experienced this weather</h3>
                    <p className="text-sm text-red-900 mt-2 leading-relaxed">
                      4–12 March 2013 - Melbourne faced a 10-day heatwave.
                    </p>
                    <p className="text-xs mt-3">
                      <a
                        href="https://www.theage.com.au/environment/weather/melbourne-faces-10-day-heatwave-20130306-2fl8a.html"
                        target="_blank"
                        rel="noreferrer"
                        className="text-red-800 underline hover:text-red-900"
                      >
                        Source: The Age report
                      </a>
                    </p>
                  </div>
                )}
              </div>

              <div className="mt-1 space-y-4">
                {weather.risks.map((risk) => (
                  <div key={risk.name} className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                    <h3 className="text-base sm:text-lg font-extrabold text-gray-900">{risk.name}</h3>
                    <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-gray-800">
                          <span className="font-semibold text-gray-600">Impact on Human Body: </span>
                          {risk.impact}
                        </p>
                        <p className="text-sm mt-2">
                          <span className={`font-semibold ${risk.severity === "High" ? "text-red-600" : "text-amber-600"}`}>
                            Severity: {risk.severity}
                          </span>
                        </p>
                      </div>
                      <div>
                        <h4 className="text-sm font-extrabold text-gray-900">Why it happens</h4>
                        <p className="text-sm text-gray-700 mt-1">{risk.whyItHappens.en}</p>
                        <h4 className="text-sm font-extrabold text-gray-900 mt-3">What you can do</h4>
                        <ul className="mt-1 space-y-1">
                          {risk.whatYouCanDo.en.map((item) => (
                            <li key={`en-${risk.name}-${item}`} className="text-sm text-gray-700">• {item}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
          </div>
        </div>
      </section>

      <section
        ref={quizSectionRef}
        className="snap-start h-screen pt-12 sm:pt-14 border-t border-white/20"
      >
        <div className="h-full px-4 sm:px-6 py-6 sm:py-8">
          <div className="h-full w-full max-w-6xl mx-auto flex flex-col items-center justify-center text-center">
            <h2 className="text-5xl sm:text-7xl lg:text-8xl font-extrabold text-white tracking-wide leading-tight">
              Start Quiz
            </h2>
            <p className="text-lg sm:text-2xl lg:text-3xl text-gray-200 mt-6 max-w-4xl leading-relaxed">
              Want to check how well you understand these risks? Give it a try and see your result.
            </p>
            <button
              type="button"
              onClick={() => navigateTo("/extreme-weather-risks-quiz")}
              className="mt-10 px-10 py-4 rounded-xl bg-teal-600 text-white text-xl sm:text-2xl font-semibold hover:bg-teal-700 transition-colors shadow-lg shadow-teal-900/40"
            >
              Enter Quiz
            </button>
          </div>
        </div>
      </section>

      {activePanel !== "quiz" && (
        <div className="fixed right-4 bottom-4 z-30 w-64 rounded-lg border border-white/30 bg-black/70 p-3 text-xs leading-5 text-white backdrop-blur-sm">
          <p><span className="font-semibold text-red-300">High:</span> May cause fainting or even life-threatening conditions.</p>
          <p className="mt-1"><span className="font-semibold text-amber-300">Moderate:</span> Affects body condition but can usually be relieved.</p>
          <p className="mt-1"><span className="font-semibold text-blue-300">Mild:</span> Generally low concern in normal situations.</p>
        </div>
      )}
    </div>
  );
}
