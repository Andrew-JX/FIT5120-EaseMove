export type RoutePetVisualMode = "static" | "spritesheet";

export type RoutePetConfig = {
  id: string;
  displayName: string;
  mode: RoutePetVisualMode;
  assetUrl: string;
  widthPx: number;
  heightPx: number;
  imageWidthPx: number;
  imageHeightPx: number;
  haloInsetPx: number;
  alt: string;
  frameColumns?: number;
  frameRows?: number;
  frameWidthPx?: number;
  frameHeightPx?: number;
  loadAssetUrl?: () => Promise<string>;
};

const INLINE_PLACEHOLDER_ROUTE_PET =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64">
      <defs>
        <radialGradient id="petHalo" cx="50%" cy="38%" r="62%">
          <stop offset="0%" stop-color="#f6d28b"/>
          <stop offset="100%" stop-color="#d5a45c"/>
        </radialGradient>
      </defs>
      <circle cx="32" cy="30" r="18" fill="url(#petHalo)" stroke="#7a4b22" stroke-width="3"/>
      <circle cx="26" cy="27" r="2.5" fill="#171717"/>
      <circle cx="38" cy="27" r="2.5" fill="#171717"/>
      <circle cx="32" cy="34" r="2.5" fill="#2f1d12"/>
      <path d="M27 38c3 3 7 3 10 0" stroke="#2f1d12" stroke-width="2.8" stroke-linecap="round" fill="none"/>
      <rect x="17" y="45" width="30" height="10" rx="5" fill="#f5fbff" stroke="#d7dde2" stroke-width="2"/>
    </svg>`
  );

let scooterRoutePetUrlPromise: Promise<string> | null = null;

function loadScooterRoutePetUrl() {
  scooterRoutePetUrlPromise ??= import("../assets/route-pet-scooter.webp").then((module) => module.default);
  return scooterRoutePetUrlPromise;
}

export const PLACEHOLDER_ROUTE_PET_CONFIG: RoutePetConfig = {
  id: "codex-route-placeholder",
  displayName: "Codex Route Pet",
  mode: "static",
  assetUrl: INLINE_PLACEHOLDER_ROUTE_PET,
  widthPx: 54,
  heightPx: 54,
  imageWidthPx: 46,
  imageHeightPx: 46,
  haloInsetPx: 8,
  alt: "",
};

export const SCOOTER_ROUTE_PET_CONFIG: RoutePetConfig = {
  id: "scooter",
  displayName: "Scooter",
  mode: "spritesheet",
  assetUrl: INLINE_PLACEHOLDER_ROUTE_PET,
  widthPx: 64,
  heightPx: 64,
  imageWidthPx: 52,
  imageHeightPx: 56,
  haloInsetPx: 7,
  alt: "",
  frameColumns: 8,
  frameRows: 9,
  frameWidthPx: 192,
  frameHeightPx: 208,
  loadAssetUrl: loadScooterRoutePetUrl,
};

export const DEFAULT_ROUTE_PET_CONFIG = SCOOTER_ROUTE_PET_CONFIG;
