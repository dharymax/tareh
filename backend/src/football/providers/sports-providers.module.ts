import { Module } from '@nestjs/common';
import { SportsProvidersController } from './sports-providers.controller.js';
import { SportsProvidersService } from './sports-providers.service.js';

@Module({
  controllers: [SportsProvidersController],
  providers: [SportsProvidersService],
  exports: [SportsProvidersService],
})
export class SportsProvidersModule {}
