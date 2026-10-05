import {
  Body,
  Controller,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from "@nestjs/common";
import { ApiKeyGuard } from "../auth/api-key.guard";
import { CurrentClinic } from "../auth/current-clinic.decorator";
import { Clinic } from "../entities/clinic.entity";
import { AppointmentService } from "./appointment.service";
import { CreateAppointmentDto } from "./create-appointment.dto";
import { RescheduleAppointmentDto } from "./reschedule-appointment.dto";

@Controller("appointments")
@UseGuards(ApiKeyGuard)
export class AppointmentController {
  constructor(private readonly appointments: AppointmentService) {}

  @Post()
  create(@CurrentClinic() clinic: Clinic, @Body() dto: CreateAppointmentDto) {
    return this.appointments.create(clinic.id, dto);
  }

  @Post(":id/cancel")
  cancel(
    @CurrentClinic() clinic: Clinic,
    @Param("id", ParseUUIDPipe) id: string,
  ) {
    return this.appointments.cancel(clinic.id, id);
  }

  @Post(":id/reschedule")
  reschedule(
    @CurrentClinic() clinic: Clinic,
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: RescheduleAppointmentDto,
  ) {
    return this.appointments.reschedule(clinic.id, id, dto);
  }
}
