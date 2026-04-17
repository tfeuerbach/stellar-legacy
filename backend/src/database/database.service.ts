import { Injectable, Inject, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { Pool, Client } from 'pg';
import { EventEmitter } from 'events';
import { ConfigService } from '@nestjs/config';
import { PG_POOL } from './constants';

@Injectable()
export class DatabaseService extends EventEmitter implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(DatabaseService.name);
  private listenClient: Client | null = null;

  constructor(
    @Inject(PG_POOL) private readonly pool: Pool,
    private readonly config: ConfigService,
  ) {
    super();
  }

  async onModuleInit() {
    await this.setupListener();
  }

  async onModuleDestroy() {
    if (this.listenClient) {
      await this.listenClient.end();
    }
    await this.pool.end();
  }

  async query<T = any>(text: string, params?: any[]): Promise<T[]> {
    const result = await this.pool.query(text, params);
    return result.rows;
  }

  async queryOne<T = any>(text: string, params?: any[]): Promise<T | null> {
    const rows = await this.query<T>(text, params);
    return rows[0] ?? null;
  }

  private async setupListener() {
    const connStr = this.config.get<string>(
      'DATABASE_URL',
      'postgresql://stellar:stellar_dev@localhost:5432/stellarlegacy',
    );
    this.listenClient = new Client({ connectionString: connStr });
    await this.listenClient.connect();
    await this.listenClient.query('LISTEN new_reading');

    this.listenClient.on('notification', (msg) => {
      if (msg.channel === 'new_reading' && msg.payload) {
        try {
          const data = JSON.parse(msg.payload);
          this.emit('new_reading', data);
        } catch {
          this.logger.warn('Failed to parse notification payload');
        }
      }
    });

    this.listenClient.on('error', (err) => {
      this.logger.error('LISTEN client error', err.message);
    });

    this.logger.log('Listening for new_reading notifications');
  }
}
