import { IsISO8601, IsUUID } from "class-validator";

export class CreateAppointmentDto {
  @IsUUID()
  doctorId: string;

  @IsUUID()
  patientId: string;

  @IsUUID()
  serviceId: string;

  @IsISO8601()
  startsAt: string;
}
