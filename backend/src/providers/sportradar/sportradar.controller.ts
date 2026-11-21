import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard.js';
import { RequireRoles } from '../../auth/roles.decorator.js';
import { RolesGuard } from '../../auth/roles.guard.js';
import { SyncSeasonDto } from './dto/sync-season.dto.js';
import { SportradarService } from './sportradar.service.js';

@Controller('admin/providers/sportradar')
@UseGuards(JwtAuthGuard, RolesGuard)
export class SportradarController {
  constructor(private readonly sportradarService: SportradarService) {}

  @Get('connection')
  @RequireRoles('SUPER_ADMIN', 'SPORTS_MANAGER')
  async connection() {
    return { data: await this.sportradarService.getConnectionStatus() };
  }

  @Get('competitions')
  @RequireRoles('SUPER_ADMIN', 'SPORTS_MANAGER')
  async competitions(@Query('region') region?: string) {
    if (region && region !== 'all' && region !== 'europe') {
      throw new BadRequestException('region must be europe or all');
    }
    return {
      data: await this.sportradarService.getCompetitions(
        region === 'all' ? 'all' : 'europe',
      ),
    };
  }

  @Get('competitions/:competitionId/seasons')
  @RequireRoles('SUPER_ADMIN', 'SPORTS_MANAGER')
  async competitionSeasons(@Param('competitionId') competitionId: string) {
    return {
      data: await this.sportradarService.getCompetitionSeasons(competitionId),
    };
  }

  @Post('sync-season')
  @RequireRoles('SUPER_ADMIN', 'SPORTS_MANAGER')
  async syncSeason(@Body() body: SyncSeasonDto) {
    return { data: await this.sportradarService.syncSeason(body) };
  }

  @Post('sync-live')
  @RequireRoles('SUPER_ADMIN', 'SPORTS_MANAGER')
  async syncLive() {
    return { data: await this.sportradarService.syncLiveMatches() };
  }
}
