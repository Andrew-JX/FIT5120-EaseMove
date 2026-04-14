require('dotenv').config();
const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const precinctRouter = require('./routes/precincts');

const app = express();

app.use(cors({ origin: process.env.CORS_ORIGIN }));
app.use(express.json());

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false
});
app.use('/api', limiter);
app.use('/api', precinctRouter);

app.use((req, res) => {
  res.status(404).json({ error: 'Not found', code: 404, timestamp: new Date().toISOString() });
});

app.use((err, req, res, next) => {
  console.error('[App Error]', err.message);
  res.status(500).json({ error: err.message || 'Internal server error', code: 500, timestamp: new Date().toISOString() });
});

module.exports = app;
