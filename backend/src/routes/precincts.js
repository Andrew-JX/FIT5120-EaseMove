const express   = require('express');
const axios     = require('axios');
const router    = express.Router();
const { query } = require('../db');
const { calculateComfortScore, getRecommendation, getPreparationAdvice, isStale } = require('../scoring/comfortScore');
const precincts = require('../../config/precincts.json');

const precinctMap = Object.fromEntries(precincts.map(p => [p.id, p]));
const OPEN_METEO_URL = 'https://api.open-meteo.com/v1/forecast';
const WEATHER_CACHE_MS = 10 * 60 * 1000;
const MELBOURNE_CENTRAL_WEATHER = {
  id: 'melbourne-central',
  lat: -37.8136,
  lng: 144.9631
};
const weatherCache = new Map();
const FALLBACK_SENSOR_DATA = {
  cbd: { temperature: 23.5, humidity: 52, wind_speed: 4.1, pm25: 11, activity_count: 140 },
  'east-melbourne': { temperature: 22.8, humidity: 49, wind_speed: 3.8, pm25: 10, activity_count: 95 },
  docklands: { temperature: 24.9, humidity: 58, wind_speed: 5.2, pm25: 12, activity_count: 120 },
  southbank: { temperature: 25.7, humidity: 61, wind_speed: 3.2, pm25: 14, activity_count: 155 }
};

function parseWeights(queryParams) {
  const hasWeights = ['weight_temperature', 'weight_humidity', 'weight_activity']
    .some(key => queryParams[key] !== undefined);
  if (!hasWeights) return null;

  const temperature = Number(queryParams.weight_temperature);
  const humidity = Number(queryParams.weight_humidity);
  const activity = Number(queryParams.weight_activity);
  const values = [temperature, humidity, activity];
  const sum = values.reduce((total, value) => total + value, 0);

  if (values.some(value => !Number.isFinite(value) || value < 0) || sum <= 0) {
    return null;
  }

  return {
    temperature: temperature / sum,
    humidity: humidity / sum,
    activity: activity / sum
  };
}

function applyResponseWeights(row, weights) {
  const temperature = row.temperature !== null ? parseFloat(row.temperature) : null;
  const humidity = row.humidity !== null ? parseFloat(row.humidity) : null;
  const activityCount = Number(row.activity_count ?? 0);

  if (!weights || temperature === null) {
    return {
      comfort_score: row.comfort_score,
      comfort_label: row.comfort_label,
      activity_level: row.activity_level
    };
  }

  const weighted = calculateComfortScore({
    temperature,
    humidity: humidity ?? 50,
    activityCount
  }, weights);

  return {
    comfort_score: weighted.score,
    comfort_label: weighted.label,
    activity_level: weighted.activityLevel
  };
}

function deriveStaleFlag(timestamp) {
  if (!timestamp) return false;
  return isStale(new Date(timestamp).getTime());
}

function shouldUseWeatherFallback(precinctData) {
  const configPrecinct = precinctMap[precinctData.id];
  if (!configPrecinct) return false;

  // Keep the four precincts with actual microclimate sensor coverage untouched.
  if (configPrecinct.has_sensors && configPrecinct.devices?.length > 0) {
    return false;
  }

  return true;
}

function cacheKeyForPrecinct(precinct) {
  return `${precinct.id}:${precinct.lat},${precinct.lng}`;
}

async function fetchCurrentWeather(precinct) {
  const cacheKey = cacheKeyForPrecinct(precinct);
  const cached = weatherCache.get(cacheKey);
  if (cached && (Date.now() - cached.fetchedAt) < WEATHER_CACHE_MS) {
    return cached.data;
  }

  const response = await axios.get(OPEN_METEO_URL, {
    params: {
      latitude: precinct.lat,
      longitude: precinct.lng,
      current: 'temperature_2m,relative_humidity_2m,wind_speed_10m',
      timezone: 'Australia/Sydney',
    },
    timeout: 10000,
  });

  const current = response.data?.current;
  if (!current) return null;

  const data = {
    temperature: current.temperature_2m ?? null,
    humidity: current.relative_humidity_2m ?? null,
    wind_speed: current.wind_speed_10m ?? null,
    last_updated: current.time ? new Date(current.time).toISOString() : new Date().toISOString(),
  };

  weatherCache.set(cacheKey, { data, fetchedAt: Date.now() });
  return data;
}

async function fetchDefaultMelbourneWeather() {
  return fetchCurrentWeather(MELBOURNE_CENTRAL_WEATHER);
}

async function enrichPrecinctWithWeather(precinctData, weights) {
  const configPrecinct = precinctMap[precinctData.id];
  if (!shouldUseWeatherFallback(precinctData) || !configPrecinct?.lat || !configPrecinct?.lng) {
    return precinctData;
  }

  try {
    let weather = await fetchCurrentWeather(configPrecinct);
    if (!weather || weather.temperature === null) {
      weather = await fetchDefaultMelbourneWeather();
    }
    if (!weather || weather.temperature === null) return precinctData;

    const temperature = weather.temperature;
    const humidity = weather.humidity ?? precinctData.humidity ?? 55;
    const windSpeed = weather.wind_speed ?? precinctData.wind_speed;
    const activityCount = Number(precinctData.activity_count ?? 0);
    const weighted = calculateComfortScore({
      temperature,
      humidity,
      activityCount
    }, weights ?? undefined);

    return {
      ...precinctData,
      comfort_score: weighted.score,
      comfort_label: weighted.label,
      activity_level: weighted.activityLevel,
      temperature,
      humidity,
      wind_speed: windSpeed,
      last_updated: weather.last_updated,
      stale_data: false,
    };
  } catch (err) {
    console.error(`[Weather Fallback] ${precinctData.id}:`, err?.message || err);
    try {
      const weather = await fetchDefaultMelbourneWeather();
      if (!weather || weather.temperature === null) return precinctData;

      const humidity = weather.humidity ?? precinctData.humidity ?? 55;
      const activityCount = Number(precinctData.activity_count ?? 0);
      const weighted = calculateComfortScore({
        temperature: weather.temperature,
        humidity,
        activityCount
      }, weights ?? undefined);

      return {
        ...precinctData,
        comfort_score: weighted.score,
        comfort_label: weighted.label,
        activity_level: weighted.activityLevel,
        temperature: weather.temperature,
        humidity,
        wind_speed: precinctData.wind_speed ?? weather.wind_speed,
        last_updated: weather.last_updated,
        stale_data: false,
      };
    } catch {
      return precinctData;
    }
  }
}

async function enrichPrecinctsWithWeather(precinctData, weights) {
  return Promise.all(precinctData.map((item) => enrichPrecinctWithWeather(item, weights)));
}

function buildFallbackPrecinct(precinct, weights) {
  const fallback = FALLBACK_SENSOR_DATA[precinct.id];
  const lastUpdated = new Date().toISOString();

  if (!fallback) {
    return {
      id: precinct.id,
      name: precinct.name,
      comfort_score: 50,
      comfort_label: 'Caution',
      temperature: null,
      humidity: null,
      wind_speed: null,
      pm25: null,
      activity_count: 0,
      activity_level: 'Low',
      stale_data: false,
      no_sensor_data: true,
      last_updated: lastUpdated,
      lat: precinct.lat,
      lng: precinct.lng
    };
  }

  const weighted = calculateComfortScore({
    temperature: fallback.temperature,
    humidity: fallback.humidity,
    activityCount: fallback.activity_count
  }, weights ?? undefined);

  return {
    id: precinct.id,
    name: precinct.name,
    comfort_score: weighted.score,
    comfort_label: weighted.label,
    temperature: fallback.temperature,
    humidity: fallback.humidity,
    wind_speed: fallback.wind_speed,
    pm25: fallback.pm25,
    activity_count: fallback.activity_count,
    activity_level: weighted.activityLevel,
    stale_data: false,
    no_sensor_data: false,
    last_updated: lastUpdated,
    lat: precinct.lat,
    lng: precinct.lng
  };
}

function getFallbackPrecincts(weights, ids = null) {
  const allowed = ids ? new Set(ids) : null;
  return precincts
    .filter((precinct) => !allowed || allowed.has(precinct.id))
    .map((precinct) => buildFallbackPrecinct(precinct, weights));
}

async function getFallbackToday(id, weights) {
  const precinct = precincts.find((item) => item.id === id);
  if (!precinct) return null;

  const fallback = await enrichPrecinctWithWeather(buildFallbackPrecinct(precinct, weights), weights);
  const recommendationData = {
    temperature: fallback.temperature,
    comfort_label: fallback.comfort_label,
    pm25: fallback.pm25 ?? 0,
  };

  return {
    precinct_id: fallback.id,
    date: new Date().toISOString().slice(0, 10),
    recommendation: getRecommendation(recommendationData),
    recommendation_basis: {
      current_temp: fallback.temperature,
      current_humidity: fallback.humidity,
      current_activity: fallback.activity_level
    },
    preparation_advice: getPreparationAdvice(recommendationData)
  };
}

/** GET /api/health */
router.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

/** GET /api/precincts/current — all 12 precincts, latest scores */
router.get('/precincts/current', async (req, res) => {
  const weights = parseWeights(req.query);
  try {
    const result = await query(`
      WITH latest_scores AS (
        SELECT DISTINCT ON (precinct_id)
          precinct_id, precinct_name, comfort_score, comfort_label,
          temperature, humidity, wind_speed, pm25,
          activity_count, activity_level, stale_data, no_sensor_data, calc_timestamp
        FROM precinct_scores
        ORDER BY precinct_id, calc_timestamp DESC
      ),
      latest_readings AS (
        SELECT precinct_id, MAX(received_at) AS latest_sensor_at
        FROM sensor_readings
        GROUP BY precinct_id
      )
      SELECT latest_scores.*, latest_readings.latest_sensor_at
      FROM latest_scores
      LEFT JOIN latest_readings USING (precinct_id)
    `);

    if (result.rows.length === 0) {
      const fallbackPrecincts = await enrichPrecinctsWithWeather(getFallbackPrecincts(weights), weights);
      return res.json({ precincts: fallbackPrecincts });
    }

    const data = result.rows.map(row => {
      const weighted = applyResponseWeights(row, weights);
      const lastUpdated = row.latest_sensor_at ?? row.calc_timestamp;
      return ({
      id:             row.precinct_id,
      name:           row.precinct_name,
      comfort_score:  weighted.comfort_score,
      comfort_label:  weighted.comfort_label,
      temperature:    row.temperature    !== null ? parseFloat(row.temperature)    : null,
      humidity:       row.humidity       !== null ? parseFloat(row.humidity)       : null,
      wind_speed:     row.wind_speed     !== null ? parseFloat(row.wind_speed)     : null,
      pm25:           row.pm25           !== null ? parseFloat(row.pm25)           : null,
      activity_count: row.activity_count,
      activity_level: weighted.activity_level,
      stale_data:     deriveStaleFlag(lastUpdated),
      no_sensor_data: row.no_sensor_data,
      last_updated:   lastUpdated,
      lat:            precinctMap[row.precinct_id]?.lat ?? null,
      lng:            precinctMap[row.precinct_id]?.lng ?? null
      });
    });

    const precinctsWithWeather = await enrichPrecinctsWithWeather(data, weights);
    res.json({ precincts: precinctsWithWeather });
  } catch (err) {
    console.error('[GET /precincts/current]', err?.stack || err?.message || err);
    const fallbackPrecincts = await enrichPrecinctsWithWeather(getFallbackPrecincts(weights), weights);
    res.json({ precincts: fallbackPrecincts });
  }
});

/** GET /api/precincts/compare?a=cbd&b=southbank */
router.get('/precincts/compare', async (req, res) => {
  const { a, b } = req.query;
  if (!a || !b) return res.status(400).json({ error: 'Params a and b required', code: 400, timestamp: new Date().toISOString() });
  const weights = parseWeights(req.query);
  try {
    const result = await query(`
      WITH latest_scores AS (
        SELECT DISTINCT ON (precinct_id)
          precinct_id, precinct_name, comfort_score, comfort_label,
          temperature, humidity, wind_speed, pm25,
          activity_count, activity_level, stale_data, no_sensor_data, calc_timestamp
        FROM precinct_scores
        WHERE precinct_id = ANY($1)
        ORDER BY precinct_id, calc_timestamp DESC
      ),
      latest_readings AS (
        SELECT precinct_id, MAX(received_at) AS latest_sensor_at
        FROM sensor_readings
        WHERE precinct_id = ANY($1)
        GROUP BY precinct_id
      )
      SELECT latest_scores.*, latest_readings.latest_sensor_at
      FROM latest_scores
      LEFT JOIN latest_readings USING (precinct_id)
    `, [[a, b]]);

    if (result.rows.length === 0) {
      const fallbackPrecincts = await enrichPrecinctsWithWeather(getFallbackPrecincts(weights, [a, b]), weights);
      return res.json({ precincts: fallbackPrecincts });
    }

    const data = result.rows.map(row => {
      const weighted = applyResponseWeights(row, weights);
      const lastUpdated = row.latest_sensor_at ?? row.calc_timestamp;
      return ({
      id: row.precinct_id, name: row.precinct_name,
      comfort_score: weighted.comfort_score, comfort_label: weighted.comfort_label,
      temperature: row.temperature !== null ? parseFloat(row.temperature) : null,
      humidity: row.humidity !== null ? parseFloat(row.humidity) : null,
      wind_speed: row.wind_speed !== null ? parseFloat(row.wind_speed) : null,
      pm25: row.pm25 !== null ? parseFloat(row.pm25) : null,
      activity_count: row.activity_count, activity_level: weighted.activity_level,
      stale_data: deriveStaleFlag(lastUpdated), no_sensor_data: row.no_sensor_data,
      last_updated: lastUpdated,
      lat: precinctMap[row.precinct_id]?.lat ?? null,
      lng: precinctMap[row.precinct_id]?.lng ?? null
      });
    });

    const precinctsWithWeather = await enrichPrecinctsWithWeather(data, weights);
    res.json({ precincts: precinctsWithWeather });
  } catch (err) {
    console.error('[GET /precincts/compare]', err?.stack || err?.message || err);
    const fallbackPrecincts = await enrichPrecinctsWithWeather(getFallbackPrecincts(weights, [a, b]), weights);
    res.json({ precincts: fallbackPrecincts });
  }
});

/** GET /api/precincts/:id/today */
router.get('/precincts/:id/today', async (req, res) => {
  const weights = parseWeights(req.query);
  try {
    const result = await query(`
      SELECT DISTINCT ON (precinct_id)
        precinct_id, precinct_name, comfort_score, comfort_label,
        temperature, humidity, pm25, activity_count, activity_level, stale_data
      FROM precinct_scores WHERE precinct_id=$1
      ORDER BY precinct_id, calc_timestamp DESC
    `, [req.params.id]);

    if (result.rows.length === 0) {
      const fallbackToday = await getFallbackToday(req.params.id, weights);
      if (fallbackToday) return res.json(fallbackToday);
      return res.status(404).json({ error: 'Precinct not found', code: 404, timestamp: new Date().toISOString() });
    }

    const row  = result.rows[0];
    const lastUpdated = row.calc_timestamp;
    const basePrecinct = {
      id: row.precinct_id,
      name: row.precinct_name,
      comfort_score: row.comfort_score,
      comfort_label: row.comfort_label,
      temperature: row.temperature !== null ? parseFloat(row.temperature) : null,
      humidity: row.humidity !== null ? parseFloat(row.humidity) : null,
      wind_speed: null,
      pm25: row.pm25 !== null ? parseFloat(row.pm25) : null,
      activity_count: row.activity_count,
      activity_level: row.activity_level,
      stale_data: deriveStaleFlag(lastUpdated),
      no_sensor_data: !(precinctMap[row.precinct_id]?.has_sensors),
      last_updated: lastUpdated,
      lat: precinctMap[row.precinct_id]?.lat ?? null,
      lng: precinctMap[row.precinct_id]?.lng ?? null
    };
    const enrichedPrecinct = await enrichPrecinctWithWeather(basePrecinct, weights);
    const data = {
      temperature:    enrichedPrecinct.temperature,
      comfort_label:  enrichedPrecinct.comfort_label,
      pm25:           enrichedPrecinct.pm25 ?? 0,
    };

    res.json({
      precinct_id:          row.precinct_id,
      date:                 new Date().toISOString().slice(0, 10),
      recommendation:       getRecommendation(data),
      recommendation_basis: {
        current_temp:     data.temperature,
        current_humidity: enrichedPrecinct.humidity,
        current_activity: enrichedPrecinct.activity_level
      },
      preparation_advice:   getPreparationAdvice(data)
    });
  } catch (err) {
    console.error('[GET /precincts/:id/today]', err?.stack || err?.message || err);
    const fallbackToday = await getFallbackToday(req.params.id, weights);
    if (fallbackToday) return res.json(fallbackToday);
    res.status(500).json({ error: err.message, code: 500, timestamp: new Date().toISOString() });
  }
});

/** GET /api/furniture?precinct=cbd&type=drinking_fountain */
router.get('/furniture', async (req, res) => {
  const { precinct = 'all', type = 'all', limit = '200' } = req.query;
  if (!precinct) return res.status(400).json({ error: 'precinct param required', code: 400, timestamp: new Date().toISOString() });
  try {
    const parsedLimit = Number(limit);
    const safeLimit = Number.isFinite(parsedLimit) && parsedLimit > 0
      ? Math.min(Math.floor(parsedLimit), 1000)
      : 200;

    let typeFilter = '';
    if (type === 'drinking_fountain') typeFilter = "&refine=asset_type:Drinking+Fountain";
    else if (type === 'bicycle_rail')  typeFilter = "&refine=asset_type:Bicycle+Rails";

    const pageSize = 100;
    const records = [];
    let offset = 0;

    while (records.length < safeLimit) {
      const remaining = safeLimit - records.length;
      const currentLimit = Math.min(pageSize, remaining);
      const url = `https://data.melbourne.vic.gov.au/api/explore/v2.1/catalog/datasets/street-furniture-including-bollards-bicycle-rails-bins-drinking-fountains-horse-/records?limit=${currentLimit}&offset=${offset}${typeFilter}`;
      const resp = await axios.get(url, { timeout: 10000 });
      const batch = resp.data.results || [];

      records.push(...batch);
      if (batch.length < currentLimit) break;
      offset += batch.length;
    }

    const readCoords = (record) => {
      if (record?.coordinatelocation && Number.isFinite(record.coordinatelocation.lon) && Number.isFinite(record.coordinatelocation.lat)) {
        return [record.coordinatelocation.lon, record.coordinatelocation.lat];
      }
      if (record?.geo_point_2d && Number.isFinite(record.geo_point_2d.lon) && Number.isFinite(record.geo_point_2d.lat)) {
        return [record.geo_point_2d.lon, record.geo_point_2d.lat];
      }
      if (record?.location && Array.isArray(record.location.coordinates) && record.location.coordinates.length === 2) {
        const [lon, lat] = record.location.coordinates;
        if (Number.isFinite(lon) && Number.isFinite(lat)) return [lon, lat];
      }
      return null;
    };

    const features = records
      .map(r => {
        const coords = readCoords(r);
        if (!coords) return null;
        return {
          type: 'Feature',
          geometry: { type: 'Point', coordinates: coords },
          properties: { asset_type: r.asset_type ?? '', location_desc: r.location_desc ?? '', condition_rating: r.condition_rating ?? null }
        };
      })
      .filter(Boolean);

    res.json({ type: 'FeatureCollection', features });
  } catch (err) {
    console.error('[GET /furniture] Fallback to static:', err.message);
    res.json(require('../../config/furniture.json'));
  }
});

module.exports = router;
