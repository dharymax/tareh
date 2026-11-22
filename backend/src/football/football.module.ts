import { Module } from '@nestjs/common';
import { FootballController } from './football.controller.js';
import { FootballService } from './football.service.js';
import { SportsProvidersModule } from './providers/sports-providers.module.js';

@Module({
  imports: [SportsProvidersModule],
  controllers: [FootballController],
  providers: [FootballService],
})
export class FootballModule {}
