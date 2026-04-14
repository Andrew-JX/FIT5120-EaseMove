const DEFAULT_WEIGHTS = {
  temperature: 0.60,
  humidity: 0.30,
  activity: 0.10
};

const STALE_THRESHOLD_MS = 30 * 60 * 1000;

/**
 * Clamp a numeric value to the comfort score range.
 * @param {number} value - Score value to clamp.
 * @returns {number} Score constrained between 0 and 100.
 */
function clampScore(value) {
  return Math.max(0, Math.min(100, value));
}

/**
 * Normalise temperature into a 0-100 score.
 * @param {number} temperature - Air temperature in Celsius.
 * @returns {number} Normalised temperature score from 0 to 100.
 */
function normaliseTemperature(temperature) {
  return clampScore(((40 - temperature) / 40) * 100);
}

/**
 * Normalise relative humidity into a 0-100 score.
 * @param {number} humidity - Relative humidity percentage.
 * @returns {number} Normalised humidity score from 0 to 100.
 */
function normaliseHumidity(humidity) {
  return clampScore(((100 - humidity) / 100) * 100);
}

/**
 * Normalise activity count into a 0-100 score.
 * @param {number} activityCount - Count of activity observations.
 * @returns {number} Normalised activity score from 0 to 100.
 */
function normaliseActivity(activityCount) {
  return clampScore(((500 - activityCount) / 500) * 100);
}

/**
 * Calculate the activity level label for a precinct.
 * @param {number} activityCount - Count of activity observations.
 * @returns {'Low' | 'Medium' | 'High'} Activity level label.
 */
function getActivityLevel(activityCount) {
  if (activityCount < 100) return 'Low';
  if (activityCount < 300) return 'Medium';
  return 'High';
}

/**
 * Calculate the comfort label for a score.
 * @param {number} score - Comfort score from 0 to 100.
 * @returns {'Comfortable' | 'Caution' | 'High Risk'} Comfort label.
 */
function getComfortLabel(score) {
  if (score >= 70) return 'Comfortable';
  if (score >= 40) return 'Caution';
  return 'High Risk';
}

/**
 * Validate scoring weights before calculating the comfort score.
 * @param {{ temperature: number, humidity: number, activity: number }} weights - Scoring weights.
 * @returns {void}
 */
function validateWeights(weights) {
  const total = weights.temperature + weights.humidity + weights.activity;

  if (Math.abs(total - 1) > Number.EPSILON) {
    throw new RangeError('Comfort score weights must sum to 1.0');
  }
}

/**
 * Calculate a weighted comfort score, comfort label, and activity level.
 * @param {{ temperature: number, humidity: number, activityCount: number }} readings - Current precinct readings.
 * @param {{ temperature: number, humidity: number, activity: number }} [weights] - Scoring weights that sum to 1.0.
 * @returns {{ score: number, label: 'Comfortable' | 'Caution' | 'High Risk', activityLevel: 'Low' | 'Medium' | 'High' }} Comfort score result.
 */
function calculateComfortScore(readings, weights = DEFAULT_WEIGHTS) {
  validateWeights(weights);

  const tempScore = normaliseTemperature(readings.temperature);
  const humidScore = normaliseHumidity(readings.humidity);
  const activityScore = normaliseActivity(readings.activityCount);
  const score = Math.round(
    tempScore * weights.temperature +
    humidScore * weights.humidity +
    activityScore * weights.activity
  );

  return {
    score,
    label: getComfortLabel(score),
    activityLevel: getActivityLevel(readings.activityCount)
  };
}

/**
 * Determine whether a reading timestamp is stale.
 * @param {number} readingTimestamp - Unix timestamp in milliseconds.
 * @returns {boolean} True when the reading is older than the stale data threshold.
 */
function isStale(readingTimestamp) {
  return Date.now() - readingTimestamp > STALE_THRESHOLD_MS;
}

/**
 * Build a recommendation string for current precinct conditions.
 * @param {{ temperature: number, comfort_label: 'Comfortable' | 'Caution' | 'High Risk' }} precinctData - Precinct weather and comfort data.
 * @returns {string} Travel recommendation.
 */
function getRecommendation(precinctData) {
  if (precinctData.temperature > 36) {
    return 'High heat risk — consider delaying your trip or choosing alternative transport.';
  }

  if (precinctData.comfort_label === 'Comfortable') {
    return 'Good time to travel. Conditions are comfortable right now.';
  }

  if (precinctData.comfort_label === 'Caution') {
    return 'Conditions are elevated. Consider travelling before 10am or after 5pm.';
  }

  if (precinctData.comfort_label === 'High Risk') {
    return 'High risk conditions. Consider waiting or using alternative transport.';
  }

  return '';
}

/**
 * Build practical preparation advice from current precinct conditions.
 * @param {{ temperature: number, pm25: number | null }} precinctData - Precinct weather and air-quality data.
 * @returns {string[]} Preparation advice messages.
 */
function getPreparationAdvice(precinctData) {
  const advice = [];

  if (precinctData.temperature > 30) {
    advice.push(`Wear lightweight, breathable clothing and carry a water bottle. (Based on current temperature: ${precinctData.temperature}°C)`);
  }

  if (precinctData.pm25 > 25) {
    advice.push(`Air quality is currently poor — consider wearing a mask during strenuous outdoor activity. (Based on PM2.5: ${precinctData.pm25} µg/m³)`);
  }

  if (precinctData.temperature < 28 && (precinctData.pm25 === null || precinctData.pm25 <= 25)) {
    return ['Conditions are comfortable — great time for a walk or ride!'];
  }

  return advice;
}

module.exports = {
  normaliseTemperature,
  normaliseHumidity,
  normaliseActivity,
  calculateComfortScore,
  isStale,
  getRecommendation,
  getPreparationAdvice
};
