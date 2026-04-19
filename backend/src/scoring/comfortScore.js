
const STALE_THRESHOLD_MS = 2 * 365 * 24 * 60 * 60 * 1000;

const DEFAULT_WEIGHTS = { temperature: 0.60, humidity: 0.30, activity: 0.10 };

/**
 * Normalise temperature to 0–100 score (lower temp = higher score).
 * 0°C → 100, 40°C → 0, >40°C → 0 (clamped)
 */
function normaliseTemperature(t) {
  return Math.max(0, Math.min(100, (40 - t) / 40 * 100));
}

function normaliseHumidity(h) {
  return Math.max(0, Math.min(100, (100 - h) / 100 * 100));
}

function normaliseActivity(a) {
  return Math.max(0, Math.min(100, (500 - a) / 500 * 100));
}

/**
 * Calculate weighted comfort score.
 * @param {{ temperature: number, humidity: number, activityCount: number }} readings
 * @param {{ temperature: number, humidity: number, activity: number }} [weights]
 * @returns {{ score: number, label: string, activityLevel: string }}
 */
function calculateComfortScore(readings, weights = DEFAULT_WEIGHTS) {
  const { temperature, humidity, activityCount = 0 } = readings;
  const w = weights;

  const tempScore     = normaliseTemperature(temperature);
  const humidScore    = normaliseHumidity(humidity);
  const actScore      = normaliseActivity(activityCount);
  const score         = Math.round(tempScore * w.temperature + humidScore * w.humidity + actScore * w.activity);

  const label = score >= 70 ? 'Comfortable' : score >= 40 ? 'Caution' : 'High Risk';

  const activityLevel = activityCount < 100 ? 'Low'
                      : activityCount < 300 ? 'Medium'
                      : 'High';

  return { score, label, activityLevel };
}

/**

 * @param {number} readingTimestampMs - Unix ms
 */
function isStale(readingTimestampMs) {
  return (Date.now() - readingTimestampMs) > STALE_THRESHOLD_MS;
}

/**
 * Plain-English travel recommendation based on current conditions.
 */
function getRecommendation(data) {
  if (data.temperature > 36) return 'High heat risk — consider delaying your trip or choosing alternative transport.';
  if (data.comfort_label === 'Comfortable') return 'Good time to travel. Conditions are comfortable right now.';
  if (data.comfort_label === 'Caution') return 'Conditions are elevated. Consider travelling before 10am or after 5pm.';
  return 'High risk conditions. Consider waiting or using alternative transport.';
}

/**
 * Preparation tips based on sensor readings.
 * @returns {string[]}
 */
function getPreparationAdvice(data) {
  const tips = [];
  if (data.temperature > 30) tips.push(`Wear lightweight, breathable clothing and carry a water bottle. (Based on current temperature: ${data.temperature}°C)`);
  if (data.pm25 > 25) tips.push(`Air quality is currently poor — consider wearing a mask during strenuous outdoor activity. (Based on PM2.5: ${data.pm25} µg/m³)`);
  if (tips.length === 0) tips.push('Conditions are comfortable — great time for a walk or ride!');
  return tips;
}

module.exports = {
  normaliseTemperature, normaliseHumidity, normaliseActivity,
  calculateComfortScore, isStale, getRecommendation, getPreparationAdvice,
  DEFAULT_WEIGHTS, STALE_THRESHOLD_MS
};
