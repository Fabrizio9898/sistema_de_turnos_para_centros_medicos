import { Body, Controller, Param, ParseUUIDPipe, Post } from "@nestjs/common";

import { Clinic } from "../../entities/clinic.entity";
import { AppointmentService } from "./appointment.service";
import { CreateAppointmentDto } from "./create-appointment.dto";
import { RescheduleAppointmentDto } from "./reschedule-appointment.dto";
import { CurrentClinic } from "../auth/current-clinic.decorator";

@Controller("appointments")
export class AppointmentController {
  constructor(private readonly appointments: AppointmentService) {}

  @Post()
  create(@CurrentClinic() clinic: Clinic, @Body() dto: CreateAppointmentDto) {
    return this.appointments.create(clinic, dto);
  }

  @Post(":id/cancel")
  cancel(
    @CurrentClinic() clinic: Clinic,
    @Param("id", ParseUUIDPipe) id: string,
  ) {
    return this.appointments.cancel(clinic, id);
  }

  @Post(":id/reschedule")
  reschedule(
    @CurrentClinic() clinic: Clinic,
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: RescheduleAppointmentDto,
  ) {
    return this.appointments.reschedule(clinic, id, dto);
  }
}
