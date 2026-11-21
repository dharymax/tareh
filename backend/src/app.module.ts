import { Module } from '@nestjs/common';
import { FootballModule } from './football/football.module.js';
import { HealthModule } from './health/health.module.js';
import { PrismaModule } from './prisma/prisma.module.js';

@Module({
  imports: [PrismaModule, HealthModule, FootballModule],
})
export class AppModule {}
