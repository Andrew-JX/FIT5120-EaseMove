const cron = require('node-cron');
const axios = require('axios');
const { query } = require('../db');
const { calculateComfortScore, isStale } = require('../scoring/comfortScore');
const precincts = require('../../config/precincts.json');

const COM_API_URL = 'https://data.melbourne.vic.gov.au/api/explore/v2.1/catalog/datasets/microclimate-sensors-data/records';

/**
 * Fetches the latest batch of sensor readings from CoM API.
 * Uses order_by=received_at DESC to get most recent first.
 * @returns {Promise<Array>} Raw reading objects from CoM API
 */
async function fetchSensorReadings() {
  const response = await axios.get(COM_API_URL, {
    params: { limit: 50, order_by: 'received_at DESC', timezone: 'Australia/Sydney' },
    timeout: 10000
  });
  return response.data.results;
}

/**
 * Stores a single sensor reading in the database.
 * Maps CoM API camelCase field names to snake_case DB columns.
 * Uses ON CONFLICT DO NOTHING to avoid duplicate inserts.
 * @param {Object} reading - Raw record from CoM API
 * @param {string} precinctId - Precinct this device is assigned to
 */
async function storeReading(reading, precinctId) {
  const receivedAt = reading.received_at;
  const staleFlag = isStale(new Date(receivedAt).getTime());

  await query(
    `INSERT INTO sensor_readings
      (device_id, precinct_id, sensor_location, lat, lng,
       air_temperature, relative_humidity, average_wind_speed,
       gust_wind_speed, atmospheric_pressure, pm25, pm10, noise,
       received_at, stale_data)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
     ON CONFLICT DO NOTHING`,
    [
      reading.device_id,
      precinctId,
      reading.sensorlocation ?? null,
      reading.latlong?.lat ?? null,
      reading.latlong?.lon ?? null,
      reading.airtemperature ?? null,
      reading.relativehumidity ?? null,
      reading.averagewindspeed ?? null,
      reading.gustwindspeed ?? null,
      reading.atmosphericpressure ?? null,
      reading.pm25 ?? null,
      reading.pm10 ?? null,
      reading.noise ?? null,
      receivedAt,
      staleFlag
    ]
  );
}

/**
 * Calculates a comfort score for one precinct by averaging the most recent
 * reading per device, then writes the result to precinct_scores.
 * @param {Object} precinct - Precinct config object from precincts.json
 */
async function calculateAndStorePrecinct(precinct) {
  const result = await query(
    `SELECT DISTINCT ON (device_id)
       device_id, air_temperature, relative_humidity,
       average_wind_speed, pm25, received_at, stale_data
     FROM sensor_readings
     WHERE precinct_id = $1
     ORDER BY device_id, received_at DESC`,
    [precinct.id]
  );

  const rows = result.rows;
  if (rows.length === 0) return;

  const avg = (field) => {
    const vals = rows.map(r => r[field]).filter(v => v !== null && v !== undefined);
    if (vals.length === 0) return null;
    return vals.reduce((a, b) => a + parseFloat(b), 0) / vals.length;
  };

  const temperature = avg('air_temperature');
  const humidity = avg('relative_humidity');
  const windSpeed = avg('average_wind_speed');
  const pm25 = avg('pm25');
  const anyStale = rows.some(r => r.stale_data);

  if (temperature === null) return;

  const { score, label, activityLevel } = calculateComfortScore({
    temperature,
    humidity: humidity ?? 50,
    activityCount: 0   // Transport Activity dataset integration in Iteration 2
  });

  await query(
    `INSERT INTO precinct_scores
      (precinct_id, precinct_name, comfort_score, comfort_label,
       temperature, humidity, wind_speed, pm25,
       activity_count, activity_level, sensor_count, stale_data, calc_timestamp)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,NOW())`,
    [
      precinct.id, precinct.name, score, label,
      temperature, humidity, windSpeed, pm25,
      0, activityLevel, rows.length, anyStale
    ]
  );
}

/**
 * Main poll cycle. Fetches from CoM API, stores readings, recalculates scores.
 * If CoM API is unavailable, still recalculates scores from cached DB data.
 */
async function pollAndStore() {
  console.log(`[DataPoller] Poll started at ${new Date().toISOString()}`);

  const devicePrecinctMap = {};
  for (const precinct of precincts) {
    for (const deviceId of precinct.devices) {
      devicePrecinctMap[deviceId] = precinct.id;
    }
  }

  let readings = [];
  try {
    readings = await fetchSensorReadings();
    console.log(`[DataPoller] Fetched ${readings.length} readings from CoM API`);
  } catch (err) {
    console.error('[DataPoller] CoM API unavailable, using cached data:', err.message);
  }

  for (const reading of readings) {
    const precinctId = devicePrecinctMap[reading.device_id];
    if (!precinctId) continue;
    try {
      await storeReading(reading, precinctId);
    } catch (err) {
      console.error(`[DataPoller] Failed to store ${reading.device_id}:`, err.message);
    }
  }

  for (const precinct of precincts) {
    try {
      await calculateAndStorePrecinct(precinct);
    } catch (err) {
      console.error(`[DataPoller] Score calc failed for ${precinct.id}:`, err.message);
    }
  }

  console.log(`[DataPoller] Poll complete at ${new Date().toISOString()}`);
}

/**
 * Starts the scheduler. Runs an immediate poll on startup, then every hour.
 */
function start() {
  pollAndStore();
  cron.schedule('0 * * * *', pollAndStore);
  console.log('[DataPoller] Scheduler started (run now + every hour)');
}

module.exports = { start, pollAndStore };
