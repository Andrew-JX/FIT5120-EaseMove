const cron = require('node-cron');
const axios = require('axios');
const { query } = require('../db');
const { calculateComfortScore, isStale } = require('../scoring/comfortScore');
const precincts = require('../../config/precincts.json');

const COM_BASE = 'https://data.melbourne.vic.gov.au/api/explore/v2.1/catalog/datasets';

// ─── Microclimate sensor fetch ───────────────────────────────────────────────

/**
 * Fetch latest readings for one device_id from CoM microclimate API.
 * Returns up to 5 most-recent records for that device.
 */
async function fetchDeviceReadings(deviceId) {
  const url = `${COM_BASE}/microclimate-sensors-data/records`;
  const resp = await axios.get(url, {
    params: {
      limit: 5,
      order_by: 'received_at DESC',
      where: `device_id='${deviceId}'`,
      timezone: 'Australia/Melbourne'
    },
    timeout: 12000
  });
  return resp.data.results || [];
}

async function storeReading(reading, precinctId) {
  const receivedMs = new Date(reading.received_at).getTime();
  const staleFlag  = isStale(receivedMs);
  await query(
    `INSERT INTO sensor_readings
       (device_id, precinct_id, sensor_location, lat, lng,
        air_temperature, relative_humidity, average_wind_speed,
        atmospheric_pressure, pm25, pm10, noise, received_at, stale_data)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
     ON CONFLICT (device_id, received_at) DO NOTHING`,
    [
      reading.device_id,
      precinctId,
      reading.sensorlocation    ?? null,
      reading.latlong?.lat      ?? null,
      reading.latlong?.lon      ?? null,
      reading.airtemperature    ?? null,
      reading.relativehumidity  ?? null,
      reading.averagewindspeed  ?? null,
      reading.atmosphericpressure ?? null,
      reading.pm25              ?? null,
      reading.pm10              ?? null,
      reading.noise             ?? null,
      reading.received_at,
      staleFlag
    ]
  );
}

// ─── Pedestrian counts fetch ─────────────────────────────────────────────────

// Melbourne CBD bounding box for sensor filtering
const CBD_BBOX = { minLat: -37.825, maxLat: -37.808, minLng: 144.950, maxLng: 144.980 };

// Map pedestrian sensor location_id → precinct_id by proximity
function assignPedestrianPrecinct(lat, lng) {
  if (!lat || !lng) return null;
  // Simple bounding-box assignment
  if (lat >= -37.822 && lat <= -37.808 && lng >= 144.955 && lng <= 144.975) return 'cbd';
  if (lat >= -37.822 && lat <= -37.810 && lng >= 144.974 && lng <= 144.985) return 'east-melbourne';
  if (lat >= -37.826 && lat <= -37.816 && lng >= 144.940 && lng <= 144.962) return 'docklands';
  if (lat >= -37.828 && lat <= -37.818 && lng >= 144.945 && lng <= 144.968) return 'southbank';
  if (lat >= -37.810 && lat <= -37.793 && lng >= 144.960 && lng <= 144.978) return 'carlton';
  if (lat >= -37.806 && lat <= -37.793 && lng >= 144.974 && lng <= 144.988) return 'fitzroy';
  return null;
}

/**
 * Fetch today's pedestrian counts from CoM PCS API.
 * Dataset: pedestrian-counting-system-monthly-counts-per-hour
 */
async function fetchPedestrianCounts() {
  const url = `${COM_BASE}/pedestrian-counting-system-monthly-counts-per-hour/records`;
  const resp = await axios.get(url, {
    // The monthly hourly dataset can lag behind the current local date, so pull
    // the most recent published rows instead of assuming today's date exists.
    params: { limit: 100, order_by: 'sensing_date DESC, hourday DESC', timezone: 'Australia/Melbourne' },
    timeout: 12000
  });
  return resp.data.results || [];
}

async function storePedestrianCount(record) {
  if (!record.location_id || record.sensing_date == null || record.hourday == null) return;
  const lat = record.location?.lat ?? null;
  const lng = record.location?.lon ?? null;
  const precinctId = assignPedestrianPrecinct(lat, lng);
  await query(
    `INSERT INTO pedestrian_counts
       (location_id, sensor_name, sensing_date, hourday, pedestrian_count, lat, lng, precinct_id)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
     ON CONFLICT (location_id, sensing_date, hourday) DO NOTHING`,
    [
      record.location_id,
      record.sensor_name   ?? null,
      record.sensing_date,
      record.hourday,
      record.pedestriancount ?? 0,
      lat, lng, precinctId
    ]
  );
}

// ─── Precinct score aggregation ──────────────────────────────────────────────

async function getActivityCountForPrecinct(precinctId) {
  const result = await query(
    `WITH latest AS (
       SELECT sensing_date, hourday
       FROM pedestrian_counts
       WHERE precinct_id = $1
       ORDER BY sensing_date DESC, hourday DESC
       LIMIT 1
     )
     SELECT COALESCE(SUM(pc.pedestrian_count), 0) as total
     FROM pedestrian_counts pc
     JOIN latest l
       ON pc.sensing_date = l.sensing_date
      AND pc.hourday = l.hourday
     WHERE pc.precinct_id = $1`,
    [precinctId]
  );
  return parseInt(result.rows[0]?.total ?? 0, 10);
}

function getActivityLevel(activityCount) {
  if (activityCount < 100) return 'Low';
  if (activityCount < 300) return 'Medium';
  return 'High';
}

async function calculateAndStorePrecinct(precinct) {
  // Precincts without microclimate sensors stay visible, while activity density
  // can still update from pedestrian counters where coverage exists.
  if (!precinct.has_sensors || precinct.devices.length === 0) {
    const activityCount = await getActivityCountForPrecinct(precinct.id);
    const activityLevel = getActivityLevel(activityCount);
    await query(
      `INSERT INTO precinct_scores
         (precinct_id, precinct_name, comfort_score, comfort_label,
          temperature, humidity, wind_speed, pm25, activity_count,
          activity_level, sensor_count, stale_data, no_sensor_data)
       VALUES ($1,$2,50,'Caution',null,null,null,null,$3,$4,0,true,true)`,
      [precinct.id, precinct.name, activityCount, activityLevel]
    );
    return;
  }

  const result = await query(
    `SELECT DISTINCT ON (device_id)
       device_id, air_temperature, relative_humidity, average_wind_speed, pm25, received_at, stale_data
     FROM sensor_readings WHERE precinct_id=$1
     ORDER BY device_id, received_at DESC`,
    [precinct.id]
  );
  const rows = result.rows;
  if (rows.length === 0) return;

  const avg = field => {
    const vals = rows.map(r => r[field]).filter(v => v != null);
    return vals.length ? vals.reduce((a, b) => a + parseFloat(b), 0) / vals.length : null;
  };

  const temperature = avg('air_temperature');
  const humidity    = avg('relative_humidity');
  const windSpeed   = avg('average_wind_speed');
  const pm25        = avg('pm25');
  if (temperature === null) return;

  const activityCount  = await getActivityCountForPrecinct(precinct.id);
  const anyStale       = rows.some(r => r.stale_data);
  const { score, label, activityLevel } = calculateComfortScore({ temperature, humidity: humidity ?? 50, activityCount });

  await query(
    `INSERT INTO precinct_scores
       (precinct_id, precinct_name, comfort_score, comfort_label,
        temperature, humidity, wind_speed, pm25, activity_count,
        activity_level, sensor_count, stale_data, no_sensor_data)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,false)`,
    [precinct.id, precinct.name, score, label,
     temperature, humidity, windSpeed, pm25,
     activityCount, activityLevel, rows.length, anyStale]
  );
}

// ─── Main poll cycle ─────────────────────────────────────────────────────────

async function pollAndStore() {
  console.log(`[Poller] Poll started ${new Date().toISOString()}`);

  // Build device → precinct map
  const deviceMap = {};
  for (const p of precincts) {
    if (p.has_sensors) for (const d of p.devices) deviceMap[d] = p.id;
  }

  // Fetch microclimate data per device
  for (const [deviceId, precinctId] of Object.entries(deviceMap)) {
    try {
      const readings = await fetchDeviceReadings(deviceId);
      console.log(`[Poller] ${deviceId}: ${readings.length} readings`);
      for (const r of readings) await storeReading(r, precinctId);
    } catch (err) {
      console.error(`[Poller] Failed ${deviceId}:`, err.message);
    }
  }

  // Fetch pedestrian counts (3rd open dataset)
  try {
    const counts = await fetchPedestrianCounts();
    console.log(`[Poller] Pedestrian counts: ${counts.length} records`);
    for (const c of counts) await storePedestrianCount(c);
  } catch (err) {
    console.error('[Poller] Pedestrian counts failed:', err.message);
  }

  // Recalculate all precinct scores
  for (const precinct of precincts) {
    try {
      await calculateAndStorePrecinct(precinct);
    } catch (err) {
      console.error(`[Poller] Score calc failed ${precinct.id}:`, err.message);
    }
  }

  console.log(`[Poller] Poll complete ${new Date().toISOString()}`);
}

function start() {
  pollAndStore();
  cron.schedule('0 * * * *', pollAndStore);
  console.log('[Poller] Scheduler started (immediate + every hour)');
}

module.exports = { start, pollAndStore };
