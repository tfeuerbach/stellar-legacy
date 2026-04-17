import os
import sys
import logging
from datetime import datetime, timezone

import pandas as pd
import psycopg2
import psycopg2.extras
import requests
from apscheduler.schedulers.blocking import BlockingScheduler

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    stream=sys.stdout,
)
log = logging.getLogger("poller")

REALTIME_URL = "https://www.nmdb.eu/rt/realtime.txt"
DATABASE_URL = os.environ.get("DATABASE_URL")
if not DATABASE_URL:
    raise EnvironmentError("DATABASE_URL environment variable is required")
POLL_INTERVAL = int(os.environ.get("POLL_INTERVAL_SECONDS", 300))
RETENTION_HOURS = int(os.environ.get("RETENTION_HOURS", 24))
SPIKE_SIGMA = 3.0


def get_db():
    return psycopg2.connect(DATABASE_URL)


def load_stations(conn) -> dict:
    with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
        cur.execute("SELECT id, code, historical_min, historical_max FROM stations")
        return {row["code"]: dict(row) for row in cur.fetchall()}


def fetch_realtime() -> pd.DataFrame:
    resp = requests.get(REALTIME_URL, timeout=30)
    resp.raise_for_status()

    lines = [
        line for line in resp.text.strip().splitlines() if not line.startswith("#")
    ]
    if not lines:
        raise ValueError("Empty response from NMDB realtime endpoint")

    rows = []
    for line in lines:
        parts = line.split(";")
        if len(parts) != 3:
            continue
        ts_str, station, countrate_str = parts
        try:
            countrate = float(countrate_str)
        except ValueError:
            continue
        rows.append(
            {
                "timestamp": pd.Timestamp(ts_str.strip(), tz="UTC"),
                "station": station.strip(),
                "countrate": countrate,
            }
        )

    return pd.DataFrame(rows)


def detect_spikes(station_data: pd.DataFrame) -> pd.Series:
    mean = station_data["countrate"].mean()
    std = station_data["countrate"].std()
    if std == 0 or pd.isna(std):
        return pd.Series(False, index=station_data.index)
    return (station_data["countrate"] - mean).abs() > SPIKE_SIGMA * std


def normalize(value: float, hist_min: float, hist_max: float) -> float:
    if hist_max <= hist_min:
        return 0.5
    norm = (value - hist_min) / (hist_max - hist_min)
    return max(0.0, min(1.0, norm))


def get_previous_reading(conn, station_id: str) -> float | None:
    with conn.cursor() as cur:
        cur.execute(
            """SELECT normalized FROM cosmic_readings
               WHERE station_id = %s
               ORDER BY timestamp DESC LIMIT 1""",
            (station_id,),
        )
        row = cur.fetchone()
        return row[0] if row else None


def update_historical_range(conn, station_id: str, mean_val: float):
    with conn.cursor() as cur:
        cur.execute(
            """UPDATE stations
               SET historical_min = LEAST(historical_min, %s),
                   historical_max = GREATEST(historical_max, %s),
                   updated_at = NOW()
               WHERE id = %s""",
            (float(mean_val * 0.95), float(mean_val * 1.05), station_id),
        )


def poll():
    log.info("Starting poll cycle")
    try:
        df = fetch_realtime()
    except Exception:
        log.exception("Failed to fetch NMDB realtime data")
        return

    log.info("Fetched %d rows across %d stations", len(df), df["station"].nunique())

    conn = get_db()
    try:
        stations = load_stations(conn)
        inserted = 0

        for code, group in df.groupby("station"):
            if code not in stations:
                continue

            station = stations[code]
            group = group.sort_values("timestamp")

            spike_flags = detect_spikes(group)

            latest = group.iloc[-1]
            latest_ts = latest["timestamp"].to_pydatetime()
            raw_counts = float(latest["countrate"])
            is_anomalous = bool(spike_flags.iloc[-1])

            hist_min = float(station["historical_min"] or raw_counts * 0.9)
            hist_max = float(station["historical_max"] or raw_counts * 1.1)
            norm_val = normalize(raw_counts, hist_min, hist_max)

            prev_norm = get_previous_reading(conn, station["id"])
            flux_delta = float((norm_val - prev_norm) if prev_norm is not None else 0.0)

            update_historical_range(conn, station["id"], group["countrate"].mean())

            with conn.cursor() as cur:
                cur.execute(
                    """INSERT INTO cosmic_readings
                       (station_id, timestamp, raw_counts, normalized, flux_delta, is_anomalous)
                       VALUES (%s, %s, %s, %s, %s, %s)
                       ON CONFLICT (station_id, timestamp) DO NOTHING""",
                    (
                        station["id"],
                        latest_ts,
                        raw_counts,
                        norm_val,
                        flux_delta,
                        is_anomalous,
                    ),
                )
                inserted += cur.rowcount

        conn.commit()
        log.info("Inserted %d new readings", inserted)

        with conn.cursor() as cur:
            cur.execute(
                "DELETE FROM renders WHERE timestamp < NOW() - INTERVAL '%s hours'",
                (RETENTION_HOURS,),
            )
            renders_deleted = cur.rowcount
            cur.execute(
                "DELETE FROM cosmic_readings WHERE timestamp < NOW() - INTERVAL '%s hours'",
                (RETENTION_HOURS,),
            )
            readings_deleted = cur.rowcount
        conn.commit()
        if renders_deleted or readings_deleted:
            log.info(
                "Retention cleanup: removed %d readings, %d renders (>%dh old)",
                readings_deleted, renders_deleted, RETENTION_HOURS,
            )
    except Exception:
        conn.rollback()
        log.exception("Error during poll cycle")
    finally:
        conn.close()


def main():
    log.info(
        "Stellar Legacy NMDB Poller starting (interval=%ds, url=%s)",
        POLL_INTERVAL,
        REALTIME_URL,
    )

    poll()

    scheduler = BlockingScheduler()
    scheduler.add_job(poll, "interval", seconds=POLL_INTERVAL, misfire_grace_time=60, coalesce=True)
    log.info("Scheduler started, polling every %d seconds", POLL_INTERVAL)
    try:
        scheduler.start()
    except (KeyboardInterrupt, SystemExit):
        log.info("Poller shutting down")


if __name__ == "__main__":
    main()
