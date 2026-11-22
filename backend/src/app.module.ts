import { Module } from '@nestjs/common';
import { AdminModule } from './admin/admin.module.js';
import { AuthModule } from './auth/auth.module.js';
import { FootballModule } from './football/football.module.js';
import { HealthModule } from './health/health.module.js';
import { PredictionsModule } from './predictions/predictions.module.js';
import { LeaderboardModule } from './leaderboard/leaderboard.module.js';
import { PrismaModule } from './prisma/prisma.module.js';
import { SportmonksModule } from './providers/sportmonks/sportmonks.module.js';
import { TheSportsDbModule } from './providers/thesportsdb/thesportsdb.module.js';

@Module({
  imports: [
    PrismaModule,
    HealthModule,
    AuthModule,
    FootballModule,
    PredictionsModule,
    AdminModule,
    LeaderboardModule,
    SportmonksModule,
    TheSportsDbModule,
  ],
})
export class AppModule {}
