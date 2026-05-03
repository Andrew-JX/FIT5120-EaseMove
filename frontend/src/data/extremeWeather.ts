export type SeverityLevel = "mild" | "moderate" | "high";

export type ExtremeWeatherRisk = {
  id: string;
  shortLabel: string;
  riskName: string;
  impactSummary: string;
  severity: SeverityLevel;
  whyItHappens: string;
  whatYouCanDo: string[];
};

export const extremeWeatherRisks: ExtremeWeatherRisk[] = [
  {
    id: "heat",
    shortLabel: "Heat (Very hot weather)",
    riskName: "Heat Stress",
    impactSummary: "Hot weather can lead to dehydration, dizziness, and heat exhaustion.",
    severity: "high",
    whyItHappens:
      "When temperature is high and your body cannot cool down fast enough, your core temperature rises and puts stress on the body.",
    whatYouCanDo: [
      "Drink water regularly, even before you feel very thirsty.",
      "Plan outdoor trips in cooler morning or evening periods.",
      "Rest in shade or air-conditioned spaces when you feel overheated.",
    ],
  },
  {
    id: "heavy-rain",
    shortLabel: "Heavy Rain (Very strong rainfall)",
    riskName: "Heavy Rain Exposure",
    impactSummary: "Heavy rain can reduce visibility and increase slip and fall risks.",
    severity: "moderate",
    whyItHappens:
      "Strong rainfall makes surfaces wet and slippery, and can quickly reduce your ability to see hazards.",
    whatYouCanDo: [
      "Wear shoes with better grip and walk carefully on wet paths.",
      "Use sheltered routes where possible and avoid flooded areas.",
      "Allow extra travel time and avoid rushing in low-visibility conditions.",
    ],
  },
  {
    id: "storm",
    shortLabel: "Storm (Thunder and strong winds)",
    riskName: "Storm-Related Injury Risk",
    impactSummary: "Storms can cause sudden hazards from lightning, debris, and strong wind gusts.",
    severity: "high",
    whyItHappens:
      "Thunderstorms combine strong wind, lightning, and unstable weather that can create fast-changing outdoor danger.",
    whatYouCanDo: [
      "Move indoors early and avoid open spaces during thunder activity.",
      "Stay away from trees, loose objects, and construction zones.",
      "Delay non-essential outdoor trips until the storm passes.",
    ],
  },
  {
    id: "cold",
    shortLabel: "Cold (Very cold weather)",
    riskName: "Cold Stress",
    impactSummary: "Very cold weather can lower body temperature and reduce comfort and focus.",
    severity: "moderate",
    whyItHappens:
      "Cold air and wind can increase heat loss from the body, especially with long outdoor exposure.",
    whatYouCanDo: [
      "Wear layered clothing and keep hands and head warm.",
      "Limit long outdoor stays and take warm indoor breaks.",
      "Stay dry and change wet clothing quickly.",
    ],
  },
  {
    id: "dry-conditions",
    shortLabel: "Dry Conditions (Very little rain)",
    riskName: "Dry Air Discomfort",
    impactSummary: "Dry conditions can increase dehydration risk and irritation in the eyes, throat, and skin.",
    severity: "mild",
    whyItHappens:
      "Low moisture in the air can dry out body surfaces and increase fluid loss during activity.",
    whatYouCanDo: [
      "Drink water regularly across the day.",
      "Use shade and avoid long exposure during hotter dry periods.",
      "Use protective clothing and eye protection when dust is present.",
    ],
  },
  {
    id: "bushfire-smoke",
    shortLabel: "Bushfire Smoke (Smoky air)",
    riskName: "Smoke Breathing Irritation",
    impactSummary: "Smoky air can irritate breathing and worsen symptoms for people with sensitive lungs.",
    severity: "high",
    whyItHappens:
      "Bushfire smoke contains fine particles that can travel deep into the lungs and reduce air quality quickly.",
    whatYouCanDo: [
      "Reduce outdoor activity and stay indoors when smoke levels are high.",
      "Keep windows closed and monitor local air quality updates.",
      "Use lower-exposure routes and postpone strenuous outdoor exercise.",
    ],
  },
];

export type QuizQuestion = {
  id: string;
  prompt: string;
  options: string[];
  correctIndex: number;
  explanation: string;
};

export const extremeWeatherQuizQuestions: QuizQuestion[] = [
  {
    id: "q1",
    prompt: "During very hot weather, which action is the safest?",
    options: [
      "Drink water and avoid peak heat outdoor hours",
      "Do intense activity at midday",
      "Ignore early heat symptoms",
    ],
    correctIndex: 0,
    explanation: "Hydration and avoiding peak heat reduce risk of heat-related illness.",
  },
  {
    id: "q2",
    prompt: "In heavy rain conditions, what should you do first?",
    options: [
      "Walk through flooded low-lying streets",
      "Avoid flooded areas and follow weather alerts",
      "Run faster to reach destination",
    ],
    correctIndex: 1,
    explanation: "Flooded and low-lying areas are dangerous; weather alerts help you stay safe.",
  },
  {
    id: "q3",
    prompt: "What is the best safety response during a storm with lightning?",
    options: [
      "Stay in open outdoor areas",
      "Seek shelter indoors immediately",
      "Stand near tall trees",
    ],
    correctIndex: 1,
    explanation: "Storm lightning can be life-threatening; indoor shelter is the safest option.",
  },
  {
    id: "q4",
    prompt: "In very cold weather, which action helps prevent hypothermia risk?",
    options: [
      "Wear warm clothing and limit outdoor exposure time",
      "Stay in cold wind for long periods",
      "Wear wet clothes longer",
    ],
    correctIndex: 0,
    explanation: "Warm layers and shorter exposure reduce body heat loss in cold conditions.",
  },
  {
    id: "q5",
    prompt: "Under dry conditions, what is a recommended action?",
    options: [
      "Drink water regularly and avoid prolonged exposure",
      "Avoid drinking water",
      "Ignore throat and nose irritation",
    ],
    correctIndex: 0,
    explanation: "Dry conditions increase dehydration and irritation risk, so hydration is essential.",
  },
];
