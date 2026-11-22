import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard.js';
import { RequireRoles } from '../../auth/roles.decorator.js';
import { RolesGuard } from '../../auth/roles.guard.js';
import { TheSportsDbService } from './thesportsdb.service.js';

@Controller('admin/providers/thesportsdb')
@UseGuards(JwtAuthGuard, RolesGuard)
export class TheSportsDbController {
  constructor(private readonly service: TheSportsDbService) {}

  @Get('connection')
  @RequireRoles('SUPER_ADMIN', 'SPORTS_MANAGER')
  async connection() {
    return { data: await this.service.getConnectionStatus() };
  }

  @Post('enrich-league/:leagueId')
  @RequireRoles('SUPER_ADMIN', 'SPORTS_MANAGER')
  async enrichLeague(
    @Param('leagueId', new ParseUUIDPipe({ version: '4' })) leagueId: string,
  ) {
    return { data: await this.service.enrichLeague(leagueId) };
  }
}
