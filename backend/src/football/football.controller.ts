import { Controller, Get, Param, ParseUUIDPipe, Query } from '@nestjs/common';
import { FootballService } from './football.service.js';
import {
  MatchesQueryDto,
  TeamsQueryDto,
  UpcomingMatchesQueryDto,
} from './dto/matches-query.dto.js';

@Controller()
export class FootballController {
  constructor(private readonly football: FootballService) {}

  @Get('leagues')
  listLeagues() {
    return this.football.listLeagues();
  }

  @Get('leagues/:id')
  getLeague(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.football.getLeague(id);
  }

  @Get('teams')
  listTeams(@Query() query: TeamsQueryDto) {
    return this.football.listTeams(query);
  }

  @Get('teams/:id')
  getTeam(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.football.getTeam(id);
  }

  @Get('matches/live')
  listLiveMatches() {
    return this.football.listLiveMatches();
  }

  @Get('matches/today')
  listTodayMatches() {
    return this.football.listTodayMatches();
  }

  @Get('matches/upcoming')
  listUpcomingMatches(@Query() query: UpcomingMatchesQueryDto) {
    return this.football.listUpcomingMatches(query);
  }

  @Get('matches')
  listMatches(@Query() query: MatchesQueryDto) {
    return this.football.listMatches(query);
  }

  @Get('matches/:id/statistics')
  getMatchStatistics(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.football.getMatchStatistics(id);
  }

  @Get('matches/:id/events')
  getMatchEvents(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.football.getMatchEvents(id);
  }

  @Get('matches/:id')
  getMatch(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.football.getMatch(id);
  }
}
