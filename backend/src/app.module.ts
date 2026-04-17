import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from './database/database.module';
import { CosmicModule } from './cosmic/cosmic.module';
import { ArchiveModule } from './archive/archive.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    DatabaseModule,
    CosmicModule,
    ArchiveModule,
  ],
})
export class AppModule {}
