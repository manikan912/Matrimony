import { IsNotEmpty, IsString, Matches } from 'class-validator';

export class SendOtpDto {
  @IsString()
  @IsNotEmpty()
  @Matches(/^[6-9][0-9]{9}$/, { message: 'mobile must be a valid 10-digit Indian number' })
  mobile: string;
}
