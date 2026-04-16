CREATE TABLE IF NOT EXISTS precinct_scores (
  id              SERIAL PRIMARY KEY,
  precinct_id     VARCHAR(50)  NOT NULL,
  precinct_name   VARCHAR(100) NOT NULL,
  comfort_score   INTEGER      NOT NULL CHECK (comfort_score >= 0 AND comfort_score <= 100),
  comfort_label   VARCHAR(20)  NOT NULL,
  temperature     DECIMAL(5,2),
  humidity        DECIMAL(5,2),
  wind_speed      DECIMAL(5,2),
  pm25            DECIMAL(6,2),
  activity_count  INTEGER      DEFAULT 0,
  activity_level  VARCHAR(10),
  sensor_count    INTEGER      DEFAULT 0,
  stale_data      BOOLEAN      DEFAULT FALSE,
  no_sensor_data  BOOLEAN      DEFAULT FALSE,
  calc_timestamp  TIMESTAMPTZ  DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_ps_precinct_calc ON precinct_scores(precinct_id, calc_timestamp DESC);
