const express   = require('express');
const axios     = require('axios');
const router    = express.Router();
const { query } = require('../db');
const { calculateComfortScore, getRecommendation, getPreparationAdvice } = require('../scoring/comfortScore');
const precincts = require('../../config/precincts.json');

const precinctMap = Object.fromEntries(precincts.map(p => [p.id, p]));

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

/** GET /api/health */
router.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

/** GET /api/precincts/current — all 12 precincts, latest scores */
router.get('/precincts/current', async (req, res) => {
  try {
    const weights = parseWeights(req.query);
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

    const data = result.rows.map(row => {
      const weighted = applyResponseWeights(row, weights);
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
      stale_data:     row.stale_data,
      no_sensor_data: row.no_sensor_data,
      last_updated:   row.latest_sensor_at ?? row.calc_timestamp,
      lat:            precinctMap[row.precinct_id]?.lat ?? null,
      lng:            precinctMap[row.precinct_id]?.lng ?? null
      });
    });

    res.json({ precincts: data });
  } catch (err) {
    console.error('[GET /precincts/current]', err.message);
    res.status(500).json({ error: 'Failed to fetch precinct data', code: 500, timestamp: new Date().toISOString() });
  }
});

/** GET /api/precincts/compare?a=cbd&b=southbank */
router.get('/precincts/compare', async (req, res) => {
  const { a, b } = req.query;
  if (!a || !b) return res.status(400).json({ error: 'Params a and b required', code: 400, timestamp: new Date().toISOString() });
  try {
    const weights = parseWeights(req.query);
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

    const data = result.rows.map(row => {
      const weighted = applyResponseWeights(row, weights);
      return ({
      id: row.precinct_id, name: row.precinct_name,
      comfort_score: weighted.comfort_score, comfort_label: weighted.comfort_label,
      temperature: row.temperature !== null ? parseFloat(row.temperature) : null,
      humidity: row.humidity !== null ? parseFloat(row.humidity) : null,
      wind_speed: row.wind_speed !== null ? parseFloat(row.wind_speed) : null,
      pm25: row.pm25 !== null ? parseFloat(row.pm25) : null,
      activity_count: row.activity_count, activity_level: weighted.activity_level,
      stale_data: row.stale_data, no_sensor_data: row.no_sensor_data,
      last_updated: row.latest_sensor_at ?? row.calc_timestamp,
      lat: precinctMap[row.precinct_id]?.lat ?? null,
      lng: precinctMap[row.precinct_id]?.lng ?? null
      });
    });

    res.json({ precincts: data });
  } catch (err) {
    res.status(500).json({ error: err.message, code: 500, timestamp: new Date().toISOString() });
  }
});

/** GET /api/precincts/:id/today */
router.get('/precincts/:id/today', async (req, res) => {
  try {
    const weights = parseWeights(req.query);
    const result = await query(`
      SELECT DISTINCT ON (precinct_id)
        precinct_id, precinct_name, comfort_score, comfort_label,
        temperature, humidity, pm25, activity_count, activity_level, stale_data
      FROM precinct_scores WHERE precinct_id=$1
      ORDER BY precinct_id, calc_timestamp DESC
    `, [req.params.id]);

    if (result.rows.length === 0)
      return res.status(404).json({ error: 'Precinct not found', code: 404, timestamp: new Date().toISOString() });

    const row  = result.rows[0];
    const weighted = applyResponseWeights(row, weights);
    const data = {
      temperature:    row.temperature !== null ? parseFloat(row.temperature) : null,
      comfort_label:  weighted.comfort_label,
      pm25:           row.pm25 !== null ? parseFloat(row.pm25) : 0,
    };

    res.json({
      precinct_id:          row.precinct_id,
      date:                 new Date().toISOString().slice(0, 10),
      recommendation:       getRecommendation(data),
      recommendation_basis: {
        current_temp:     data.temperature,
        current_humidity: row.humidity !== null ? parseFloat(row.humidity) : null,
        current_activity: row.activity_level
      },
      preparation_advice:   getPreparationAdvice(data)
    });
  } catch (err) {
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
