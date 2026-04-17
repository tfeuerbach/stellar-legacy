import { Injectable, Logger, NotFoundException, OnModuleInit } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import * as path from 'path';
import * as fs from 'fs';

export interface RenderRecord {
  id: string;
  station_id: string;
  station_code: string;
  station_name: string;
  reading_id: string | null;
  timestamp: string;
  file_path: string;
  file_type: string;
  render_mode: string;
  width: number;
  height: number;
  seed_value: number;
  credit_text: string;
}

@Injectable()
export class ArchiveService implements OnModuleInit {
  private readonly logger = new Logger(ArchiveService.name);
  private readonly renderDir: string;

  constructor(private readonly db: DatabaseService) {
    this.renderDir = process.env.RENDER_OUTPUT_DIR || '/data/renders';
  }

  async onModuleInit() {
    try {
      await this.db.query(
        `ALTER TABLE renders DROP CONSTRAINT IF EXISTS renders_file_type_check`,
      );
      await this.db.query(
        `ALTER TABLE renders ADD CONSTRAINT renders_file_type_check CHECK (file_type IN ('mp4','png','gif','webm','jpg'))`,
      );
      this.logger.log('Ensured renders file_type constraint includes jpg');
    } catch (e) {
      this.logger.warn('Could not update file_type constraint', e);
    }

    await this.purgeNonNoiseRenders();

    fs.mkdirSync(this.renderDir, { recursive: true });

    setInterval(() => this.cleanExpiredFiles(), 30 * 60 * 1000);
    await this.cleanExpiredFiles();
  }

  private async cleanExpiredFiles(): Promise<void> {
    try {
      const expired = await this.db.query<{ id: string; file_path: string }>(
        `SELECT id, file_path FROM renders WHERE timestamp < NOW() - INTERVAL '24 hours'`,
      );
      if (expired.length === 0) return;

      for (const row of expired) {
        const full = path.resolve(this.renderDir, row.file_path);
        if (fs.existsSync(full)) {
          fs.unlinkSync(full);
        }
      }

      await this.db.query(
        `DELETE FROM renders WHERE timestamp < NOW() - INTERVAL '24 hours'`,
      );
      this.logger.log(`Retention cleanup: removed ${expired.length} expired renders and files`);
    } catch (e) {
      this.logger.warn('Failed to clean expired render files', e);
    }
  }

  private async purgeNonNoiseRenders(): Promise<void> {
    try {
      const result = await this.db.query<{ count: string }>(
        `SELECT COUNT(*) as count FROM renders WHERE render_mode != 'noise'`,
      );
      const count = parseInt(result[0]?.count || '0', 10);
      if (count > 0) {
        await this.db.query(`DELETE FROM renders WHERE render_mode != 'noise'`);
        this.logger.log(`Purged ${count} non-noise render records`);
      }
    } catch (e) {
      this.logger.warn('Failed to purge non-noise renders', e);
    }
  }

  async purgeAllScreenshots(): Promise<number> {
    const result = await this.db.query<{ count: string }>(
      `SELECT COUNT(*) as count FROM renders`,
    );
    const count = parseInt(result[0]?.count || '0', 10);
    if (count === 0) return 0;

    await this.db.query(`DELETE FROM renders`);
    this.logger.log(`Purged ${count} render records from database`);

    if (fs.existsSync(this.renderDir)) {
      fs.rmSync(this.renderDir, { recursive: true, force: true });
      fs.mkdirSync(this.renderDir, { recursive: true });
      this.logger.log(`Cleared render directory: ${this.renderDir}`);
    }
    return count;
  }

  async listRenders(options: {
    station?: string;
    limit?: number;
    offset?: number;
    startDate?: string;
    endDate?: string;
  }): Promise<RenderRecord[]> {
    const conditions: string[] = [];
    const params: any[] = [];
    let paramIdx = 1;

    if (options.station) {
      conditions.push(`s.code = $${paramIdx++}`);
      params.push(options.station.toUpperCase());
    }
    if (options.startDate) {
      conditions.push(`r.timestamp >= $${paramIdx++}`);
      params.push(options.startDate);
    }
    if (options.endDate) {
      conditions.push(`r.timestamp <= $${paramIdx++}`);
      params.push(options.endDate);
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const limit = options.limit || 50;
    const offset = options.offset || 0;

    const rows = await this.db.query<RenderRecord>(
      `SELECT r.id, r.station_id, s.code as station_code, s.name as station_name,
              r.reading_id, r.timestamp, r.file_path, r.file_type, r.render_mode,
              r.width, r.height, r.seed_value, r.credit_text
       FROM renders r
       JOIN stations s ON s.id = r.station_id
       ${where}
       ORDER BY r.timestamp DESC
       LIMIT $${paramIdx++} OFFSET $${paramIdx++}`,
      [...params, limit, offset],
    );

    const orphanIds: string[] = [];
    const valid = rows.filter((r) => {
      const full = path.resolve(this.renderDir, r.file_path);
      if (!fs.existsSync(full) || fs.statSync(full).size < 1024) {
        orphanIds.push(r.id);
        return false;
      }
      return true;
    });

    if (orphanIds.length > 0) {
      this.db
        .query(
          `DELETE FROM renders WHERE id = ANY($1::uuid[])`,
          [orphanIds],
        )
        .then(() =>
          this.logger.log(`Cleaned ${orphanIds.length} orphaned render records`),
        )
        .catch(() => {});
    }

    return valid;
  }

  async getRender(id: string): Promise<RenderRecord> {
    const render = await this.db.queryOne<RenderRecord>(
      `SELECT r.id, r.station_id, s.code as station_code, s.name as station_name,
              r.reading_id, r.timestamp, r.file_path, r.file_type, r.render_mode,
              r.width, r.height, r.seed_value, r.credit_text
       FROM renders r
       JOIN stations s ON s.id = r.station_id
       WHERE r.id = $1`,
      [id],
    );
    if (!render) {
      throw new NotFoundException(`Render ${id} not found`);
    }
    return render;
  }

  getRenderFilePath(render: RenderRecord): string {
    const fullPath = path.resolve(this.renderDir, render.file_path);
    if (!fs.existsSync(fullPath)) {
      throw new NotFoundException('Render file not found on disk');
    }
    return fullPath;
  }

  async createRenderRecord(data: {
    stationId: string;
    readingId: string | null;
    timestamp: Date;
    filePath: string;
    fileType: string;
    renderMode: string;
    width: number;
    height: number;
    seedValue: number;
    creditText: string;
  }): Promise<RenderRecord> {
    const rows = await this.db.query<RenderRecord>(
      `INSERT INTO renders (station_id, reading_id, timestamp, file_path, file_type, render_mode, width, height, seed_value, credit_text)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING *`,
      [
        data.stationId,
        data.readingId,
        data.timestamp,
        data.filePath,
        data.fileType,
        data.renderMode,
        data.width,
        data.height,
        data.seedValue,
        data.creditText,
      ],
    );
    return rows[0];
  }

  async saveScreenshot(
    stationCode: string,
    renderMode: string,
    seedValue: number,
    creditText: string,
    buffer: Buffer,
    width = 1920,
    height = 1080,
  ): Promise<RenderRecord | null> {
    if (!buffer || buffer.length < 1024) {
      this.logger.warn(
        `Screenshot rejected: ${stationCode} buffer too small (${buffer?.length ?? 0} bytes)`,
      );
      return null;
    }

    const station = await this.db.queryOne<{ id: string }>(
      `SELECT id FROM stations WHERE code = $1`,
      [stationCode.toUpperCase()],
    );
    if (!station) {
      this.logger.warn(`Screenshot upload: unknown station ${stationCode}`);
      return null;
    }

    const recent = await this.db.queryOne<{ id: string }>(
      `SELECT r.id FROM renders r
       WHERE r.station_id = $1 AND r.timestamp > NOW() - INTERVAL '4 minutes'
       LIMIT 1`,
      [station.id],
    );
    if (recent) {
      return null;
    }

    const now = new Date();
    const dateDir = path.join(
      stationCode.toUpperCase(),
      now.getUTCFullYear().toString(),
      String(now.getUTCMonth() + 1).padStart(2, '0'),
      String(now.getUTCDate()).padStart(2, '0'),
    );
    const outDir = path.join(this.renderDir, dateDir);
    fs.mkdirSync(outDir, { recursive: true });

    const ts = now.toISOString().replace(/[:.]/g, '-');
    const filename = `${ts}_${renderMode}.jpg`;
    const filePath = path.join(outDir, filename);
    const relativePath = path.join(dateDir, filename);

    fs.writeFileSync(filePath, buffer);
    this.logger.log(
      `Screenshot saved: ${relativePath} (${(buffer.length / 1024).toFixed(0)}KB, ${width}x${height}, ${stationCode}/${renderMode})`,
    );

    return this.createRenderRecord({
      stationId: station.id,
      readingId: null,
      timestamp: now,
      filePath: relativePath,
      fileType: 'jpg',
      renderMode,
      width,
      height,
      seedValue,
      creditText: creditText || '',
    });
  }

  async listRendersByStation(): Promise<Record<string, RenderRecord[]>> {
    const rows = await this.db.query<RenderRecord>(
      `SELECT r.id, r.station_id, s.code as station_code, s.name as station_name,
              r.reading_id, r.timestamp, r.file_path, r.file_type, r.render_mode,
              r.width, r.height, r.seed_value, r.credit_text
       FROM renders r
       JOIN stations s ON s.id = r.station_id
       ORDER BY r.timestamp DESC
       LIMIT 500`,
    );

    const orphanIds: string[] = [];
    const grouped: Record<string, RenderRecord[]> = {};
    for (const row of rows) {
      const full = path.resolve(this.renderDir, row.file_path);
      if (!fs.existsSync(full) || fs.statSync(full).size < 1024) {
        orphanIds.push(row.id);
        continue;
      }
      if (!grouped[row.station_code]) grouped[row.station_code] = [];
      grouped[row.station_code].push(row);
    }

    if (orphanIds.length > 0) {
      this.db
        .query(`DELETE FROM renders WHERE id = ANY($1::uuid[])`, [orphanIds])
        .then(() =>
          this.logger.log(`Cleaned ${orphanIds.length} orphaned render records`),
        )
        .catch(() => {});
    }

    return grouped;
  }
}
