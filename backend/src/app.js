require('dotenv').config();
const express   = require('express');
const cors      = require('cors');
const rateLimit = require('express-rate-limit');
const router    = require('./routes/precincts');

const app = express();

const allowedOrigins = [
  process.env.CORS_ORIGIN,
  'http://localhost:5173',
  'http://localhost:4173',
  'http://localhost:3000'
].filter(Boolean);

app.use(cors({ origin: allowedOrigins }));
app.use(express.json());
app.use('/api', rateLimit({ windowMs: 15 * 60 * 1000, max: 200, standardHeaders: true, legacyHeaders: false }));
app.use('/api', router);

app.use((req, res) => res.status(404).json({ error: 'Not found', code: 404, timestamp: new Date().toISOString() }));
app.use((err, req, res, next) => {
  console.error('[App Error]', err.message);
  res.status(500).json({ error: err.message || 'Internal server error', code: 500, timestamp: new Date().toISOString() });
});

module.exports = app;
