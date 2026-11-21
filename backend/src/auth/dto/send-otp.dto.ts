import { Matches } from 'class-validator';

export class SendOtpDto {
  @Matches(/^\+[1-9]\d{7,14}$/, {
    message: 'phone must be a valid E.164 number, for example +9677XXXXXXXX',
  })
  phone!: string;
}
