import { Module } from '@nestjs/common';
import { AuthModule } from '../../auth/auth.module.js';
import { RolesGuard } from '../../auth/roles.guard.js';
import { SportmonksController } from './sportmonks.controller.js';
import { SportmonksService } from './sportmonks.service.js';

@Module({
  imports: [AuthModule],
  controllers: [SportmonksController],
  providers: [SportmonksService, RolesGuard],
})
export class SportmonksModule {}
