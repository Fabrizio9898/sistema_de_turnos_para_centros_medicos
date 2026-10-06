import { Transform } from "class-transformer";
import { IsOptional, IsString, Matches, MinLength } from "class-validator";

/** Accepts "12.345.678" or "12 345 678" and stores digits only. */
export const NormalizeDni = () =>
  Transform(({ value }) =>
    typeof value === "string" ? value.replace(/[.\s-]/g, "") : value,
  );
export const DNI_PATTERN = /^\d{6,10}$/;

export class CreatePatientDto {
  @IsString()
  @MinLength(1)
  name: string;

  @IsString()
  @MinLength(1)
  phone: string;

  @IsOptional()
  @NormalizeDni()
  @Matches(DNI_PATTERN, { message: "dni must be 6 to 10 digits" })
  dni?: string;

  @IsOptional()
  @IsString()
  telegramChatId?: string;

  @IsOptional()
  @IsString()
  whatsappId?: string;
}
