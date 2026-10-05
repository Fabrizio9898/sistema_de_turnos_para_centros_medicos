import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Appointment } from "../entities/appointment.entity";
import { Doctor } from "../entities/doctor.entity";
import { Patient } from "../entities/patient.entity";
import { Service } from "../entities/service.entity";
import { AppointmentController } from "./appointment.controller";
import { AppointmentService } from "./appointment.service";

@Module({
  imports: [TypeOrmModule.forFeature([Appointment, Doctor, Patient, Service])],
  controllers: [AppointmentController],
  providers: [AppointmentService],
})
export class AppointmentModule {}
