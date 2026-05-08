export type AppRoutePath =
  | "/"
  | "/map"
  | "/map/compare"
  | "/map/3d-route"
  | "/map/3d-experiment"
  | "/aboutus"
  | "/extreme-weather-risks"
  | "/extreme-weather-risks-detail"
  | "/extreme-weather-risks-quiz";

export const APP_ROUTES = {
  home: "/" as const,
  map: "/map" as const,
  compare: "/map/compare" as const,
  map3dRoute: "/map/3d-route" as const,
  map3dExperiment: "/map/3d-experiment" as const,
  about: "/aboutus" as const,
  risks: "/extreme-weather-risks" as const,
  riskDetail: "/extreme-weather-risks-detail" as const,
  riskQuiz: "/extreme-weather-risks-quiz" as const,
};
