-- Deduplicate sensor_readings, keep only the row with the lowest id per (device_id, received_at)
DELETE FROM sensor_readings
WHERE id NOT IN (
  SELECT MIN(id)
  FROM sensor_readings
  GROUP BY device_id, received_at
);

-- Add unique constraint to sensor_readings if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'sensor_readings_device_received_unique'
  ) THEN
    ALTER TABLE sensor_readings
      ADD CONSTRAINT sensor_readings_device_received_unique UNIQUE (device_id, received_at);
  END IF;
END $$;

-- Add no_sensor_data column to precinct_scores if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'precinct_scores' AND column_name = 'no_sensor_data'
  ) THEN
    ALTER TABLE precinct_scores ADD COLUMN no_sensor_data BOOLEAN DEFAULT FALSE;
  END IF;
END $$;
