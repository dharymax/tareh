import { Module } from '@nestjs/common';
import { AuthModule } from '../../auth/auth.module.js';
import { RolesGuard } from '../../auth/roles.guard.js';
import { SportradarController } from './sportradar.controller.js';
import { SportradarService } from './sportradar.service.js';

@Module({
  imports: [AuthModule],
  controllers: [SportradarController],
  providers: [SportradarService, RolesGuard],
})
export class SportradarModule {}
