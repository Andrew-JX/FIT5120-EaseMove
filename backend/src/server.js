require('dotenv').config();
const app = require('./app');
const { start: startPoller } = require('./scheduler/dataPoller');

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`[Server] EaseMove API running on port ${PORT}`);
  console.log(`[Server] CORS origin: ${process.env.CORS_ORIGIN}`);
  startPoller();
});
