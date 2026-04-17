import { Controller, Get, Param, Query } from '@nestjs/common';
import { CosmicService } from './cosmic.service';

@Controller('api')
export class CosmicController {
  constructor(private readonly cosmicService: CosmicService) {}

  @Get('stations')
  async getStations() {
    return this.cosmicService.getStations();
  }

  @Get('stations/:code')
  async getStation(@Param('code') code: string) {
    return this.cosmicService.getStation(code.toUpperCase());
  }

  @Get('stations/:code/latest')
  async getLatestReading(@Param('code') code: string) {
    return this.cosmicService.getLatestReadingByCode(code.toUpperCase());
  }

  @Get('stations/:code/history')
  async getReadingHistory(
    @Param('code') code: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    return this.cosmicService.getReadingHistory(
      code.toUpperCase(),
      limit ? parseInt(limit, 10) : 100,
      offset ? parseInt(offset, 10) : 0,
    );
  }

  @Get('readings/latest')
  async getLatestReadings() {
    return this.cosmicService.getLatestReadings();
  }

  @Get('readings/history')
  async getAllReadingHistory(@Query('limit') limit?: string) {
    return this.cosmicService.getAllReadingHistory(
      limit ? parseInt(limit, 10) : 500,
    );
  }
}
