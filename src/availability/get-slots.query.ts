import { IsUUID, Matches } from "class-validator";

export class GetSlotsQuery {
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  date: string;

  @IsUUID()
  serviceId: string;
}
