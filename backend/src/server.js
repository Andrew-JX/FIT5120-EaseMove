require('dotenv').config();
const app    = require('./app');
const { start } = require('./scheduler/dataPoller');

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`[Server] EaseMove API on port ${PORT}`);
  console.log(`[Server] CORS: ${process.env.CORS_ORIGIN}`);
  start();
});
