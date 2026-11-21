import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { AdminController } from './admin.controller.js';
import { AdminService } from './admin.service.js';
import { PointsModule } from '../points/points.module.js';
import { RolesGuard } from '../auth/roles.guard.js';

@Module({
  imports: [AuthModule, PointsModule],
  controllers: [AdminController],
  providers: [AdminService, RolesGuard],
})
export class AdminModule {}
