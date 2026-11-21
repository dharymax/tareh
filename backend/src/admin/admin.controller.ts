import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser, type AuthenticatedUser } from '../auth/current-user.decorator.js';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { RequireRoles } from '../auth/roles.decorator.js';
import { RolesGuard } from '../auth/roles.guard.js';
import { AdminService } from './admin.service.js';
import { PointsService } from '../points/points.service.js';
import { FinalizeMatchDto } from './dto/finalize-match.dto.js';

@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AdminController {
  constructor(
    private readonly adminService: AdminService,
    private readonly pointsService: PointsService,
  ) {}

  @Get('dashboard')
  @RequireRoles('SUPER_ADMIN', 'SPORTS_MANAGER')
  async dashboard(@CurrentUser() _user: AuthenticatedUser) {
    return { data: await this.adminService.getDashboard() };
  }

  @Post('matches/:matchId/finalize')
  @RequireRoles('SUPER_ADMIN', 'SPORTS_MANAGER')
  finalizeMatch(
    @CurrentUser() user: AuthenticatedUser,
    @Param('matchId', new ParseUUIDPipe({ version: '4' })) matchId: string,
    @Body() body: FinalizeMatchDto,
  ) {
    return {
      data: this.pointsService.finalizeMatch(
        matchId,
        user.userId,
        body.homeScore,
        body.awayScore,
      ),
    };
  }
}
