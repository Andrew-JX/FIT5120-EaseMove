CREATE TABLE IF NOT EXISTS sensor_readings (
  id SERIAL PRIMARY KEY,
  device_id VARCHAR(50) NOT NULL,
  precinct_id VARCHAR(50) NOT NULL,
  sensor_location TEXT,
  lat DECIMAL(9,6),
  lng DECIMAL(9,6),
  air_temperature DECIMAL(5,2),
  relative_humidity DECIMAL(5,2),
  average_wind_speed DECIMAL(5,2),
  gust_wind_speed DECIMAL(5,2),
  atmospheric_pressure DECIMAL(7,2),
  pm25 DECIMAL(6,2),
  pm10 DECIMAL(6,2),
  noise DECIMAL(6,2),
  received_at TIMESTAMPTZ NOT NULL,
  retrieved_at TIMESTAMPTZ DEFAULT NOW(),
  stale_data BOOLEAN DEFAULT FALSE
);

CREATE INDEX IF NOT EXISTS idx_sensor_readings_device_received
  ON sensor_readings(device_id, received_at DESC);

CREATE INDEX IF NOT EXISTS idx_sensor_readings_precinct_received
  ON sensor_readings(precinct_id, received_at DESC);
