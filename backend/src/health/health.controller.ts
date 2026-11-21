import { Controller, Get, HttpCode, HttpStatus } from '@nestjs/common';
import { HealthService } from './health.service.js';

@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get('live')
  @HttpCode(HttpStatus.OK)
  live(): { status: 'ok'; service: string } {
    return { status: 'ok', service: 'tareh-api' };
  }

  @Get('ready')
  async ready(): Promise<{ status: 'ready'; checks: { database: 'ok' } }> {
    await this.healthService.checkDatabase();
    return { status: 'ready', checks: { database: 'ok' } };
  }
}
