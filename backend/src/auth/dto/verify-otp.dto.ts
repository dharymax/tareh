import { Matches } from 'class-validator';

export class VerifyOtpDto {
  @Matches(/^\+[1-9]\d{7,14}$/, {
    message: 'phone must be a valid E.164 number',
  })
  phone!: string;

  @Matches(/^\d{6}$/, { message: 'code must contain exactly 6 digits' })
  code!: string;
}
