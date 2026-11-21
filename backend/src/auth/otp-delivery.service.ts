import {
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';

@Injectable()
export class OtpDeliveryService {
  private readonly logger = new Logger(OtpDeliveryService.name);

  async sendCode(phone: string, code: string, expiresInSeconds: number): Promise<void> {
    if (process.env.NODE_ENV === 'production') {
      throw new ServiceUnavailableException(
        'OTP delivery provider is not configured. Configure an approved SMS provider before production.',
      );
    }

    // Development-only delivery adapter. It never returns the code from the HTTP API.
    this.logger.warn(
      `DEVELOPMENT OTP for ${phone}: ${code} (expires in ${expiresInSeconds}s)`,
    );
  }
}
