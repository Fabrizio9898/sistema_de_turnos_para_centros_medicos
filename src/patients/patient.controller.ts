import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from "@nestjs/common";
import { CurrentClinic } from "../auth/current-clinic.decorator";
import { Clinic } from "../entities/clinic.entity";
import { CreatePatientDto } from "./create-patient.dto";
import { FindPatientQuery } from "./find-patient.query";
import { UpdatePatientDto } from "./update-patient.dto";
import { PatientService } from "./patient.service";

@Controller("patients")
export class PatientController {
  constructor(private readonly patients: PatientService) {}

  @Get()
  find(@CurrentClinic() clinic: Clinic, @Query() query: FindPatientQuery) {
    return this.patients.find(clinic.id, query);
  }

  @Post()
  create(@CurrentClinic() clinic: Clinic, @Body() dto: CreatePatientDto) {
    return this.patients.findOrCreate(clinic.id, dto);
  }

  @Patch(":id")
  update(
    @CurrentClinic() clinic: Clinic,
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: UpdatePatientDto,
  ) {
    return this.patients.update(clinic.id, id, dto);
  }

  @Get(":id/appointments")
  upcomingAppointments(
    @CurrentClinic() clinic: Clinic,
    @Param("id", ParseUUIDPipe) id: string,
  ) {
    return this.patients.upcomingAppointments(clinic.id, id);
  }
}
