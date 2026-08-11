import { IsNotEmpty, IsString, Matches } from 'class-validator';

export class VerifyOtpDto {
  @IsString()
  @IsNotEmpty()
  @Matches(/^[6-9][0-9]{9}$/, { message: 'mobile must be a valid 10-digit Indian number' })
  mobile: string;

  @IsString()
  @IsNotEmpty()
  @Matches(/^[0-9]{6}$/, { message: 'otp must be a 6-digit code' })
  otp: string;
}
