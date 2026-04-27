export type AppRoutePath = "/" | "/map" | "/aboutus" | "/extreme-weather-risks";

export function normalizeAppPath(path: string): AppRoutePath {
  if (path === "/map" || path === "/map/") return "/map";
  if (path === "/aboutus" || path === "/aboutus/") return "/aboutus";
  if (path === "/extreme-weather-risks" || path === "/extreme-weather-risks/") return "/extreme-weather-risks";

  return "/";
}

export function navigateTo(path: string) {
  const targetPath = normalizeAppPath(path);
  const currentPath = normalizeAppPath(window.location.pathname);

  if (targetPath === currentPath) return;

  window.history.pushState({}, "", targetPath);
  window.dispatchEvent(new PopStateEvent("popstate"));
}
