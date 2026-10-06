import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Patient } from "../entities/patient.entity";
import { Appointment } from "../entities/appointment.entity";
import { Doctor } from "../entities/doctor.entity";
import { Service } from "../entities/service.entity";
import { PatientController } from "./patient.controller";
import { PatientService } from "./patient.service";

@Module({
  imports: [TypeOrmModule.forFeature([Patient, Appointment, Doctor, Service])],
  controllers: [PatientController],
  providers: [PatientService],
})
export class PatientModule {}
