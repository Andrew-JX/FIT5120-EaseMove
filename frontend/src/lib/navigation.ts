export type AppRoutePath = "/" | "/map";

export function normalizeAppPath(path: string): AppRoutePath {
  if (path === "/map" || path === "/map/") return "/map";

  return "/";
}

export function navigateTo(path: string) {
  const targetPath = normalizeAppPath(path);
  const currentPath = normalizeAppPath(window.location.pathname);

  if (targetPath === currentPath) return;

  window.history.pushState({}, "", targetPath);
  window.dispatchEvent(new PopStateEvent("popstate"));
}
