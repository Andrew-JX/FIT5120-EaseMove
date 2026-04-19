export type LandingSceneId = "hero" | "mission";

export const HANDOFF_COOLDOWN_MS = 140;
export const HANDOFF_SCROLL_MIN_PX = 36;
export const HANDOFF_SCROLL_MAX_PX = 140;
export const KEYBOARD_HANDOFF_DELTA_PX = 96;

let lockOwner: LandingSceneId | null = null;
let lastHandoffAt = 0;

function now() {
  return typeof performance !== "undefined" ? performance.now() : Date.now();
}

export function getLockOwner() {
  return lockOwner;
}

export function getLastHandoffAt() {
  return lastHandoffAt;
}

export function isInHandoffCooldown() {
  return now() - lastHandoffAt < HANDOFF_COOLDOWN_MS;
}

export function canAcquire(sceneId: LandingSceneId) {
  return lockOwner === sceneId || (lockOwner === null && !isInHandoffCooldown());
}

export function acquire(sceneId: LandingSceneId) {
  if (lockOwner === sceneId) return true;
  if (lockOwner !== null || isInHandoffCooldown()) return false;

  lockOwner = sceneId;
  return true;
}

export function release(sceneId: LandingSceneId) {
  if (lockOwner !== sceneId) return false;

  lockOwner = null;
  lastHandoffAt = now();
  return true;
}

export function resetLandingSceneController() {
  lockOwner = null;
  lastHandoffAt = 0;
}

export function getHandoffScrollPx(rawDelta: number) {
  if (rawDelta === 0) return 0;

  const magnitude = Math.min(
    HANDOFF_SCROLL_MAX_PX,
    Math.max(HANDOFF_SCROLL_MIN_PX, Math.abs(rawDelta)),
  );

  return Math.sign(rawDelta) * magnitude;
}

export function bridgeResidualScroll(rawDelta: number) {
  const scrollPx = getHandoffScrollPx(rawDelta);
  if (scrollPx === 0) return;

  window.requestAnimationFrame(() => {
    window.requestAnimationFrame(() => {
      window.scrollBy({ top: scrollPx, behavior: "auto" });
    });
  });
}
