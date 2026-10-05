import { Body, Controller, Get, Post, Query, UseGuards } from "@nestjs/common";
import { ApiKeyGuard } from "../auth/api-key.guard";
import { CurrentClinic } from "../auth/current-clinic.decorator";
import { Clinic } from "../entities/clinic.entity";
import { CreatePatientDto } from "./create-patient.dto";
import { PatientService } from "./patient.service";

@Controller("patients")
@UseGuards(ApiKeyGuard)
export class PatientController {
  constructor(private readonly patients: PatientService) {}

  @Get()
  find(@CurrentClinic() clinic: Clinic, @Query("phone") phone: string) {
    return this.patients.findByPhone(clinic.id, phone);
  }

  @Post()
  create(@CurrentClinic() clinic: Clinic, @Body() dto: CreatePatientDto) {
    return this.patients.findOrCreate(clinic.id, dto);
  }
}
