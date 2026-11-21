import { Module } from '@nestjs/common';
import { AdminModule } from './admin/admin.module.js';
import { AuthModule } from './auth/auth.module.js';
import { FootballModule } from './football/football.module.js';
import { HealthModule } from './health/health.module.js';
import { PredictionsModule } from './predictions/predictions.module.js';
import { PrismaModule } from './prisma/prisma.module.js';

@Module({
  imports: [
    PrismaModule,
    HealthModule,
    AuthModule,
    FootballModule,
    PredictionsModule,
    AdminModule,
  ],
})
export class AppModule {}
