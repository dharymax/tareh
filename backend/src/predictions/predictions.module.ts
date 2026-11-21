import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { PredictionsController } from './predictions.controller.js';
import { PredictionsService } from './predictions.service.js';

@Module({
  imports: [AuthModule],
  controllers: [PredictionsController],
  providers: [PredictionsService],
})
export class PredictionsModule {}
