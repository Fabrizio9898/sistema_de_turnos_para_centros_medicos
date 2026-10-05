import { Controller, Get, Param, ParseUUIDPipe, Query } from "@nestjs/common";
import { CurrentClinic } from "../auth/current-clinic.decorator";
import { Clinic } from "../entities/clinic.entity";
import { AvailabilityService } from "./availability.service";
import { GetSlotsQuery } from "./get-slots.query";

@Controller("doctors")
export class AvailabilityController {
  constructor(private readonly availability: AvailabilityService) {}

  @Get(":id/slots")
  slots(
    @CurrentClinic() clinic: Clinic,
    @Param("id", ParseUUIDPipe) id: string,
    @Query() query: GetSlotsQuery,
  ) {
    return this.availability.getSlots(
      clinic.id,
      id,
      query.date,
      query.serviceId,
      clinic.timezone,
    );
  }
}
