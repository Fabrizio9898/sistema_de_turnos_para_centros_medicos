import { IsOptional, IsString, MinLength } from "class-validator";

export class CreatePatientDto {
  @IsString()
  @MinLength(1)
  name: string;

  @IsString()
  @MinLength(1)
  phone: string;

  @IsOptional()
  @IsString()
  telegramChatId?: string;

  @IsOptional()
  @IsString()
  whatsappId?: string;
}
