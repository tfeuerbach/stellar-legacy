import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';

export interface Station {
  id: string;
  code: string;
  name: string;
  latitude: number;
  longitude: number;
  altitude: number;
  rigidity: number;
  credit_text: string;
}

export interface CosmicReading {
  id: string;
  station_id: string;
  station_code: string;
  station_name: string;
  timestamp: string;
  raw_counts: number;
  normalized: number;
  flux_delta: number;
  is_anomalous: boolean;
  credit_text: string;
}

export interface StationUpdate {
  station: string;
  stationName: string;
  counts: number;
  normalized: number;
  fluxDelta: number;
  timestamp: string;
  credit: string;
}

@Injectable()
export class CosmicService implements OnModuleInit {
  private readonly logger = new Logger(CosmicService.name);
  private updateCallbacks: Array<(update: StationUpdate) => void> = [];

  constructor(private readonly db: DatabaseService) {}

  async onModuleInit() {
    this.db.on('new_reading', async (payload: any) => {
      try {
        const reading = await this.getLatestReading(payload.station_id);
        if (reading) {
          const update = this.toStationUpdate(reading);
          this.updateCallbacks.forEach((cb) => cb(update));
        }
      } catch (err) {
        this.logger.error('Error processing new reading notification', err);
      }
    });
  }

  onUpdate(callback: (update: StationUpdate) => void) {
    this.updateCallbacks.push(callback);
  }

  async getStations(): Promise<(Station & { reading_count: number })[]> {
    return this.db.query<Station & { reading_count: number }>(
      `SELECT s.id, s.code, s.name, s.latitude, s.longitude, s.altitude, s.rigidity, s.credit_text,
              COALESCE(cnt.c, 0)::int as reading_count
       FROM stations s
       LEFT JOIN (SELECT station_id, COUNT(*) as c FROM cosmic_readings GROUP BY station_id) cnt
         ON cnt.station_id = s.id
       ORDER BY reading_count DESC, s.name`,
    );
  }

  async getStation(code: string): Promise<Station | null> {
    return this.db.queryOne<Station>(
      `SELECT id, code, name, latitude, longitude, altitude, rigidity, credit_text
       FROM stations WHERE code = $1`,
      [code],
    );
  }

  async getLatestReading(stationId: string): Promise<CosmicReading | null> {
    return this.db.queryOne<CosmicReading>(
      `SELECT cr.id, cr.station_id, s.code as station_code, s.name as station_name,
              cr.timestamp, cr.raw_counts, cr.normalized, cr.flux_delta,
              cr.is_anomalous, s.credit_text
       FROM cosmic_readings cr
       JOIN stations s ON s.id = cr.station_id
       WHERE cr.station_id = $1
       ORDER BY cr.timestamp DESC LIMIT 1`,
      [stationId],
    );
  }

  async getLatestReadingByCode(code: string): Promise<CosmicReading | null> {
    return this.db.queryOne<CosmicReading>(
      `SELECT cr.id, cr.station_id, s.code as station_code, s.name as station_name,
              cr.timestamp, cr.raw_counts, cr.normalized, cr.flux_delta,
              cr.is_anomalous, s.credit_text
       FROM cosmic_readings cr
       JOIN stations s ON s.id = cr.station_id
       WHERE s.code = $1
       ORDER BY cr.timestamp DESC LIMIT 1`,
      [code],
    );
  }

  async getLatestReadings(): Promise<CosmicReading[]> {
    return this.db.query<CosmicReading>(
      `SELECT DISTINCT ON (s.code)
              cr.id, cr.station_id, s.code as station_code, s.name as station_name,
              cr.timestamp, cr.raw_counts, cr.normalized, cr.flux_delta,
              cr.is_anomalous, s.credit_text
       FROM cosmic_readings cr
       JOIN stations s ON s.id = cr.station_id
       ORDER BY s.code, cr.timestamp DESC`,
    );
  }

  async getReadingHistory(
    stationCode: string,
    limit = 100,
    offset = 0,
  ): Promise<CosmicReading[]> {
    return this.db.query<CosmicReading>(
      `SELECT cr.id, cr.station_id, s.code as station_code, s.name as station_name,
              cr.timestamp, cr.raw_counts, cr.normalized, cr.flux_delta,
              cr.is_anomalous, s.credit_text
       FROM cosmic_readings cr
       JOIN stations s ON s.id = cr.station_id
       WHERE s.code = $1
       ORDER BY cr.timestamp DESC
       LIMIT $2 OFFSET $3`,
      [stationCode, limit, offset],
    );
  }

  async getAllReadingHistory(limit = 500): Promise<CosmicReading[]> {
    return this.db.query<CosmicReading>(
      `SELECT cr.id, cr.station_id, s.code as station_code, s.name as station_name,
              cr.timestamp, cr.raw_counts, cr.normalized, cr.flux_delta,
              cr.is_anomalous, s.credit_text
       FROM cosmic_readings cr
       JOIN stations s ON s.id = cr.station_id
       ORDER BY cr.timestamp DESC
       LIMIT $1`,
      [limit],
    );
  }

  private toStationUpdate(reading: CosmicReading): StationUpdate {
    return {
      station: reading.station_code,
      stationName: reading.station_name,
      counts: reading.raw_counts,
      normalized: reading.normalized,
      fluxDelta: reading.flux_delta,
      timestamp: reading.timestamp,
      credit: reading.credit_text,
    };
  }
}
