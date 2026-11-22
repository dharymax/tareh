import { Module } from '@nestjs/common';
import { AuthModule } from '../../auth/auth.module.js';
import { RolesGuard } from '../../auth/roles.guard.js';
import { TheSportsDbController } from './thesportsdb.controller.js';
import { TheSportsDbService } from './thesportsdb.service.js';

@Module({
  imports: [AuthModule],
  controllers: [TheSportsDbController],
  providers: [TheSportsDbService, RolesGuard],
})
export class TheSportsDbModule {}
