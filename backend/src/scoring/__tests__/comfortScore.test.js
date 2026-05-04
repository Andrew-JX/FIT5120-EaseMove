/**
 * Unit tests for comfortScore.js
 * Covers: US 1.1 (AC 1.1.1, 1.1.2, 1.1.3), US 2.1 (AC 2.1.1, 2.1.2), US 2.2 (AC 2.2.1–2.2.4), US 2.3 (AC 2.3.3)
 */

const {
  normaliseTemperature,
  normaliseHumidity,
  normaliseActivity,
  calculateComfortScore,
  isStale,
  getRecommendation,
  getPreparationAdvice,
  DEFAULT_WEIGHTS,
  STALE_THRESHOLD_MS,
} = require('../comfortScore');

// ─── Normalisation functions ──────────────────────────────────────────────────

describe('normaliseTemperature', () => {
  test('0°C → 100 (coolest = most comfortable)', () => {
    expect(normaliseTemperature(0)).toBe(100);
  });
  test('20°C → 50 (midpoint)', () => {
    expect(normaliseTemperature(20)).toBe(50);
  });
  test('40°C → 0 (upper bound)', () => {
    expect(normaliseTemperature(40)).toBe(0);
  });
  test('50°C → 0 (clamped above 40°C)', () => {
    expect(normaliseTemperature(50)).toBe(0);
  });
  test('-10°C → 100 (clamped below 0°C)', () => {
    expect(normaliseTemperature(-10)).toBe(100);
  });
});

describe('normaliseHumidity', () => {
  test('0% → 100', () => {
    expect(normaliseHumidity(0)).toBe(100);
  });
  test('50% → 50', () => {
    expect(normaliseHumidity(50)).toBe(50);
  });
  test('100% → 0', () => {
    expect(normaliseHumidity(100)).toBe(0);
  });
  test('150% → 0 (clamped)', () => {
    expect(normaliseHumidity(150)).toBe(0);
  });
});

describe('normaliseActivity', () => {
  test('0 people → 100', () => {
    expect(normaliseActivity(0)).toBe(100);
  });
  test('250 people → 50 (midpoint)', () => {
    expect(normaliseActivity(250)).toBe(50);
  });
  test('500 people → 0', () => {
    expect(normaliseActivity(500)).toBe(0);
  });
  test('1000 people → 0 (clamped)', () => {
    expect(normaliseActivity(1000)).toBe(0);
  });
});

// ─── calculateComfortScore — AC 1.1.1 colour bands ───────────────────────────

describe('calculateComfortScore — comfort label (AC 1.1.1)', () => {
  test('normal conditions → Comfortable (score ≥ 70)', () => {
    // tempScore=(40-10)/40*100=75, humidScore=60, actScore=90 → 75*0.6+60*0.3+90*0.1=72
    const result = calculateComfortScore({ temperature: 10, humidity: 40, activityCount: 50 });
    expect(result.label).toBe('Comfortable');
    expect(result.score).toBeGreaterThanOrEqual(70);
  });

  test('moderate conditions → Caution (40 ≤ score < 70)', () => {
    // tempScore=40, humidScore=50, actScore=60 → 40*0.6+50*0.3+60*0.1=45
    const result = calculateComfortScore({ temperature: 24, humidity: 50, activityCount: 200 });
    expect(result.label).toBe('Caution');
    expect(result.score).toBeGreaterThanOrEqual(40);
    expect(result.score).toBeLessThan(70);
  });

  test('high heat scenario → High Risk (score < 40) [Code Quality doc]', () => {
    const result = calculateComfortScore({ temperature: 38, humidity: 80, activityCount: 400 });
    expect(result.label).toBe('High Risk');
    expect(result.score).toBeLessThan(40);
  });

  test('worst case (40°C / 100% / 500 people) → score 0', () => {
    const result = calculateComfortScore(
      { temperature: 40, humidity: 100, activityCount: 500 },
      DEFAULT_WEIGHTS,
    );
    expect(result.score).toBe(0);
    expect(result.label).toBe('High Risk');
  });

  test('best case (0°C / 0% / 0 people) → score 100', () => {
    const result = calculateComfortScore(
      { temperature: 0, humidity: 0, activityCount: 0 },
      DEFAULT_WEIGHTS,
    );
    expect(result.score).toBe(100);
    expect(result.label).toBe('Comfortable');
  });

  test('score is always between 0 and 100', () => {
    const cases = [
      { temperature: -20, humidity: 0, activityCount: 0 },
      { temperature: 60, humidity: 120, activityCount: 1000 },
      { temperature: 20, humidity: 50, activityCount: 250 },
    ];
    cases.forEach((readings) => {
      const { score } = calculateComfortScore(readings);
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(100);
    });
  });
});

// ─── calculateComfortScore — custom weights [Code Quality doc] ────────────────

describe('calculateComfortScore — custom weight scenario (Code Quality doc)', () => {
  test('temperature-only weight: cool temp scores 100 regardless of humidity', () => {
    const weights = { temperature: 1.0, humidity: 0, activity: 0 };
    const result = calculateComfortScore({ temperature: 0, humidity: 100, activityCount: 500 }, weights);
    expect(result.score).toBe(100);
  });

  test('activity-only weight: zero crowd scores 100 regardless of temperature', () => {
    const weights = { temperature: 0, humidity: 0, activity: 1.0 };
    const result = calculateComfortScore({ temperature: 40, humidity: 100, activityCount: 0 }, weights);
    expect(result.score).toBe(100);
  });

  test('non-default weights still produce valid label', () => {
    const weights = { temperature: 0.5, humidity: 0.3, activity: 0.2 };
    const result = calculateComfortScore({ temperature: 25, humidity: 55, activityCount: 120 }, weights);
    expect(['Comfortable', 'Caution', 'High Risk']).toContain(result.label);
  });
});

// ─── calculateComfortScore — edge cases [Code Quality doc] ───────────────────

describe('calculateComfortScore — zero activity scenario (Code Quality doc)', () => {
  test('zero activity count is treated as 0, not missing', () => {
    const result = calculateComfortScore({ temperature: 25, humidity: 50, activityCount: 0 });
    expect(result.activityLevel).toBe('Low');
    expect(result.score).toBeGreaterThan(0);
  });
});

describe('calculateComfortScore — extreme temperature scenario (Code Quality doc)', () => {
  test('50°C is clamped to same score as 40°C', () => {
    const at40 = calculateComfortScore({ temperature: 40, humidity: 50, activityCount: 100 });
    const at50 = calculateComfortScore({ temperature: 50, humidity: 50, activityCount: 100 });
    expect(at50.score).toBe(at40.score);
  });
});

describe('calculateComfortScore — null/stale sensor reading scenario (Code Quality doc)', () => {
  test('missing activityCount defaults to 0', () => {
    const result = calculateComfortScore({ temperature: 20, humidity: 40 });
    expect(result.activityLevel).toBe('Low');
    expect(result.score).toBeGreaterThanOrEqual(0);
  });
});

// ─── activityLevel thresholds — AC 1.1.2 ─────────────────────────────────────

describe('activityLevel — AC 1.1.2', () => {
  test('< 100 → Low', () => {
    const { activityLevel } = calculateComfortScore({ temperature: 20, humidity: 50, activityCount: 99 });
    expect(activityLevel).toBe('Low');
  });
  test('100 → Medium (lower boundary)', () => {
    const { activityLevel } = calculateComfortScore({ temperature: 20, humidity: 50, activityCount: 100 });
    expect(activityLevel).toBe('Medium');
  });
  test('299 → Medium (upper boundary)', () => {
    const { activityLevel } = calculateComfortScore({ temperature: 20, humidity: 50, activityCount: 299 });
    expect(activityLevel).toBe('Medium');
  });
  test('300 → High (lower boundary)', () => {
    const { activityLevel } = calculateComfortScore({ temperature: 20, humidity: 50, activityCount: 300 });
    expect(activityLevel).toBe('High');
  });
  test('500+ → High', () => {
    const { activityLevel } = calculateComfortScore({ temperature: 20, humidity: 50, activityCount: 999 });
    expect(activityLevel).toBe('High');
  });
});

// ─── isStale — AC 1.1.3 ──────────────────────────────────────────────────────

describe('isStale — AC 1.1.3 stale data detection', () => {
  test('1-hour-old reading is not stale', () => {
    const oneHourAgo = Date.now() - 60 * 60 * 1000;
    expect(isStale(oneHourAgo)).toBe(false);
  });

  test('3-year-old reading is stale', () => {
    const threeYearsAgo = Date.now() - 3 * 365 * 24 * 60 * 60 * 1000;
    expect(isStale(threeYearsAgo)).toBe(true);
  });

  test('reading just past the threshold is stale', () => {
    const justPast = Date.now() - STALE_THRESHOLD_MS - 1000;
    expect(isStale(justPast)).toBe(true);
  });

  test('reading just before the threshold is not stale', () => {
    const justBefore = Date.now() - STALE_THRESHOLD_MS + 10000;
    expect(isStale(justBefore)).toBe(false);
  });
});

// ─── getRecommendation — AC 2.1.1 and AC 2.1.2 ───────────────────────────────

describe('getRecommendation — AC 2.1.1 time-slot recommendation', () => {
  test('Comfortable label → positive go-now recommendation', () => {
    const rec = getRecommendation({ temperature: 22, comfort_label: 'Comfortable' });
    expect(rec.toLowerCase()).toContain('comfortable');
  });

  test('Caution label → suggests off-peak travel window', () => {
    const rec = getRecommendation({ temperature: 29, comfort_label: 'Caution' });
    expect(rec.toLowerCase()).toContain('elevated');
  });

  test('High Risk label → advises waiting or alternative transport', () => {
    const rec = getRecommendation({ temperature: 34, comfort_label: 'High Risk' });
    expect(rec.toLowerCase()).toContain('high risk');
  });

  test('recommendation is a non-empty string', () => {
    ['Comfortable', 'Caution', 'High Risk'].forEach((label) => {
      const rec = getRecommendation({ temperature: 25, comfort_label: label });
      expect(typeof rec).toBe('string');
      expect(rec.length).toBeGreaterThan(0);
    });
  });
});

describe('getRecommendation — AC 2.1.2 high heat warning', () => {
  test('temperature > 36°C → high heat warning message', () => {
    const rec = getRecommendation({ temperature: 37, comfort_label: 'High Risk' });
    expect(rec).toContain('High heat risk');
    expect(rec.toLowerCase()).toContain('delay');
  });

  test('temperature exactly 36°C → no high heat warning', () => {
    const rec = getRecommendation({ temperature: 36, comfort_label: 'High Risk' });
    expect(rec).not.toContain('High heat risk');
  });

  test('high heat warning takes priority over comfort label', () => {
    // Even if comfort_label were 'Comfortable', temp > 36 gives the warning
    const rec = getRecommendation({ temperature: 38, comfort_label: 'Comfortable' });
    expect(rec).toContain('High heat risk');
  });
});

// ─── getPreparationAdvice — AC 2.2.x ─────────────────────────────────────────

describe('getPreparationAdvice — AC 2.2.1 hot weather advice', () => {
  test('temperature > 30°C → clothing and water bottle advice', () => {
    const tips = getPreparationAdvice({ temperature: 32, pm25: 10 });
    expect(tips.some((t) => t.includes('lightweight') && t.includes('water bottle'))).toBe(true);
  });

  test('temperature exactly 30°C → no hot weather tip (boundary)', () => {
    const tips = getPreparationAdvice({ temperature: 30, pm25: 10 });
    expect(tips).toHaveLength(1);
    expect(tips[0]).toContain('comfortable');
  });
});

describe('getPreparationAdvice — AC 2.2.2 poor air quality advice', () => {
  test('PM2.5 > 25 → mask advice', () => {
    const tips = getPreparationAdvice({ temperature: 22, pm25: 26 });
    expect(tips.some((t) => t.toLowerCase().includes('mask'))).toBe(true);
  });

  test('PM2.5 exactly 25 → no mask tip (boundary)', () => {
    const tips = getPreparationAdvice({ temperature: 22, pm25: 25 });
    expect(tips).toHaveLength(1);
    expect(tips[0]).toContain('comfortable');
  });
});

describe('getPreparationAdvice — AC 2.2.3 comfortable conditions', () => {
  test('temp ≤ 30 and PM2.5 ≤ 25 → comfortable go-ahead message', () => {
    const tips = getPreparationAdvice({ temperature: 22, pm25: 10 });
    expect(tips).toHaveLength(1);
    expect(tips[0]).toContain('comfortable');
    expect(tips[0]).toContain('walk or ride');
  });
});

describe('getPreparationAdvice — AC 2.2.4 evidence-based advice', () => {
  test('hot weather tip includes the triggering temperature reading', () => {
    const tips = getPreparationAdvice({ temperature: 32, pm25: 10 });
    const hotTip = tips.find((t) => t.includes('water bottle'));
    expect(hotTip).toContain('32°C');
  });

  test('PM2.5 tip includes the triggering PM2.5 reading', () => {
    const tips = getPreparationAdvice({ temperature: 22, pm25: 30 });
    const airTip = tips.find((t) => t.includes('mask'));
    expect(airTip).toContain('30');
    expect(airTip).toContain('µg/m³');
  });

  test('both conditions → two separate tips, each with its own reading', () => {
    const tips = getPreparationAdvice({ temperature: 33, pm25: 30 });
    expect(tips).toHaveLength(2);
    const hotTip = tips.find((t) => t.includes('water bottle'));
    const airTip = tips.find((t) => t.includes('mask'));
    expect(hotTip).toContain('33°C');
    expect(airTip).toContain('30');
  });
});

// ─── DEFAULT_WEIGHTS — AC 2.3.3 ──────────────────────────────────────────────

describe('DEFAULT_WEIGHTS — AC 2.3.3', () => {
  test('temperature default is 60%', () => {
    expect(DEFAULT_WEIGHTS.temperature).toBe(0.60);
  });
  test('humidity default is 30%', () => {
    expect(DEFAULT_WEIGHTS.humidity).toBe(0.30);
  });
  test('activity default is 10%', () => {
    expect(DEFAULT_WEIGHTS.activity).toBe(0.10);
  });
  test('default weights sum to 1.0', () => {
    const total = DEFAULT_WEIGHTS.temperature + DEFAULT_WEIGHTS.humidity + DEFAULT_WEIGHTS.activity;
    expect(total).toBeCloseTo(1.0);
  });
});
