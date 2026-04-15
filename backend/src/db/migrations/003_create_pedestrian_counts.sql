CREATE TABLE IF NOT EXISTS pedestrian_counts (
  id              SERIAL PRIMARY KEY,
  location_id     INTEGER      NOT NULL,
  sensor_name     VARCHAR(50),
  sensing_date    DATE         NOT NULL,
  hourday         INTEGER      NOT NULL CHECK (hourday >= 0 AND hourday <= 23),
  pedestrian_count INTEGER     NOT NULL DEFAULT 0,
  lat             DECIMAL(9,6),
  lng             DECIMAL(9,6),
  precinct_id     VARCHAR(50),
  retrieved_at    TIMESTAMPTZ  DEFAULT NOW(),
  CONSTRAINT ped_counts_unique UNIQUE (location_id, sensing_date, hourday)
);
CREATE INDEX IF NOT EXISTS idx_pc_precinct_date ON pedestrian_counts(precinct_id, sensing_date DESC, hourday);
CREATE INDEX IF NOT EXISTS idx_pc_location_date ON pedestrian_counts(location_id, sensing_date DESC);
