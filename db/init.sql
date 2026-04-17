CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE stations (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code            VARCHAR(10) UNIQUE NOT NULL,
    name            TEXT NOT NULL,
    latitude        DOUBLE PRECISION,
    longitude       DOUBLE PRECISION,
    altitude        INTEGER,
    rigidity        DOUBLE PRECISION,
    credit_text     TEXT NOT NULL DEFAULT '',
    historical_min  DOUBLE PRECISION,
    historical_max  DOUBLE PRECISION,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE cosmic_readings (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    station_id      UUID NOT NULL REFERENCES stations(id) ON DELETE CASCADE,
    timestamp       TIMESTAMPTZ NOT NULL,
    raw_counts      DOUBLE PRECISION NOT NULL,
    normalized      DOUBLE PRECISION NOT NULL CHECK (normalized >= 0 AND normalized <= 1),
    flux_delta      DOUBLE PRECISION NOT NULL DEFAULT 0,
    pressure_mbar   DOUBLE PRECISION,
    is_anomalous    BOOLEAN NOT NULL DEFAULT FALSE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (station_id, timestamp)
);

CREATE TABLE renders (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    station_id      UUID NOT NULL REFERENCES stations(id) ON DELETE CASCADE,
    reading_id      UUID REFERENCES cosmic_readings(id) ON DELETE SET NULL,
    timestamp       TIMESTAMPTZ NOT NULL,
    file_path       TEXT NOT NULL,
    file_type       VARCHAR(10) NOT NULL CHECK (file_type IN ('mp4', 'png', 'gif', 'webm', 'jpg')),
    render_mode     VARCHAR(20) NOT NULL DEFAULT 'noise',
    width           INTEGER NOT NULL,
    height          INTEGER NOT NULL,
    seed_value      DOUBLE PRECISION NOT NULL,
    credit_text     TEXT NOT NULL DEFAULT '',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_readings_station_ts ON cosmic_readings(station_id, timestamp DESC);
CREATE INDEX idx_readings_timestamp ON cosmic_readings(timestamp DESC);
CREATE INDEX idx_renders_station_ts ON renders(station_id, timestamp DESC);
CREATE INDEX idx_renders_timestamp ON renders(timestamp DESC);

CREATE OR REPLACE FUNCTION notify_new_reading()
RETURNS TRIGGER AS $$
BEGIN
    PERFORM pg_notify('new_reading', json_build_object(
        'station_id', NEW.station_id,
        'timestamp', NEW.timestamp,
        'normalized', NEW.normalized,
        'flux_delta', NEW.flux_delta
    )::text);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_new_reading
    AFTER INSERT ON cosmic_readings
    FOR EACH ROW
    EXECUTE FUNCTION notify_new_reading();
