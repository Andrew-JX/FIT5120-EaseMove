/**
 * Unit tests for weightUtils.ts and weight-related api.ts functions
 * Covers: US 2.3 (AC 2.3.1, 2.3.2, 2.3.3, 2.3.4)
 */

import { describe, test, expect, beforeEach } from 'vitest';
import { adjustWeights } from '../weightUtils';
import { DEFAULT_WEIGHTS, loadWeights, saveWeights } from '../api';

const BASE_WEIGHTS = { temperature: 60, humidity: 30, activity: 10 };

// ─── adjustWeights — AC 2.3.1: weights always sum to 100 ─────────────────────

describe('adjustWeights — AC 2.3.1: total stays 100%', () => {
  test('three weights always sum to 100 after any change', () => {
    const result = adjustWeights(BASE_WEIGHTS, 'temperature', 70);
    expect(result.temperature + result.humidity + result.activity).toBe(100);
  });

  test('changed key receives the new value', () => {
    const result = adjustWeights(BASE_WEIGHTS, 'temperature', 70);
    expect(result.temperature).toBe(70);
  });

  test('other keys scale proportionally to fill remainder', () => {
    // humidity=30, activity=10 → humidity is 75% of others, activity 25%
    // remaining = 20 → humidity ≈ 15, activity ≈ 5
    const result = adjustWeights(BASE_WEIGHTS, 'temperature', 80);
    expect(result.temperature).toBe(80);
    expect(result.humidity).toBe(15);
    expect(result.activity).toBe(5);
    expect(result.temperature + result.humidity + result.activity).toBe(100);
  });

  test('adjusting humidity redistributes temperature and activity proportionally', () => {
    const result = adjustWeights(BASE_WEIGHTS, 'humidity', 50);
    expect(result.temperature + result.humidity + result.activity).toBe(100);
    expect(result.humidity).toBe(50);
  });

  test('adjusting activity redistributes temperature and humidity proportionally', () => {
    const result = adjustWeights(BASE_WEIGHTS, 'activity', 30);
    expect(result.temperature + result.humidity + result.activity).toBe(100);
    expect(result.activity).toBe(30);
  });

  test('sum stays 100 regardless of which key is changed', () => {
    const keys = ['temperature', 'humidity', 'activity'] as const;
    keys.forEach((key) => {
      [0, 25, 50, 75, 100].forEach((value) => {
        const result = adjustWeights(BASE_WEIGHTS, key, value);
        expect(result.temperature + result.humidity + result.activity).toBe(100);
      });
    });
  });
});

describe('adjustWeights — AC 2.3.1: input clamping', () => {
  test('value above 100 is clamped to 100', () => {
    const result = adjustWeights(BASE_WEIGHTS, 'temperature', 120);
    expect(result.temperature).toBe(100);
    expect(result.humidity + result.activity).toBe(0);
  });

  test('negative value is clamped to 0', () => {
    const result = adjustWeights(BASE_WEIGHTS, 'temperature', -10);
    expect(result.temperature).toBe(0);
    expect(result.humidity + result.activity).toBe(100);
  });

  test('decimal value is rounded to nearest integer', () => {
    const result = adjustWeights(BASE_WEIGHTS, 'temperature', 60.7);
    expect(result.temperature).toBe(61);
    expect(result.temperature + result.humidity + result.activity).toBe(100);
  });
});

describe('adjustWeights — edge case: other keys are both zero', () => {
  test('when both other keys are 0, remainder goes to first other key', () => {
    const allTemp = { temperature: 100, humidity: 0, activity: 0 };
    const result = adjustWeights(allTemp, 'temperature', 60);
    expect(result.temperature).toBe(60);
    expect(result.temperature + result.humidity + result.activity).toBe(100);
  });
});

// ─── DEFAULT_WEIGHTS — AC 2.3.3 ──────────────────────────────────────────────

describe('DEFAULT_WEIGHTS — AC 2.3.3: correct defaults on first load', () => {
  test('temperature default is 60', () => {
    expect(DEFAULT_WEIGHTS.temperature).toBe(60);
  });
  test('humidity default is 30', () => {
    expect(DEFAULT_WEIGHTS.humidity).toBe(30);
  });
  test('activity default is 10', () => {
    expect(DEFAULT_WEIGHTS.activity).toBe(10);
  });
  test('default weights sum to 100', () => {
    const total = DEFAULT_WEIGHTS.temperature + DEFAULT_WEIGHTS.humidity + DEFAULT_WEIGHTS.activity;
    expect(total).toBe(100);
  });
});

// ─── loadWeights / saveWeights — AC 2.3.2 and AC 2.3.3 ───────────────────────

describe('loadWeights — AC 2.3.3: returns defaults when no saved data', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  test('returns DEFAULT_WEIGHTS when localStorage is empty', () => {
    const weights = loadWeights();
    expect(weights).toEqual(DEFAULT_WEIGHTS);
  });

  test('returns DEFAULT_WEIGHTS when stored value is corrupt JSON', () => {
    localStorage.setItem('easemove_weights', 'not-valid-json');
    const weights = loadWeights();
    expect(weights).toEqual(DEFAULT_WEIGHTS);
  });

  test('returns DEFAULT_WEIGHTS when stored weights do not sum to ~100', () => {
    localStorage.setItem(
      'easemove_weights',
      JSON.stringify({ temperature: 10, humidity: 10, activity: 10 }),
    );
    const weights = loadWeights();
    expect(weights).toEqual(DEFAULT_WEIGHTS);
  });

  test('returns DEFAULT_WEIGHTS when a stored value is negative', () => {
    localStorage.setItem(
      'easemove_weights',
      JSON.stringify({ temperature: -10, humidity: 80, activity: 30 }),
    );
    const weights = loadWeights();
    expect(weights).toEqual(DEFAULT_WEIGHTS);
  });
});

describe('saveWeights + loadWeights — AC 2.3.2: persist across sessions', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  test('saved weights are returned by loadWeights', () => {
    const custom = { temperature: 50, humidity: 40, activity: 10 };
    saveWeights(custom);
    const loaded = loadWeights();
    expect(loaded).toEqual(custom);
  });

  test('updated weights overwrite previous save', () => {
    saveWeights({ temperature: 50, humidity: 40, activity: 10 });
    const updated = { temperature: 70, humidity: 20, activity: 10 };
    saveWeights(updated);
    expect(loadWeights()).toEqual(updated);
  });

  test('weights are stored under the correct localStorage key', () => {
    saveWeights({ temperature: 60, humidity: 30, activity: 10 });
    expect(localStorage.getItem('easemove_weights')).not.toBeNull();
  });
});

// ─── AC 2.3.4: reset to defaults ─────────────────────────────────────────────

describe('Reset to defaults — AC 2.3.4', () => {
  test('saving DEFAULT_WEIGHTS means loadWeights returns the default values', () => {
    // Simulate: user had custom weights, clicks Reset
    saveWeights({ temperature: 80, humidity: 10, activity: 10 });
    saveWeights(DEFAULT_WEIGHTS);
    const loaded = loadWeights();
    expect(loaded.temperature).toBe(60);
    expect(loaded.humidity).toBe(30);
    expect(loaded.activity).toBe(10);
  });

  test('after reset, adjusting weights still keeps them summing to 100', () => {
    saveWeights(DEFAULT_WEIGHTS);
    const loaded = loadWeights();
    const adjusted = adjustWeights(loaded, 'temperature', 50);
    expect(adjusted.temperature + adjusted.humidity + adjusted.activity).toBe(100);
  });
});
