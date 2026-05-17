const router = require('../precincts');

const { normalizeOpenMeteoCurrent } = router.__test__;

describe('normalizeOpenMeteoCurrent', () => {
  test('keeps the existing response shape while sanitizing Open-Meteo values', () => {
    const data = normalizeOpenMeteoCurrent({
      temperature_2m: '18.456',
      relative_humidity_2m: '112',
      wind_speed_10m: '-3',
      time: '2026-05-17T09:30'
    });

    expect(data).toEqual({
      temperature: 18.5,
      humidity: 100,
      wind_speed: 0,
      last_updated: '2026-05-16T23:30:00.000Z'
    });
  });

  test('returns nulls for invalid weather readings without changing field names', () => {
    const data = normalizeOpenMeteoCurrent({
      temperature_2m: 'not-a-number',
      relative_humidity_2m: null,
      wind_speed_10m: Infinity,
      time: 'invalid-date'
    });

    expect(data.temperature).toBeNull();
    expect(data.humidity).toBeNull();
    expect(data.wind_speed).toBeNull();
    expect(typeof data.last_updated).toBe('string');
  });
});
