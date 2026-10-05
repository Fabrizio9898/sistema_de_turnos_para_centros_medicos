import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Query,
  UseGuards,
} from "@nestjs/common";
import { ApiKeyGuard } from "../auth/api-key.guard";
import { CurrentClinic } from "../auth/current-clinic.decorator";
import { Clinic } from "../entities/clinic.entity";
import { AvailabilityService } from "./availability.service";
import { GetSlotsQuery } from "./get-slots.query";

@Controller("doctors")
@UseGuards(ApiKeyGuard)
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
