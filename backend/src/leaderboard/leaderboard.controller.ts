import {
  BadRequestException,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Query,
} from '@nestjs/common';
import type { LeaderboardPeriod } from './aden-period.js';
import { LeaderboardService } from './leaderboard.service.js';

@Controller('leaderboard')
export class LeaderboardController {
  constructor(private readonly leaderboardService: LeaderboardService) {}

  @Get('global')
  global(
    @Query('period') period = 'all',
    @Query('limit') limit = '50',
  ) {
    if (!['all', 'week', 'month'].includes(period)) {
      throw new BadRequestException('period must be all, week or month');
    }
    return this.leaderboardService.getGlobal(
      period as LeaderboardPeriod,
      this.parseLimit(limit),
    );
  }

  @Get('season/:seasonId')
  season(
    @Param('seasonId', new ParseUUIDPipe({ version: '4' })) seasonId: string,
    @Query('limit') limit = '50',
  ) {
    return this.leaderboardService.getSeason(seasonId, this.parseLimit(limit));
  }

  private parseLimit(value: string): number {
    const parsed = Number(value);
    if (!Number.isInteger(parsed) || parsed < 1 || parsed > 100) {
      throw new BadRequestException('limit must be an integer between 1 and 100');
    }
    return parsed;
  }
}
