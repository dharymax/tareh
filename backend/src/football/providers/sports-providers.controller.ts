import {
  BadRequestException,
  Controller,
  Get,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser, type AuthenticatedUser } from '../../auth/current-user.decorator.js';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard.js';
import { RequireRoles } from '../../auth/roles.decorator.js';
import { RolesGuard } from '../../auth/roles.guard.js';
import { SportsProvidersService } from './sports-providers.service.js';

@Controller('admin/sports-providers')
@UseGuards(JwtAuthGuard, RolesGuard)
@RequireRoles('SUPER_ADMIN', 'SPORTS_MANAGER')
export class SportsProvidersController {
  constructor(private readonly providers: SportsProvidersService) {}

  @Get('status')
  async status(@CurrentUser() _user: AuthenticatedUser) {
    return this.providers.status();
  }

  @Get('sportmonks/live')
  async sportmonksLive(@CurrentUser() _user: AuthenticatedUser) {
    return { data: await this.providers.listSportmonksLiveScores() };
  }

  @Post('sportmonks/sync')
  async syncSportmonks(
    @CurrentUser() _user: AuthenticatedUser,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    if ((from && !/^\d{4}-\d{2}-\d{2}$/.test(from)) || (to && !/^\d{4}-\d{2}-\d{2}$/.test(to))) {
      throw new BadRequestException('from and to must use YYYY-MM-DD');
    }
    if (from && to) {
      const start = new Date(`${from}T00:00:00Z`);
      const end = new Date(`${to}T00:00:00Z`);
      if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || start > end) {
        throw new BadRequestException('Invalid date range');
      }
      if (end.getTime() - start.getTime() > 31 * 86_400_000) {
        throw new BadRequestException('Date range cannot exceed 31 days');
      }
    }
    return this.providers.syncSportmonks(from, to);
  }

  @Get('sportmonks/fixtures')
  async sportmonksFixtures(
    @CurrentUser() _user: AuthenticatedUser,
    @Query('from') from: string,
    @Query('to') to: string,
  ) {
    if (!from || !to) throw new BadRequestException('from and to are required');
    const start = new Date(`${from}T00:00:00Z`);
    const end = new Date(`${to}T00:00:00Z`);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || start > end) {
      throw new BadRequestException('Invalid date range');
    }
    if (end.getTime() - start.getTime() > 31 * 86_400_000) {
      throw new BadRequestException('Date range cannot exceed 31 days');
    }
    return { data: await this.providers.listSportmonksFixtures(from, to) };
  }

  @Get('thesportsdb/team')
  async searchTeam(
    @CurrentUser() _user: AuthenticatedUser,
    @Query('name') name: string,
  ) {
    if (!name) throw new BadRequestException('name is required');
    return { data: await this.providers.searchSportsDbTeam(name) };
  }
}
