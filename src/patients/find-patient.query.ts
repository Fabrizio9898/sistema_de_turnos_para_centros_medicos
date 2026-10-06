import { IsOptional, IsString, Matches, MinLength } from "class-validator";
import { DNI_PATTERN, NormalizeDni } from "./create-patient.dto";

export class FindPatientQuery {
  @IsOptional()
  @IsString()
  @MinLength(1)
  phone?: string;

  @IsOptional()
  @NormalizeDni()
  @Matches(DNI_PATTERN, { message: "dni must be 6 to 10 digits" })
  dni?: string;
}
