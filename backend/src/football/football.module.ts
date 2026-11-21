import { Module } from '@nestjs/common';
import { FootballController } from './football.controller.js';
import { FootballService } from './football.service.js';

@Module({
  controllers: [FootballController],
  providers: [FootballService],
})
export class FootballModule {}
