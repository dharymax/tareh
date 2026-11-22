import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard.js';
import { RequireRoles } from '../../auth/roles.decorator.js';
import { RolesGuard } from '../../auth/roles.guard.js';
import { SyncSportmonksSeasonDto } from './dto/sync-season.dto.js';
import { SportmonksService } from './sportmonks.service.js';

@Controller('admin/providers/sportmonks')
@UseGuards(JwtAuthGuard, RolesGuard)
export class SportmonksController {
  constructor(private readonly sportmonksService: SportmonksService) {}

  @Get('connection')
  @RequireRoles('SUPER_ADMIN', 'SPORTS_MANAGER')
  async connection() {
    return { data: await this.sportmonksService.getConnectionStatus() };
  }

  @Get('imported-leagues')
  @RequireRoles('SUPER_ADMIN', 'SPORTS_MANAGER')
  async importedLeagues() {
    return { data: await this.sportmonksService.getImportedLeagues() };
  }

  @Get('leagues')
  @RequireRoles('SUPER_ADMIN', 'SPORTS_MANAGER')
  async leagues() {
    return { data: await this.sportmonksService.getLeagues() };
  }

  @Get('leagues/:leagueId/seasons')
  @RequireRoles('SUPER_ADMIN', 'SPORTS_MANAGER')
  async seasons(
    @Param('leagueId', ParseIntPipe) leagueId: number,
  ) {
    return { data: await this.sportmonksService.getLeagueSeasons(leagueId) };
  }

  @Post('sync-season')
  @RequireRoles('SUPER_ADMIN', 'SPORTS_MANAGER')
  async syncSeason(@Body() body: SyncSportmonksSeasonDto) {
    return { data: await this.sportmonksService.syncSeason(body) };
  }

  @Post('sync-live')
  @RequireRoles('SUPER_ADMIN', 'SPORTS_MANAGER')
  async syncLive() {
    return { data: await this.sportmonksService.syncLiveMatches() };
  }
}
