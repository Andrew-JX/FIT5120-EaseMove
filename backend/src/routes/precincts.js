const express = require('express');
const axios = require('axios');
const router = express.Router();
const { query } = require('../db');
const { getRecommendation, getPreparationAdvice } = require('../scoring/comfortScore');
const precincts = require('../../config/precincts.json');

/** GET /api/health — uptime ping, keeps Render warm */
router.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

/**
 * GET /api/precincts/current
 * Returns latest comfort score for all precincts.
 * Response: { precincts: PrecinctScore[] }
 */
router.get('/precincts/current', async (req, res) => {
  try {
    const result = await query(`
      SELECT DISTINCT ON (precinct_id)
        precinct_id, precinct_name, comfort_score, comfort_label,
        temperature, humidity, wind_speed, pm25,
        activity_count, activity_level, stale_data, calc_timestamp
      FROM precinct_scores
      ORDER BY precinct_id, calc_timestamp DESC
    `);

    const precinctMap = Object.fromEntries(precincts.map(p => [p.id, p]));

    const data = result.rows.map(row => ({
      id: row.precinct_id,
      name: row.precinct_name,
      comfort_score: row.comfort_score,
      comfort_label: row.comfort_label,
      temperature: row.temperature !== null ? parseFloat(row.temperature) : null,
      humidity: row.humidity !== null ? parseFloat(row.humidity) : null,
      wind_speed: row.wind_speed !== null ? parseFloat(row.wind_speed) : null,
      pm25: row.pm25 !== null ? parseFloat(row.pm25) : null,
      activity_count: row.activity_count,
      activity_level: row.activity_level,
      stale_data: row.stale_data,
      last_updated: row.calc_timestamp,
      lat: precinctMap[row.precinct_id]?.lat ?? null,
      lng: precinctMap[row.precinct_id]?.lng ?? null
    }));

    res.json({ precincts: data });
  } catch (err) {
    console.error('[GET /precincts/current]', err.message);
    res.status(500).json({ error: 'Failed to fetch precinct data', code: 500, timestamp: new Date().toISOString() });
  }
});

/**
 * GET /api/precincts/compare?a=cbd&b=southbank
 * Returns scores for two precincts side by side.
 * Query params: a, b (precinct ids — both required)
 * Response: { precincts: PrecinctScore[] } — array of 2
 */
router.get('/precincts/compare', async (req, res) => {
  const { a, b } = req.query;
  if (!a || !b) {
    return res.status(400).json({ error: 'Query params a and b are required', code: 400, timestamp: new Date().toISOString() });
  }

  try {
    const result = await query(`
      SELECT DISTINCT ON (precinct_id)
        precinct_id, precinct_name, comfort_score, comfort_label,
        temperature, humidity, wind_speed, pm25,
        activity_count, activity_level, stale_data, calc_timestamp
      FROM precinct_scores
      WHERE precinct_id = ANY($1)
      ORDER BY precinct_id, calc_timestamp DESC
    `, [[a, b]]);

    const precinctMap = Object.fromEntries(precincts.map(p => [p.id, p]));

    const data = result.rows.map(row => ({
      id: row.precinct_id,
      name: row.precinct_name,
      comfort_score: row.comfort_score,
      comfort_label: row.comfort_label,
      temperature: row.temperature !== null ? parseFloat(row.temperature) : null,
      humidity: row.humidity !== null ? parseFloat(row.humidity) : null,
      wind_speed: row.wind_speed !== null ? parseFloat(row.wind_speed) : null,
      pm25: row.pm25 !== null ? parseFloat(row.pm25) : null,
      activity_count: row.activity_count,
      activity_level: row.activity_level,
      stale_data: row.stale_data,
      last_updated: row.calc_timestamp,
      lat: precinctMap[row.precinct_id]?.lat ?? null,
      lng: precinctMap[row.precinct_id]?.lng ?? null
    }));

    res.json({ precincts: data });
  } catch (err) {
    console.error('[GET /precincts/compare]', err.message);
    res.status(500).json({ error: 'Failed to fetch comparison', code: 500, timestamp: new Date().toISOString() });
  }
});

/**
 * GET /api/precincts/:id/today
 * Returns time-slot recommendation and preparation advice for one precinct.
 * Response: { precinct_id, date, recommendation, recommendation_basis, preparation_advice }
 */
router.get('/precincts/:id/today', async (req, res) => {
  const { id } = req.params;

  try {
    const result = await query(`
      SELECT DISTINCT ON (precinct_id)
        precinct_id, comfort_label, temperature, humidity,
        activity_count, activity_level, pm25, stale_data, calc_timestamp
      FROM precinct_scores
      WHERE precinct_id = $1
      ORDER BY precinct_id, calc_timestamp DESC
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: `Precinct '${id}' not found`, code: 404, timestamp: new Date().toISOString() });
    }

    const row = result.rows[0];
    const precinctData = {
      temperature: row.temperature !== null ? parseFloat(row.temperature) : null,
      humidity: row.humidity !== null ? parseFloat(row.humidity) : null,
      comfort_label: row.comfort_label,
      pm25: row.pm25 !== null ? parseFloat(row.pm25) : null,
      activity_level: row.activity_level
    };

    res.json({
      precinct_id: row.precinct_id,
      date: new Date().toISOString().split('T')[0],
      recommendation: getRecommendation(precinctData),
      recommendation_basis: {
        current_temp: precinctData.temperature,
        current_humidity: precinctData.humidity,
        current_activity: precinctData.activity_level
      },
      preparation_advice: getPreparationAdvice(precinctData)
    });
  } catch (err) {
    console.error(`[GET /precincts/${id}/today]`, err.message);
    res.status(500).json({ error: 'Failed to fetch today data', code: 500, timestamp: new Date().toISOString() });
  }
});

/**
 * GET /api/furniture?precinct=cbd&type=all
 * Returns GeoJSON of street furniture (drinking fountains + bicycle rails).
 * Falls back to config/furniture.json if CoM API fails.
 * Query params: precinct (required), type ('drinking_fountain'|'bicycle_rail'|'all')
 */
router.get('/furniture', async (req, res) => {
  const { precinct, type = 'all' } = req.query;
  if (!precinct) {
    return res.status(400).json({ error: 'Query param precinct is required', code: 400, timestamp: new Date().toISOString() });
  }

  try {
    let typeFilter = '';
    if (type === 'drinking_fountain') typeFilter = '&refine=asset_type:Drinking+Fountain';
    else if (type === 'bicycle_rail') typeFilter = '&refine=asset_type:Bicycle+Rail';

    const url = `https://data.melbourne.vic.gov.au/api/explore/v2.1/catalog/datasets/street-furniture-including-bollards-bicycle-rails-bins-drinking-fountains-horse-/records?limit=100${typeFilter}`;
    const response = await axios.get(url, { timeout: 8000 });

    const features = (response.data.results || [])
      .filter(r => r.geo_point_2d)
      .map(r => ({
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [r.geo_point_2d.lon, r.geo_point_2d.lat] },
        properties: {
          asset_type: r.asset_type ?? '',
          location_description: r.location_description ?? '',
          status: r.status ?? ''
        }
      }));

    res.json({ type: 'FeatureCollection', features });
  } catch (err) {
    console.error('[GET /furniture] Falling back to static config:', err.message);
    const fallback = require('../../config/furniture.json');
    res.json(fallback);
  }
});

module.exports = router;
