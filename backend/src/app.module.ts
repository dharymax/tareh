import { Module } from '@nestjs/common';
import { AuthModule } from './auth/auth.module.js';
import { FootballModule } from './football/football.module.js';
import { HealthModule } from './health/health.module.js';
import { PrismaModule } from './prisma/prisma.module.js';\nimport { PredictionsModule } from './predictions/predictions.module.js';

@Module({
  imports: [PrismaModule, HealthModule, FootballModule, AuthModule, PredictionsModule],
})
export class AppModule {}
