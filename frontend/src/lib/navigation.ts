export type AppRoutePath =
  | "/"
  | "/map"
  | "/map/compare"
  | "/aboutus"
  | "/extreme-weather-risks"
  | "/extreme-weather-risks-detail"
  | "/extreme-weather-risks-quiz";

export const APP_ROUTES = {
  home: "/" as const,
  map: "/map" as const,
  compare: "/map/compare" as const,
  about: "/aboutus" as const,
  risks: "/extreme-weather-risks" as const,
  riskDetail: "/extreme-weather-risks-detail" as const,
  riskQuiz: "/extreme-weather-risks-quiz" as const,
};
