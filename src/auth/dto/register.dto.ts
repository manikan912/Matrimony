import { IsNotEmpty, IsOptional, IsString, MinLength, Matches } from 'class-validator';

// Assumption: mobile numbers are Indian 10-digit numbers. Adjust the regex if you
// want to accept international formats (E.164) or different rules.
export class RegisterDto {
  @IsString()
  @IsNotEmpty()
  @Matches(/^[6-9][0-9]{9}$/, { message: 'mobile must be a valid 10-digit Indian number' })
  mobile: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(8, { message: 'password must be at least 8 characters long' })
  @Matches(/(?=.*[A-Z])/, { message: 'password must contain at least one uppercase letter' })
  @Matches(/(?=.*[a-z])/, { message: 'password must contain at least one lowercase letter' })
  @Matches(/(?=.*\d)/, { message: 'password must contain at least one digit' })
  password: string;

  @IsOptional()
  @IsString()
  name?: string;
}
