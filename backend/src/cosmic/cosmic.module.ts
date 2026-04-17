import { Module } from '@nestjs/common';
import { CosmicService } from './cosmic.service';
import { CosmicGateway } from './cosmic.gateway';
import { CosmicController } from './cosmic.controller';

@Module({
  providers: [CosmicService, CosmicGateway],
  controllers: [CosmicController],
  exports: [CosmicService],
})
export class CosmicModule {}
