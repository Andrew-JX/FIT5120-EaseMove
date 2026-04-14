const {
  normaliseTemperature,
  normaliseHumidity,
  normaliseActivity,
  calculateComfortScore,
  isStale,
  getRecommendation,
  getPreparationAdvice
} = require('./comfortScore');

describe('comfortScore', () => {
  describe('normaliseTemperature', () => {
    test('normalises 25 degrees to approximately 37.5', () => {
      expect(normaliseTemperature(25)).toBeCloseTo(37.5);
    });

    test('normalises 40 degrees to 0', () => {
      expect(normaliseTemperature(40)).toBe(0);
    });

    test('normalises 0 degrees to 100', () => {
      expect(normaliseTemperature(0)).toBe(100);
    });

    test('clamps temperatures below the range to 100', () => {
      expect(normaliseTemperature(-5)).toBe(100);
    });

    test('clamps temperatures above the range to 0', () => {
      expect(normaliseTemperature(45)).toBe(0);
    });
  });

  describe('normaliseHumidity', () => {
    test('normalises humidity with the configured formula', () => {
      expect(normaliseHumidity(58)).toBeCloseTo(42);
    });
  });

  describe('normaliseActivity', () => {
    test('normalises activity with the configured formula', () => {
      expect(normaliseActivity(150)).toBeCloseTo(70);
    });
  });

  describe('calculateComfortScore', () => {
    test('calculates default weighted score from readings', () => {
      const result = calculateComfortScore({ temperature: 24, humidity: 58, activityCount: 150 });

      expect(result.score).toBe(44);
      expect(result.label).toBe('Caution');
      expect(result.activityLevel).toBe('Medium');
    });

    test('labels high-risk conditions', () => {
      const result = calculateComfortScore({ temperature: 36, humidity: 80, activityCount: 400 });

      expect(result.label).toBe('High Risk');
    });

    test('supports temperature-only weighting', () => {
      const result = calculateComfortScore(
        { temperature: 24, humidity: 58, activityCount: 150 },
        { temperature: 1, humidity: 0, activity: 0 }
      );

      expect(result.score).toBe(40);
    });

    test('rejects weights that do not sum to 1.0', () => {
      expect(() => calculateComfortScore(
        { temperature: 24, humidity: 58, activityCount: 150 },
        { temperature: 0.5, humidity: 0.5, activity: 0.5 }
      )).toThrow('Comfort score weights must sum to 1.0');
    });
  });

  describe('isStale', () => {
    test('returns true when reading is older than 30 minutes', () => {
      expect(isStale(Date.now() - 31 * 60 * 1000)).toBe(true);
    });

    test('returns false when reading is newer than 30 minutes', () => {
      expect(isStale(Date.now() - 10 * 60 * 1000)).toBe(false);
    });
  });

  describe('getRecommendation', () => {
    test('prioritises high heat risk', () => {
      expect(getRecommendation({ temperature: 37, comfort_label: 'Comfortable' }))
        .toBe('High heat risk — consider delaying your trip or choosing alternative transport.');
    });

    test('returns recommendation for comfortable conditions', () => {
      expect(getRecommendation({ temperature: 24, comfort_label: 'Comfortable' }))
        .toBe('Good time to travel. Conditions are comfortable right now.');
    });

    test('returns recommendation for caution conditions', () => {
      expect(getRecommendation({ temperature: 30, comfort_label: 'Caution' }))
        .toBe('Conditions are elevated. Consider travelling before 10am or after 5pm.');
    });

    test('returns recommendation for high-risk conditions', () => {
      expect(getRecommendation({ temperature: 35, comfort_label: 'High Risk' }))
        .toBe('High risk conditions. Consider waiting or using alternative transport.');
    });
  });

  describe('getPreparationAdvice', () => {
    test('returns water bottle tip when temperature is above 30 degrees', () => {
      expect(getPreparationAdvice({ temperature: 32, pm25: 10 }))
        .toContain('Wear lightweight, breathable clothing and carry a water bottle. (Based on current temperature: 32°C)');
    });

    test('returns mask tip when PM2.5 is above 25', () => {
      expect(getPreparationAdvice({ temperature: 25, pm25: 30 }))
        .toContain('Air quality is currently poor — consider wearing a mask during strenuous outdoor activity. (Based on PM2.5: 30 µg/m³)');
    });

    test('returns comfortable conditions tip when temperature and PM2.5 are low', () => {
      expect(getPreparationAdvice({ temperature: 24, pm25: 15 }))
        .toEqual(['Conditions are comfortable — great time for a walk or ride!']);
    });
  });
});
