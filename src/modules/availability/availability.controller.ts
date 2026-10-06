import { Controller, Get, Param, ParseUUIDPipe, Query } from "@nestjs/common";
import { Clinic } from "../../entities/clinic.entity";
import { AvailabilityService } from "./availability.service";
import { GetSlotsQuery } from "./get-slots.query";
import { CurrentClinic } from "../auth/current-clinic.decorator";

@Controller("doctors")
export class AvailabilityController {
  constructor(private readonly availability: AvailabilityService) {}

  @Get(":id/slots")
  slots(
    @CurrentClinic() clinic: Clinic,
    @Param("id", ParseUUIDPipe) id: string,
    @Query() query: GetSlotsQuery,
  ) {
    return this.availability.getSlots(clinic, id, query.date, query.serviceId);
  }
}
