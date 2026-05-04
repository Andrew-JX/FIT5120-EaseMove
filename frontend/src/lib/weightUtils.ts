import type { ComfortWeights } from './api';

/**
 * Redistribute comfort weights so they always sum to 100.
 * When one key is changed, the other two scale proportionally to fill the remainder.
 * If the other two are both 0, the remainder goes entirely to the first other key.
 */
export function adjustWeights(
  current: ComfortWeights,
  key: keyof ComfortWeights,
  nextValue: number,
): ComfortWeights {
  const clamped = Math.max(0, Math.min(100, Math.round(nextValue)));
  const otherKeys = (['temperature', 'humidity', 'activity'] as const).filter(
    (item) => item !== key,
  );
  const currentOtherTotal = otherKeys.reduce((sum, item) => sum + current[item], 0);
  const remaining = 100 - clamped;
  if (currentOtherTotal === 0) {
    return { ...current, [key]: clamped, [otherKeys[0]]: remaining, [otherKeys[1]]: 0 };
  }
  const first = Math.round((current[otherKeys[0]] / currentOtherTotal) * remaining);
  return { ...current, [key]: clamped, [otherKeys[0]]: first, [otherKeys[1]]: remaining - first };
}
