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
    id: "q4",
    prompt: "When heavy rain causes surface water, which choice is safer?",
    options: [
      "Walk through low-lying flooded paths to save time",
      "Choose sheltered routes and avoid flooded areas",
      "Keep the same speed and ignore reduced visibility",
    ],
    correctIndex: 1,
    explanation: "Sheltered routes and avoiding flooded areas reduce slipping and water-related hazards.",
  },
  {
    id: "q5",
    prompt: "In hot weather, which early body sign should you treat as a warning?",
    options: [
      "Dizziness and unusual fatigue",
      "Feeling slightly hungry",
      "Mild boredom while walking",
    ],
    correctIndex: 0,
    explanation: "Dizziness and fatigue are early heat stress signs and should be addressed quickly.",
  },
  {
    id: "q6",
    prompt: "For cold weather trips, what helps keep body heat more effectively?",
    options: [
      "A single thin layer",
      "Layered clothing and keeping exposed skin protected",
      "Wearing damp clothing for flexibility",
    ],
    correctIndex: 1,
    explanation: "Layering and protecting exposed areas reduce heat loss in cold air and wind.",
  },
  {
    id: "q7",
    prompt: "Which statement best matches the heavy rain movement impact shown in the risk panel?",
    options: [
      "Wet roads can reduce visibility and increase slipping risk",
      "Rain improves road grip and travel speed",
      "Heavy rain has no impact on walking or cycling comfort",
    ],
    correctIndex: 0,
    explanation: "Heavy rain commonly lowers visibility and increases slipping risk on wet surfaces.",
  },
  {
    id: "q8",
    prompt: "If you feel overheated during outdoor activity, what is the best immediate action?",
    options: [
      "Continue until the trip ends",
      "Rest in shade or a cool indoor space and rehydrate",
      "Wear extra thick layers to force sweating",
    ],
    correctIndex: 1,
    explanation: "Cooling down and hydrating early can prevent progression to severe heat illness.",
  },
];
