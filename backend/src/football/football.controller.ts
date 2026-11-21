import {
  BadRequestException,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Query,
} from '@nestjs/common';
import { FootballService } from './football.service.js';

@Controller()
export class FootballController {
  constructor(private readonly footballService: FootballService) {}

  @Get('leagues')
  async listLeagues(@Query('enabled') enabled?: string) {
    const isEnabled = enabled === undefined ? true : enabled !== 'false';
    return { data: await this.footballService.listLeagues(isEnabled) };
  }

  @Get('teams')
  async listTeams(
    @Query('leagueId') leagueId?: string,
    @Query('search') search?: string,
  ) {
    if (leagueId && !/^[0-9a-f-]{36}$/i.test(leagueId)) {
      throw new BadRequestException('leagueId must be a UUID');
    }
    return { data: await this.footballService.listTeams({ leagueId, search }) };
  }

  @Get('matches/live')
  async liveMatches() {
    return { data: await this.footballService.listLiveMatches() };
  }

  @Get('matches/today')
  async todayMatches() {
    return { data: await this.footballService.listTodayMatches() };
  }

  @Get('matches/upcoming')
  async upcomingMatches(
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('limit') limit?: string,
  ) {
    return {
      data: await this.footballService.listUpcomingMatches({
        from,
        to,
        limit: this.parseLimit(limit),
      }),
    };
  }

  @Get('matches')
  async listMatches(
    @Query('date') date?: string,
    @Query('leagueId') leagueId?: string,
    @Query('status') status?: string,
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: string,
  ) {
    if (leagueId && !/^[0-9a-f-]{36}$/i.test(leagueId)) {
      throw new BadRequestException('leagueId must be a UUID');
    }
    if (cursor && !/^[0-9a-f-]{36}$/i.test(cursor)) {
      throw new BadRequestException('cursor must be a UUID');
    }
    return this.footballService.listMatches({
      date,
      leagueId,
      status,
      cursor,
      limit: this.parseLimit(limit),
    });
  }

  @Get('matches/:matchId')
  async getMatch(
    @Param('matchId', new ParseUUIDPipe({ version: '4' })) matchId: string,
  ) {
    return { data: await this.footballService.getMatch(matchId) };
  }

  private parseLimit(value?: string): number {
    if (value === undefined) return 25;
    const parsed = Number(value);
    if (!Number.isInteger(parsed) || parsed < 1 || parsed > 100) {
      throw new BadRequestException('limit must be an integer between 1 and 100');
    }
    return parsed;
  }
}
