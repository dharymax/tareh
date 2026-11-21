import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';
import { JwtAuthGuard } from './jwt-auth.guard.js';
import { OtpDeliveryService } from './otp-delivery.service.js';

@Module({
  controllers: [AuthController],
  providers: [AuthService, OtpDeliveryService, JwtAuthGuard],
  exports: [AuthService, JwtAuthGuard],
})
export class AuthModule {}
