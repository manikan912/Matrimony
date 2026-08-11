import { IsOptional, IsString, IsNotEmpty } from 'class-validator';

export class RequestResetDto {
  @IsOptional()
  @IsString()
  mobile?: string;

  @IsOptional()
  @IsString()
  email?: string;
}
