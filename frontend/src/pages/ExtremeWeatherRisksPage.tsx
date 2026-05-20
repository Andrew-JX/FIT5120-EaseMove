import { useEffect, useMemo, useRef, useState, type PointerEvent, type WheelEvent } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { useNavigate } from "react-router";
import AppTopNav from "../components/AppTopNav";
import heatImage from "../assets/heat.gif";
import heavyRainImage from "../assets/heavyRain.gif";
import coldImage from "../assets/cold.gif";
import normalBodyImage from "../assets/normal_body.png";
import heatstrokeBodyImage from "../assets/heatstroke_body.png";
import temperatureLegendImage from "../assets/temperature_legend.png";

type SectionKey = "risk" | "quiz";
type WeatherRiskId = "heat" | "cold" | "heavy-rain";
type DetailSheetState = "closed" | "half" | "full";

type RiskItem = {
  id: string;
  riskId: WeatherRiskId;
  title: string;
  image: string;
  accent: string;
  glow: string;
};

const RISK_ITEMS: RiskItem[] = [
  { id: "heat-1", riskId: "heat", title: "HEAT", image: heatImage, accent: "#e86b45", glow: "radial-gradient(circle at 50% 40%, rgba(232,107,69,0.11), transparent 60%)" },
  { id: "cold-1", riskId: "cold", title: "COLD", image: coldImage, accent: "#4f91d8", glow: "radial-gradient(circle at 50% 40%, rgba(79,145,216,0.11), transparent 60%)" },
  { id: "rain-1", riskId: "heavy-rain", title: "HEAVY RAIN", image: heavyRainImage, accent: "#1389a6", glow: "radial-gradient(circle at 50% 40%, rgba(19,137,166,0.12), transparent 62%)" },
  { id: "heat-2", riskId: "heat", title: "HEAT", image: heatImage, accent: "#e86b45", glow: "radial-gradient(circle at 50% 40%, rgba(232,107,69,0.11), transparent 60%)" },
  { id: "cold-2", riskId: "cold", title: "COLD", image: coldImage, accent: "#4f91d8", glow: "radial-gradient(circle at 50% 40%, rgba(79,145,216,0.11), transparent 60%)" },
  { id: "rain-2", riskId: "heavy-rain", title: "HEAVY RAIN", image: heavyRainImage, accent: "#1389a6", glow: "radial-gradient(circle at 50% 40%, rgba(19,137,166,0.12), transparent 62%)" },
];

type WeatherDetail = {
  id: WeatherRiskId;
  title: string;
  kicker: string;
  intro: string;
  accent: string;
  image: string;
  risks: {
    name: string;
    impact: string;
    severity: string;
    whyItHappens: string;
    whatYouCanDo: string[];
  }[];
  caseStudy: {
    title: string;
    body: string;
    sourceHref?: string;
    sourceLabel: string;
  };
  environmentalChanges: string[];
  movementExperience: string;
  tags: string[];
};

const WEATHER_DETAILS: Record<WeatherRiskId, WeatherDetail> = {
  heat: {
    id: "heat",
    title: "Heat",
    kicker: "Very hot weather",
    intro:
      "Heat refers to weather conditions where temperatures are significantly higher than normal. It commonly occurs during summer or heatwave periods.",
    accent: "#e86b45",
    image: heatImage,
    risks: [
      {
        name: "Heat Stroke",
        impact: "Body temperature becomes too high and may be life-threatening.",
        severity: "High",
        whyItHappens:
          "High temperatures make it difficult for the body to cool itself through sweating. This causes body temperature to rise and may lead to heat stroke.",
        whatYouCanDo: ["Drink plenty of water to stay hydrated.", "Avoid outdoor activities during peak heat hours."],
      },
      {
        name: "Smoke Exposure",
        impact: "High temperatures may increase bushfire risk, and smoke affects breathing.",
        severity: "Moderate",
        whyItHappens:
          "Heat increases the likelihood of bushfires. Smoke particles enter the respiratory system and affect breathing.",
        whatYouCanDo: ["Limit outdoor exposure and stay indoors when possible.", "Wear a mask if needed to protect your breathing."],
      },
    ],
    caseStudy: {
      title: "Melbourne has experienced this weather",
      body: "4-12 March 2013 - Melbourne faced a 10-day heatwave.",
      sourceHref: "https://www.theage.com.au/environment/weather/melbourne-faces-10-day-heatwave-20130306-2fl8a.html",
      sourceLabel: "Source: The Age report",
    },
    environmentalChanges: [
      "Roads and pavements retain more heat.",
      "Direct sunlight increases outdoor exposure.",
      "Outdoor environments may feel hotter over time.",
    ],
    movementExperience: "Long outdoor exposure during hot weather may make walking or cycling feel exhausting.",
    tags: ["outdoor fatigue", "heat exposure", "dehydration risk"],
  },
  cold: {
    id: "cold",
    title: "Cold",
    kicker: "Very cold weather",
    intro:
      "Cold refers to weather conditions where temperatures are significantly lower than normal. It commonly occurs during winter or cold wave periods.",
    accent: "#4f91d8",
    image: coldImage,
    risks: [
      {
        name: "Hypothermia",
        impact: "Can be fatal in severe cases.",
        severity: "High",
        whyItHappens:
          "Cold conditions cause the body to lose heat continuously. This lowers body temperature and may become life-threatening.",
        whatYouCanDo: ["Wear warm clothing.", "Limit time outdoors in cold conditions."],
      },
      {
        name: "Frostbite",
        impact: "Prolonged exposure may damage skin.",
        severity: "Moderate",
        whyItHappens:
          "Prolonged exposure to cold damages skin and tissue. In severe cases, it may cause serious injury.",
        whatYouCanDo: ["Protect exposed skin such as hands, face, and feet.", "Avoid prolonged exposure."],
      },
    ],
    caseStudy: {
      title: "Melbourne has experienced this weather",
      body: "Cold mornings in Melbourne can significantly reduce outdoor comfort, especially for longer walking or cycling trips before sunrise.",
      sourceLabel: "Local seasonal pattern reference",
    },
    environmentalChanges: [
      "Cold air changes outdoor comfort.",
      "Outdoor environments feel less inviting.",
      "People may spend less time outdoors.",
    ],
    movementExperience: "Cold weather may reduce outdoor comfort and make movement feel less enjoyable.",
    tags: ["low comfort", "cold exposure", "reduced activity"],
  },
  "heavy-rain": {
    id: "heavy-rain",
    title: "Heavy Rain",
    kicker: "Very strong rainfall",
    intro:
      "Heavy rain refers to intense rainfall over a short period. It often involves continuous or high-volume precipitation.",
    accent: "#1389a6",
    image: heavyRainImage,
    risks: [
      {
        name: "Flood Risk",
        impact: "May lead to drowning or serious accidents.",
        severity: "High",
        whyItHappens:
          "Heavy rainfall leads to water accumulation and flooding. Rising water levels can be dangerous and may cause drowning.",
        whatYouCanDo: ["Avoid flooded or low-lying areas.", "Follow weather alerts and move to safe places."],
      },
      {
        name: "Infection Risk",
        impact: "Floodwater may contain bacteria and pollutants.",
        severity: "Moderate",
        whyItHappens:
          "Floodwater may contain bacteria and contaminants. Contact with it can lead to infections or illness.",
        whatYouCanDo: ["Avoid contact with contaminated water.", "Maintain hygiene and clean yourself if exposed."],
      },
    ],
    caseStudy: {
      title: "Melbourne has experienced this weather",
      body:
        "14 December 2018 - Flash flooding occurred with roughly 30 mm of rain falling within 15 minutes before 5:45 p.m. during rush hour, flooding roads in inner Melbourne and other suburbs while shutting down most tram lines and train lines in Melbourne's East.",
      sourceHref:
        "https://www.heraldsun.com.au/news/victoria/melbourne-and-surrounding-suburbs-cops-a-soaking-in-peakhour-downpour/news-story/dd3f259ff594dfc3bec9320a94536f46",
      sourceLabel: "Source: Herald Sun report",
    },
    environmentalChanges: [
      "Roads become wet and slippery.",
      "Visibility becomes lower during rainfall.",
      "Movement through the city may become slower.",
    ],
    movementExperience: "Wet roads and low visibility may make outdoor movement feel slower and more difficult.",
    tags: ["slippery roads", "low visibility", "difficult cycling"],
  },
};

function HeatBodyImpactDemo() {
  const [temp, setTemp] = useState(28);
  const [compareSplit, setCompareSplit] = useState(50);
  const [isDraggingSplit, setIsDraggingSplit] = useState(false);
  const compareRef = useRef<HTMLDivElement | null>(null);

  const impactLevel =
    temp >= 40
      ? {
          label: "Extreme",
          tone: "text-red-700",
          surface: "bg-red-50/90 border-red-200/80",
          notes: [
            "Very high heat stress risk.",
            "Dizziness and rapid fatigue can occur quickly outdoors.",
            "Avoid long walking or cycling exposure and seek cooling immediately.",
          ],
        }
      : temp >= 35
        ? {
            label: "High",
            tone: "text-orange-700",
            surface: "bg-orange-50/90 border-orange-200/80",
            notes: [
              "High outdoor discomfort and dehydration risk.",
              "Walking and cycling effort feels much harder.",
              "Use shade routes and shorten trip duration.",
            ],
          }
        : temp >= 30
          ? {
              label: "Moderate",
              tone: "text-amber-700",
              surface: "bg-amber-50/90 border-amber-200/80",
              notes: [
                "Noticeable heat discomfort outdoors.",
                "Fatigue builds up during longer trips.",
                "Carry water and avoid peak afternoon heat.",
              ],
            }
          : {
              label: "Low",
              tone: "text-teal-700",
              surface: "bg-teal-50/90 border-teal-200/80",
              notes: [
                "Generally manageable heat conditions.",
                "Outdoor comfort is relatively stable.",
                "Normal precautions are still recommended.",
              ],
            };

  const heatStatus =
    temp >= 40
      ? "Skin flushing and heavy sweating are likely. Immediate cooling is recommended."
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
    setCompareSplit(Math.max(6, Math.min(94, next)));
  };

  return (
    <div className="rounded-[28px] border border-[#e86b45]/18 bg-white/72 p-4 shadow-[0_18px_44px_rgba(111,65,42,0.08)]">
      <div className="flex flex-col gap-4 lg:grid lg:grid-cols-[0.9fr_1.1fr]">
        <div>
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#8a4a35]">Interactive heat load</p>
              <h4 className="mt-1 text-2xl font-black tracking-[0.03em] text-[#2b1712]">{temp} deg C</h4>
            </div>
            <span className={`rounded-full border px-3 py-1 text-xs font-black uppercase tracking-[0.16em] ${impactLevel.tone} ${impactLevel.surface}`}>
              {impactLevel.label}
            </span>
          </div>
          <input
            type="range"
            min={20}
            max={45}
            step={1}
            value={temp}
            onChange={(event) => setTemp(Number(event.target.value))}
            className="mt-4 w-full accent-[#e86b45]"
            aria-label="Heat temperature impact slider"
          />
          <div className="mt-1 flex justify-between text-[11px] font-semibold text-[#7a6d66]">
            <span>20 deg C</span>
            <span>45 deg C</span>
          </div>
          <p className="mt-4 text-sm leading-relaxed text-[#455553]">{heatStatus}</p>
          <ul className="mt-3 list-disc space-y-1 pl-5 text-sm leading-relaxed text-[#455553]">
            {impactLevel.notes.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>

        <div className="overflow-hidden rounded-[28px] border border-[#e86b45]/16 bg-[#fffaf6] shadow-[inset_0_1px_0_rgba(255,255,255,0.9)]">
          <div className="border-b border-[#e86b45]/10 px-4 py-3">
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#8a4a35]">Heat body map</p>
          </div>
          <div className="grid gap-0 md:grid-cols-[minmax(0,1fr)_176px]">
            <div
              ref={compareRef}
              className="relative h-72 overflow-hidden bg-[radial-gradient(circle_at_50%_36%,rgba(232,107,69,0.1),transparent_58%),linear-gradient(180deg,#fffaf6,#fff1e8)] select-none touch-none"
              onPointerDown={(event) => {
                setIsDraggingSplit(true);
                updateCompareSplit(event.clientX);
                event.currentTarget.setPointerCapture(event.pointerId);
              }}
              onPointerMove={(event) => {
                if (isDraggingSplit) updateCompareSplit(event.clientX);
              }}
              onPointerUp={(event) => {
                setIsDraggingSplit(false);
                if (event.currentTarget.hasPointerCapture(event.pointerId)) {
                  event.currentTarget.releasePointerCapture(event.pointerId);
                }
              }}
              onPointerCancel={() => setIsDraggingSplit(false)}
            >
              <img src={normalBodyImage} alt="Normal body condition under regular temperature" className="h-full w-full object-contain p-3" />
              <div className="absolute inset-0" style={{ clipPath: `inset(0 0 0 ${compareSplit}%)` }}>
                <img src={heatstrokeBodyImage} alt="Body condition under extreme heat" className="h-full w-full object-contain bg-[#fff3ed]/70 p-3" />
              </div>
              <div className="absolute inset-y-0 z-20" style={{ left: `${compareSplit}%`, transform: "translateX(-50%)" }}>
                <div className="h-full w-[2px] bg-white shadow-[0_0_0_1px_rgba(70,34,22,0.22)]" />
                <div className="absolute left-1/2 top-1/2 rounded-full border border-white bg-[#e86b45] px-2 py-1 text-[9px] font-black uppercase tracking-[0.14em] text-white shadow-lg -translate-x-1/2 -translate-y-1/2">
                  Drag
                </div>
              </div>
              <div className="pointer-events-none absolute left-3 top-3 rounded-full border border-white/70 bg-white/70 px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-[#8a4a35] backdrop-blur">
                Before
              </div>
              <div className="pointer-events-none absolute right-3 top-3 rounded-full border border-white/70 bg-[#e86b45]/88 px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-white backdrop-blur">
                Heat stress
              </div>
            </div>

            <aside className="flex border-t border-[#e86b45]/10 bg-white/70 p-3 md:border-l md:border-t-0">
              <div className="grid w-full grid-cols-[86px_1fr] gap-3 md:grid-cols-1">
                <img src={temperatureLegendImage} alt="Temperature legend" className="h-full min-h-40 w-full rounded-[18px] border border-[#e86b45]/10 bg-white object-contain p-1.5 md:h-44" />
                <div className="flex flex-col justify-center">
                  <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#8a4a35]">Legend</p>
                  <p className="mt-2 text-xs leading-relaxed text-[#5c4a42]">
                    Use the temperature scale as a quick visual key while dragging the body comparison.
                  </p>
                  <div className="mt-3 h-2 rounded-full bg-gradient-to-r from-[#73c6df] via-[#ffd166] to-[#e86b45]" />
                  <div className="mt-1 flex justify-between text-[9px] font-bold uppercase tracking-[0.12em] text-[#7a6d66]">
                    <span>Cool</span>
                    <span>Hot</span>
                  </div>
                </div>
              </div>
            </aside>
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
          label: "Extreme",
          tone: "text-blue-900",
          surface: "bg-blue-50/90 border-blue-200/80",
          notes: [
            "Severe rain can significantly reduce route safety.",
            "Visibility drops sharply and road conditions worsen.",
            "Avoid exposed routes and postpone non-essential cycling.",
          ],
        }
      : rain >= 20
        ? {
            label: "High",
            tone: "text-sky-800",
            surface: "bg-sky-50/90 border-sky-200/80",
            notes: [
              "Wet roads increase slipping risk for walking and cycling.",
              "Braking and cornering stability can reduce.",
              "Slow down and choose safer, sheltered paths.",
            ],
          }
        : rain >= 10
          ? {
              label: "Moderate",
              tone: "text-cyan-800",
              surface: "bg-cyan-50/90 border-cyan-200/80",
              notes: [
                "Travel comfort starts to decline under sustained rain.",
                "Visibility and footing can become inconsistent.",
                "Wear waterproof layers and plan extra travel time.",
              ],
            }
          : {
              label: "Low",
              tone: "text-teal-700",
              surface: "bg-teal-50/90 border-teal-200/80",
              notes: [
                "Light rain has limited impact on short trips.",
                "Movement remains mostly manageable with preparation.",
                "Basic caution is still recommended outdoors.",
              ],
            };

  return (
    <div className="rounded-[28px] border border-[#1389a6]/18 bg-white/72 p-4 shadow-[0_18px_44px_rgba(23,74,86,0.08)]">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#286878]">Interactive rainfall load</p>
          <h4 className="mt-1 text-2xl font-black tracking-[0.03em] text-[#10292f]">{rain} mm/h</h4>
        </div>
        <span className={`w-fit rounded-full border px-3 py-1 text-xs font-black uppercase tracking-[0.16em] ${impactLevel.tone} ${impactLevel.surface}`}>
          {impactLevel.label}
        </span>
      </div>
      <input
        type="range"
        min={0}
        max={45}
        step={1}
        value={rain}
        onChange={(event) => setRain(Number(event.target.value))}
        className="mt-4 w-full accent-[#1389a6]"
        aria-label="Heavy rain impact slider"
      />
      <div className="mt-1 flex justify-between text-[11px] font-semibold text-[#667675]">
        <span>0</span>
        <span>45 mm/h</span>
      </div>
      <ul className="mt-4 grid gap-2 sm:grid-cols-3">
        {impactLevel.notes.map((item) => (
          <li key={item} className="rounded-2xl border border-[#1389a6]/10 bg-[#eef8f5]/80 p-3 text-sm leading-relaxed text-[#455553]">
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

function ColdBodyImpactDemo() {
  const [temp, setTemp] = useState(12);
  const impactLevel =
    temp <= 2
      ? {
          label: "Extreme",
          tone: "text-indigo-800",
          surface: "bg-indigo-50/90 border-indigo-200/80",
          notes: [
            "Very cold conditions can make movement uncomfortable quickly.",
            "Long exposure reduces outdoor tolerance and trip quality.",
            "Limit exposure time and prioritise short, necessary trips.",
          ],
        }
      : temp <= 7
        ? {
            label: "High",
            tone: "text-sky-800",
            surface: "bg-sky-50/90 border-sky-200/80",
            notes: [
              "Cold air can reduce comfort during walking and cycling.",
              "Hands and face discomfort may increase with longer exposure.",
              "Use warmer layers and reduce total outdoor duration.",
            ],
          }
        : temp <= 12
          ? {
              label: "Moderate",
              tone: "text-cyan-800",
              surface: "bg-cyan-50/90 border-cyan-200/80",
              notes: [
                "Cool conditions may reduce movement enjoyment.",
                "Comfort can vary by route wind exposure.",
                "Plan shorter routes and keep warm where possible.",
              ],
            }
          : {
              label: "Low",
              tone: "text-teal-700",
              surface: "bg-teal-50/90 border-teal-200/80",
              notes: [
                "Mild cold has limited effect on short trips.",
                "Outdoor movement remains manageable for most users.",
                "Basic layering is generally sufficient.",
              ],
            };

  return (
    <div className="rounded-[28px] border border-[#4f91d8]/18 bg-white/72 p-4 shadow-[0_18px_44px_rgba(43,78,118,0.08)]">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#416d9f]">Interactive cold load</p>
          <h4 className="mt-1 text-2xl font-black tracking-[0.03em] text-[#14283f]">{temp} deg C</h4>
        </div>
        <span className={`w-fit rounded-full border px-3 py-1 text-xs font-black uppercase tracking-[0.16em] ${impactLevel.tone} ${impactLevel.surface}`}>
          {impactLevel.label}
        </span>
      </div>
      <input
        type="range"
        min={-2}
        max={20}
        step={1}
        value={temp}
        onChange={(event) => setTemp(Number(event.target.value))}
        className="mt-4 w-full accent-[#4f91d8]"
        aria-label="Cold temperature impact slider"
      />
      <div className="mt-1 flex justify-between text-[11px] font-semibold text-[#667675]">
        <span>-2 deg C</span>
        <span>20 deg C</span>
      </div>
      <ul className="mt-4 grid gap-2 sm:grid-cols-3">
        {impactLevel.notes.map((item) => (
          <li key={item} className="rounded-2xl border border-[#4f91d8]/10 bg-[#eef8f5]/80 p-3 text-sm leading-relaxed text-[#455553]">
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

function WeatherImpactDemo({ id }: { id: WeatherRiskId }) {
  if (id === "heat") return <HeatBodyImpactDemo />;
  if (id === "heavy-rain") return <HeavyRainBodyImpactDemo />;
  return <ColdBodyImpactDemo />;
}

function WeatherDetailSheet({
  detail,
  state,
  onExpand,
  onClose,
}: {
  detail: WeatherDetail;
  state: DetailSheetState;
  onExpand: () => void;
  onClose: () => void;
}) {
  const expanded = state === "full";

  return (
    <AnimatePresence>
      {state !== "closed" && (
        <>
          <motion.div
            key="weather-detail-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: expanded ? 0.42 : 0.18 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.24 }}
            className="fixed inset-0 z-[70] bg-[#061313]"
            aria-hidden="true"
          />
          <motion.aside
            key="weather-detail-sheet"
            initial={{ y: "105%" }}
            animate={{ y: 0, height: expanded ? "calc(100dvh - 14px)" : "50dvh" }}
            exit={{ y: "105%" }}
            transition={{ type: "spring", stiffness: 120, damping: 22, mass: 0.9 }}
            onWheel={(event) => event.stopPropagation()}
            className="fixed inset-x-0 bottom-0 z-[80] mx-auto max-w-[1180px] overflow-hidden rounded-t-[34px] border border-white/55 bg-[#f8fbf9]/95 shadow-[0_-30px_80px_rgba(7,24,23,0.34)] backdrop-blur-xl"
            role="dialog"
            aria-modal="true"
            aria-label={`${detail.title} detail`}
            style={{
              boxShadow: `0 -34px 90px rgba(7,24,23,0.34), inset 0 1px 0 rgba(255,255,255,0.72), 0 0 0 1px ${detail.accent}22`,
            }}
          >
            <button
              type="button"
              onClick={expanded ? onClose : onExpand}
              className="absolute left-1/2 top-3 z-20 flex h-11 w-11 -translate-x-1/2 items-center justify-center rounded-full border border-white/70 bg-gradient-to-b from-[#122d2b] to-[#17413f] text-white shadow-[0_14px_34px_rgba(4,14,14,0.28)] transition hover:-translate-y-px hover:brightness-105"
              aria-label={expanded ? "Close detail panel" : "Expand detail panel"}
            >
              {expanded ? <ChevronDown className="h-6 w-6" strokeWidth={2.2} /> : <ChevronUp className="h-6 w-6" strokeWidth={2.2} />}
            </button>

            <div className="h-full overflow-y-auto px-4 pb-8 pt-16 sm:px-7 lg:px-9">
              <div className="grid gap-6 lg:grid-cols-[0.88fr_1.12fr] lg:items-start">
                <div className="relative overflow-hidden rounded-[32px] border border-white/60 bg-[#10201f] shadow-[0_26px_60px_rgba(8,24,23,0.22)]">
                  <img src={detail.image} alt="" aria-hidden="true" className="h-[240px] w-full object-cover sm:h-[320px] lg:h-[430px]" />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#071313]/88 via-[#071313]/22 to-transparent" />
                  <div className="absolute bottom-0 left-0 right-0 p-5 sm:p-7">
                    <p className="text-[10px] font-black uppercase tracking-[0.24em] text-white/72">{detail.kicker}</p>
                    <h3 className="mt-2 text-4xl font-black uppercase tracking-[0.06em] text-white sm:text-5xl" style={{ textShadow: "0 12px 34px rgba(0,0,0,0.42)" }}>
                      {detail.title}
                    </h3>
                    <p className="mt-3 max-w-xl text-sm leading-relaxed text-white/78 sm:text-base">{detail.intro}</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <section className="rounded-[30px] border border-[#17413f]/10 bg-white/78 p-5 shadow-[0_20px_54px_rgba(19,65,63,0.09)]">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-[0.24em] text-[#56706d]">Risk profile</p>
                        <h4 className="mt-1 text-2xl font-black tracking-[0.02em] text-[#10201f]">Health and movement risks</h4>
                      </div>
                      <span className="w-fit rounded-full px-3 py-1 text-xs font-black uppercase tracking-[0.16em] text-white" style={{ backgroundColor: detail.accent }}>
                        {detail.title}
                      </span>
                    </div>
                    <div className="mt-4 grid gap-3 md:grid-cols-2">
                      {detail.risks.map((risk) => (
                        <article key={risk.name} className="rounded-[24px] border border-[#17413f]/10 bg-[#eef8f5]/70 p-4">
                          <div className="flex items-start justify-between gap-3">
                            <h5 className="text-lg font-black text-[#10201f]">{risk.name}</h5>
                            <span className="rounded-full border border-[#17413f]/12 bg-white px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-[#17413f]">
                              {risk.severity}
                            </span>
                          </div>
                          <p className="mt-2 text-sm font-semibold leading-relaxed text-[#455553]">{risk.impact}</p>
                          <p className="mt-3 text-sm leading-relaxed text-[#5c6a68]">{risk.whyItHappens}</p>
                          <ul className="mt-3 list-disc space-y-1 pl-5 text-sm leading-relaxed text-[#455553]">
                            {risk.whatYouCanDo.map((item) => (
                              <li key={item}>{item}</li>
                            ))}
                          </ul>
                        </article>
                      ))}
                    </div>
                  </section>

                  <section className="rounded-[30px] border border-[#17413f]/10 bg-white/72 p-5 shadow-[0_20px_54px_rgba(19,65,63,0.08)]">
                    <p className="text-[10px] font-black uppercase tracking-[0.24em] text-[#56706d]">Melbourne reference</p>
                    <h4 className="mt-1 text-xl font-black text-[#10201f]">{detail.caseStudy.title}</h4>
                    <p className="mt-2 text-sm leading-relaxed text-[#455553]">{detail.caseStudy.body}</p>
                    {detail.caseStudy.sourceHref ? (
                      <a
                        href={detail.caseStudy.sourceHref}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-3 inline-flex rounded-full border border-[#17413f]/12 bg-[#eef8f5] px-3 py-1.5 text-xs font-black uppercase tracking-[0.12em] text-[#17413f] transition hover:-translate-y-px"
                      >
                        {detail.caseStudy.sourceLabel}
                      </a>
                    ) : (
                      <p className="mt-3 text-xs font-bold uppercase tracking-[0.12em] text-[#56706d]">{detail.caseStudy.sourceLabel}</p>
                    )}
                  </section>
                </div>
              </div>

              <div className="mt-5 grid gap-4 lg:grid-cols-[0.95fr_1.05fr]">
                <section className="rounded-[30px] border border-[#17413f]/10 bg-white/72 p-5 shadow-[0_20px_54px_rgba(19,65,63,0.08)]">
                  <p className="text-[10px] font-black uppercase tracking-[0.24em] text-[#56706d]">Outdoor conditions</p>
                  <h4 className="mt-1 text-xl font-black text-[#10201f]">How the environment changes</h4>
                  <ul className="mt-4 space-y-2">
                    {detail.environmentalChanges.map((item) => (
                      <li key={item} className="rounded-2xl border border-[#17413f]/10 bg-[#eef8f5]/80 p-3 text-sm leading-relaxed text-[#455553]">
                        {item}
                      </li>
                    ))}
                  </ul>
                  <div className="mt-4 rounded-2xl border border-[#17413f]/10 bg-white p-4">
                    <h5 className="text-sm font-black uppercase tracking-[0.14em] text-[#17413f]">Movement experience</h5>
                    <p className="mt-2 text-sm leading-relaxed text-[#455553]">{detail.movementExperience}</p>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {detail.tags.map((tag) => (
                      <span key={tag} className="rounded-full border border-[#17413f]/10 bg-white px-3 py-1.5 text-xs font-bold text-[#17413f]">
                        {tag}
                      </span>
                    ))}
                  </div>
                </section>

                <WeatherImpactDemo id={detail.id} />
              </div>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}

function wrapIndex(next: number, len: number): number {
  return ((next % len) + len) % len;
}

function roundToSlot(value: number): number {
  return value < 0 ? Math.ceil(value - 0.5) : Math.floor(value + 0.5);
}

export default function ExtremeWeatherRisksPage() {
  const navigate = useNavigate();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const riskRef = useRef<HTMLElement | null>(null);
  const quizRef = useRef<HTMLElement | null>(null);
  const wheelLockRef = useRef(false);
  const draggingRef = useRef(false);
  const dragStartXRef = useRef(0);
  const dragLastXRef = useRef(0);
  const dragStartPositionRef = useRef(0);
  const dragLastMoveXRef = useRef(0);
  const dragLastMoveTimeRef = useRef(0);
  const dragVelocityRef = useRef(0);
  const wheelAnimationFrameRef = useRef<number | null>(null);
  const wheelPositionRef = useRef(0);
  const suppressClickRef = useRef(false);
  const suppressClickTimeoutRef = useRef<number | null>(null);

  const [activeSection, setActiveSection] = useState<SectionKey>("risk");
  const [wheelPosition, setWheelPosition] = useState(0);
  const [isPointerDragging, setIsPointerDragging] = useState(false);
  const [isWheelAnimating, setIsWheelAnimating] = useState(false);
  const [landingMenuOpen, setLandingMenuOpen] = useState(false);
  const [detailSheetState, setDetailSheetState] = useState<DetailSheetState>("closed");
  const [selectedDetailId, setSelectedDetailId] = useState<WeatherRiskId>("heat");

  const isMobile = typeof window !== "undefined" ? window.innerWidth <= 768 : false;
  const cardDistance = isMobile ? 220 : 340;
  const threshold = 0.4;
  const snappedIndex = roundToSlot(wheelPosition);
  const activeIndex = wrapIndex(snappedIndex, RISK_ITEMS.length);
  const activeRisk = RISK_ITEMS[activeIndex];
  const selectedDetail = WEATHER_DETAILS[selectedDetailId];
  const ringCenter = roundToSlot(wheelPosition);
  const visibleCards = useMemo(
    () => [-4, -3, -2, -1, 0, 1, 2, 3, 4].map((offset) => ringCenter + offset),
    [ringCenter]
  );
  const titleSlots = useMemo(
    () => [-3, -2, -1, 0, 1, 2, 3].map((offset) => ringCenter + offset),
    [ringCenter]
  );

  const selectorOffsets = [-3, -2, -1, 0, 1, 2, 3];

  useEffect(() => {
    return () => {
      if (wheelAnimationFrameRef.current !== null) {
        window.cancelAnimationFrame(wheelAnimationFrameRef.current);
      }
      if (suppressClickTimeoutRef.current !== null) {
        window.clearTimeout(suppressClickTimeoutRef.current);
      }
    };
  }, []);

  const syncWheelPosition = (nextPosition: number) => {
    wheelPositionRef.current = nextPosition;
    setWheelPosition(nextPosition);
  };

  const stopWheelAnimation = () => {
    if (wheelAnimationFrameRef.current !== null) {
      window.cancelAnimationFrame(wheelAnimationFrameRef.current);
      wheelAnimationFrameRef.current = null;
    }
    setIsWheelAnimating(false);
  };

  const suppressNextCardClick = () => {
    suppressClickRef.current = true;
    if (suppressClickTimeoutRef.current !== null) {
      window.clearTimeout(suppressClickTimeoutRef.current);
    }
    suppressClickTimeoutRef.current = window.setTimeout(() => {
      suppressClickRef.current = false;
      suppressClickTimeoutRef.current = null;
    }, 180);
  };

  const animateWheelTo = (targetIndex: number, momentum = 1, fromPosition?: number) => {
    stopWheelAnimation();
    setIsPointerDragging(false);
    setIsWheelAnimating(true);

    const target = roundToSlot(targetIndex);
    const start = fromPosition ?? wheelPositionRef.current;
    const distance = target - start;
    const duration = Math.min(920, Math.max(360, 340 + Math.abs(distance) * 130 + momentum * 120));
    const startedAt = performance.now();

    const tick = (now: number) => {
      const t = Math.min(1, (now - startedAt) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      syncWheelPosition(start + distance * eased);

      if (t < 1) {
        wheelAnimationFrameRef.current = window.requestAnimationFrame(tick);
        return;
      }

      wheelAnimationFrameRef.current = null;
      syncWheelPosition(target);
      setIsWheelAnimating(false);
    };

    wheelAnimationFrameRef.current = window.requestAnimationFrame(tick);
  };

  const goToSection = (key: SectionKey) => {
    const host = containerRef.current;
    if (!host) return;
    const target = key === "risk" ? riskRef.current : quizRef.current;
    if (!target) return;
    host.scrollTo({ top: target.offsetTop, behavior: "smooth" });
    setActiveSection(key);
  };

  const settleToIndex = (targetIndex: number) => {
    animateWheelTo(targetIndex);
  };

  const onDragStart = () => {
    stopWheelAnimation();
    draggingRef.current = true;
    setIsPointerDragging(true);
    dragLastXRef.current = 0;
    dragStartPositionRef.current = wheelPositionRef.current;
    dragLastMoveXRef.current = dragStartXRef.current;
    dragLastMoveTimeRef.current = performance.now();
    dragVelocityRef.current = 0;
  };

  const onDragMove = (clientX: number) => {
    const delta = clientX - dragStartXRef.current;
    const now = performance.now();
    const elapsed = Math.max(1, now - dragLastMoveTimeRef.current);
    const velocity = (clientX - dragLastMoveXRef.current) / elapsed;

    dragLastXRef.current = delta;
    dragLastMoveXRef.current = clientX;
    dragLastMoveTimeRef.current = now;
    dragVelocityRef.current = velocity;
    syncWheelPosition(dragStartPositionRef.current - delta / cardDistance);
  };

  const onDragEnd = () => {
    if (!draggingRef.current) return;

    draggingRef.current = false;
    suppressNextCardClick();

    const progress = dragLastXRef.current / cardDistance;
    const currentPosition = dragStartPositionRef.current - progress;
    const startSnap = roundToSlot(dragStartPositionRef.current);
    const rawTravel = currentPosition - dragStartPositionRef.current;
    const velocityProgress = -dragVelocityRef.current * 280 / cardDistance;
    const shouldAdvance = Math.abs(rawTravel) >= threshold || Math.abs(velocityProgress) >= 0.22;

    syncWheelPosition(currentPosition);

    if (shouldAdvance) {
      const projectedPosition = currentPosition + velocityProgress;
      const direction = projectedPosition >= dragStartPositionRef.current ? 1 : -1;
      let target = roundToSlot(projectedPosition);
      if (target === startSnap && Math.abs(rawTravel) >= threshold) {
        target = startSnap + direction;
      }
      const maxTravel = Math.abs(dragVelocityRef.current) > 1.25 ? 3 : 2;
      const delta = Math.max(-maxTravel, Math.min(maxTravel, target - startSnap));
      animateWheelTo(startSnap + delta, Math.abs(dragVelocityRef.current), currentPosition);
    } else {
      animateWheelTo(startSnap, Math.abs(dragVelocityRef.current), currentPosition);
    }
  };

  const onCardsPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    dragStartXRef.current = event.clientX;
    onDragStart();
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const onCardsPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (!draggingRef.current) return;
    onDragMove(event.clientX);
  };

  const onCardsPointerUp = (event: PointerEvent<HTMLDivElement>) => {
    if (!draggingRef.current) return;
    onDragEnd();
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };

  const onCardClick = (targetIndex: number) => {
    if (suppressClickRef.current || draggingRef.current || isWheelAnimating || Math.abs(targetIndex - wheelPositionRef.current) < 0.18) return;
    animateWheelTo(targetIndex, 0.45);
  };

  const onSectionWheel = (event: WheelEvent<HTMLDivElement>) => {
    if (wheelLockRef.current || Math.abs(event.deltaY) < 20) return;
    event.preventDefault();
    wheelLockRef.current = true;
    if (event.deltaY > 0 && activeSection === "risk") goToSection("quiz");
    if (event.deltaY < 0 && activeSection === "quiz") goToSection("risk");
    window.setTimeout(() => {
      wheelLockRef.current = false;
    }, 420);
  };

  const onScroll = () => {
    const host = containerRef.current;
    const risk = riskRef.current;
    const quiz = quizRef.current;
    if (!host || !risk || !quiz) return;
    const mid = (risk.offsetTop + quiz.offsetTop) / 2;
    setActiveSection(host.scrollTop < mid ? "risk" : "quiz");
  };

  return (
    <div
      ref={containerRef}
      onWheel={onSectionWheel}
      onScroll={onScroll}
      className="fixed inset-0 overflow-y-auto overflow-x-hidden snap-y snap-mandatory"
      style={{ background: "linear-gradient(180deg, #122d2b 0%, #eef8f5 16%, #f7fbfa 76%, #dfeee9 100%)" }}
    >
      <div className="fixed top-0 left-0 right-0 z-40 px-3 sm:px-4 pt-2 sm:pt-3 pointer-events-none">
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
      </div>

      <div className="fixed top-4 left-3 sm:top-6 sm:left-6 z-50 flex flex-col items-start gap-2 pointer-events-auto">
        <button
          type="button"
          onClick={() => goToSection("risk")}
          className={`rounded-sm border bg-gradient-to-b from-[#122d2b] to-[#17413f] px-3 py-1.5 text-[10px] sm:text-xs font-semibold tracking-[0.12em] uppercase text-white shadow-[0_12px_28px_rgba(4,14,14,0.24)] transition hover:-translate-y-px hover:brightness-105 active:translate-y-0 ${
            activeSection === "risk" ? "border-white/25 opacity-100" : "border-white/15 opacity-70"
          }`}
        >
          Extreme Weather
        </button>
        <button
          type="button"
          onClick={() => goToSection("quiz")}
          className={`rounded-sm border bg-gradient-to-b from-[#122d2b] to-[#17413f] px-3 py-1.5 text-[10px] sm:text-xs font-semibold tracking-[0.12em] uppercase text-white shadow-[0_12px_28px_rgba(4,14,14,0.24)] transition hover:-translate-y-px hover:brightness-105 active:translate-y-0 ${
            activeSection === "quiz" ? "border-white/25 opacity-100" : "border-white/15 opacity-70"
          }`}
        >
          Quiz
        </button>
      </div>

      <section ref={riskRef} className="snap-start h-screen pt-16 sm:pt-20">
        <div className="relative h-full overflow-hidden px-3 sm:px-6 pb-4 sm:pb-6">
          <div className="absolute inset-0 pointer-events-none" style={{ background: activeRisk.glow }} />

          <div className="relative h-full flex flex-col">
            <div
              className="flex-[0.56] min-h-0 relative touch-pan-y"
              onPointerDown={onCardsPointerDown}
              onPointerMove={onCardsPointerMove}
              onPointerUp={onCardsPointerUp}
              onPointerCancel={onCardsPointerUp}
              onLostPointerCapture={onCardsPointerUp}
            >
              <div className="relative h-full mx-auto max-w-[980px]">
                {visibleCards.map((virtualIndex) => {
                  const rel = virtualIndex - wheelPosition;
                  if (Math.abs(rel) > 1.36) return null;

                  const risk = RISK_ITEMS[wrapIndex(virtualIndex, RISK_ITEMS.length)];
                  const absRel = Math.min(1.2, Math.abs(rel));
                  const angle = rel * (isMobile ? 38 : 42) * (Math.PI / 180);
                  const x = Math.sin(angle) * (isMobile ? 495 : 956);
                  const y = (1 - Math.cos(angle)) * (isMobile ? 250 : 374);
                  const rotateZ = angle * (180 / Math.PI) * 0.65;
                  const scale = 1;
                  const opacity = 1 - absRel * 0.42;
                  const blur = absRel * 2.6;
                  const zIndex = 30 - Math.round(absRel * 10);

                  return (
                    <motion.button
                      key={virtualIndex}
                      initial={false}
                      type="button"
                      onClick={() => onCardClick(virtualIndex)}
                      className="absolute left-1/2 top-[44%] h-[clamp(180px,36vh,340px)] w-[clamp(210px,50vw,440px)] max-w-[78vw] -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-[24px] border border-white/45 bg-white/80 shadow-[0_24px_58px_rgba(10,24,23,0.22)]"
                      style={{ zIndex }}
                      animate={{ x, y, rotateZ, scale, opacity, filter: `blur(${blur}px)` }}
                      transition={
                        isPointerDragging || isWheelAnimating
                          ? { duration: 0 }
                          : { type: "spring", stiffness: 150, damping: 26, mass: 0.9 }
                      }
                    >
                      <img src={risk.image} alt={risk.title} className="h-full w-full object-cover" />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/34 via-black/10 to-transparent" />
                    </motion.button>
                  );
                })}
              </div>
            </div>

            <div className="flex-[0.2] min-h-0 flex items-center justify-center">
              <div className="w-full max-w-[980px] text-center px-4 sm:px-6">
                <div
                  className="relative mx-auto h-[64px] sm:h-[76px] overflow-hidden"
                  style={{ WebkitMaskImage: "linear-gradient(180deg, transparent 0%, #000 24%, #000 76%, transparent 100%)" }}
                >
                  {titleSlots.map((virtualIndex) => {
                    const rel = virtualIndex - wheelPosition;
                    if (Math.abs(rel) > 1.42) return null;

                    const risk = RISK_ITEMS[wrapIndex(virtualIndex, RISK_ITEMS.length)];
                    const absRel = Math.abs(rel);
                    const y = rel * (isMobile ? 46 : 58);
                    const opacity = 1 - Math.min(0.88, absRel * 0.7);
                    const scale = 1 - Math.min(0.2, absRel * 0.1);
                    const blur = Math.min(3.2, absRel * 1.35);

                    return (
                      <motion.h3
                        key={`title-${virtualIndex}`}
                        initial={false}
                        className="absolute left-0 top-1/2 w-full -translate-y-1/2 text-3xl sm:text-4xl font-extrabold tracking-[0.08em] uppercase"
                        style={{ color: risk.accent }}
                        animate={{ y, opacity, scale, filter: `blur(${blur}px)` }}
                        transition={
                          isPointerDragging || isWheelAnimating
                            ? { duration: 0 }
                            : { type: "spring", stiffness: 160, damping: 24, mass: 0.85 }
                        }
                      >
                        {risk.title}
                      </motion.h3>
                    );
                  })}
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setSelectedDetailId(activeRisk.riskId);
                    setDetailSheetState("half");
                  }}
                  className="mt-2 rounded-full border border-white/30 bg-gradient-to-b from-[#122d2b] to-[#17413f] px-6 py-2.5 text-sm font-semibold uppercase tracking-[0.1em] text-white shadow-[0_14px_30px_rgba(4,14,14,0.22)]"
                >
                  Learn More
                </button>
              </div>
            </div>

            <div className="flex-[0.24] min-h-0 relative">
              <div className="absolute left-1/2 top-2 -translate-x-1/2 h-[150px] sm:h-[170px] w-[min(90vw,360px)]">
                {selectorOffsets.map((offset) => {
                  const rel = offset + snappedIndex - wheelPosition;
                  const t = rel * 0.52;
                  const x = Math.sin(t) * (isMobile ? 62 : 82);
                  const y = (1 - Math.cos(t)) * (isMobile ? 42 : 58);
                  const rotateZ = rel * 11;
                  const absRel = Math.abs(rel);
                  const scale = 1 - Math.min(0.42, absRel * 0.12);
                  const opacity = 1 - Math.min(0.64, absRel * 0.18);
                  const blur = Math.min(2, absRel * 0.42);
                  const idx = wrapIndex(snappedIndex + offset, RISK_ITEMS.length);
                  const active = Math.abs(rel) < 0.28;
                  const z = 10 - Math.round(absRel);

                  return (
                    <motion.button
                      key={`sq-${offset}-${idx}`}
                      initial={false}
                      type="button"
                      onClick={() => {
                        if (draggingRef.current || offset === 0) return;
                        settleToIndex(snappedIndex + offset);
                      }}
                      className="absolute left-1/2 top-0 h-9 w-9 sm:h-10 sm:w-10 -translate-x-1/2 rounded-lg border border-white/55 shadow-[0_10px_22px_rgba(9,22,21,0.2)]"
                      style={{
                        zIndex: z,
                        background: active
                          ? `linear-gradient(145deg, ${activeRisk.accent}, rgba(255,255,255,0.86))`
                          : "linear-gradient(145deg, rgba(255,255,255,0.48), rgba(255,255,255,0.22))",
                      }}
                      animate={{ x, y, rotateZ, scale, opacity, filter: `blur(${blur}px)` }}
                      transition={
                        isPointerDragging || isWheelAnimating
                          ? { duration: 0 }
                          : { type: "spring", stiffness: 150, damping: 26, mass: 0.9 }
                      }
                    />
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section ref={quizRef} className="snap-start h-screen pt-16 sm:pt-20 border-t border-[#17413f]/12">
        <div className="h-full px-4 sm:px-6 py-8">
          <div className="h-full w-full max-w-6xl mx-auto flex flex-col items-center justify-center text-center">
            <h2 className="text-5xl sm:text-7xl lg:text-8xl font-extrabold text-[#10201f] tracking-wide leading-tight">Start Quiz</h2>
            <p className="text-lg sm:text-2xl lg:text-3xl text-[#2d4947] mt-6 max-w-4xl leading-relaxed">
              Want to check how well you understand these risks? Give it a try and see your result.
            </p>
            <button
              type="button"
              onClick={() => navigate("/extreme-weather-risks-quiz")}
              className="mt-10 px-10 py-4 rounded-xl bg-teal-600 text-white text-xl sm:text-2xl font-semibold hover:bg-teal-700 transition-colors shadow-lg shadow-teal-900/40"
            >
              Enter Quiz
            </button>
          </div>
        </div>
      </section>

      <WeatherDetailSheet
        detail={selectedDetail}
        state={detailSheetState}
        onExpand={() => setDetailSheetState("full")}
        onClose={() => setDetailSheetState("closed")}
      />
    </div>
  );
}
