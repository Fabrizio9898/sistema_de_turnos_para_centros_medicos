import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Clinic } from "../entities/clinic.entity";
import { Appointment } from "../entities/appointment.entity";
import { Doctor } from "../entities/doctor.entity";
import { Patient } from "../entities/patient.entity";
import { Service } from "../entities/service.entity";
import { WebhookService } from "../webhook/webhook.service";
import { CreateAppointmentDto } from "./create-appointment.dto";
import { RescheduleAppointmentDto } from "./reschedule-appointment.dto";

@Injectable()
export class AppointmentService {
  constructor(
    @InjectRepository(Appointment)
    private readonly appointments: Repository<Appointment>,
    @InjectRepository(Doctor)
    private readonly doctors: Repository<Doctor>,
    @InjectRepository(Patient)
    private readonly patients: Repository<Patient>,
    @InjectRepository(Service)
    private readonly services: Repository<Service>,
    private readonly webhook: WebhookService,
  ) {}

  async create(clinic: Clinic, dto: CreateAppointmentDto) {
    const [doctor, patient, service] = await Promise.all([
      this.doctors.findOne({ where: { id: dto.doctorId, clinicId: clinic.id } }),
      this.patients.findOne({ where: { id: dto.patientId, clinicId: clinic.id } }),
      this.services.findOne({ where: { id: dto.serviceId, clinicId: clinic.id } }),
    ]);

    if (!doctor) throw new NotFoundException("Doctor not found");
    if (!patient) throw new NotFoundException("Patient not found");
    if (!service) throw new NotFoundException("Service not found");

    const startsAt = new Date(dto.startsAt);
    if (startsAt.getTime() < Date.now()) {
      throw new BadRequestException("Cannot create appointment in the past");
    }

    const endsAt = new Date(startsAt.getTime() + service.durationMin * 60_000);

    let appointment: Appointment;
    try {
      appointment = await this.appointments.save({
        clinicId: clinic.id,
        doctorId: dto.doctorId,
        patientId: dto.patientId,
        serviceId: dto.serviceId,
        startsAt,
        endsAt,
        status: "confirmed",
        source: "bot",
      });
    } catch (error) {
      if (error.code === "23P01") {
        throw new ConflictException("Slot already booked");
      }
      throw error;
    }

    await this.webhook.notifyAppointmentCreated(clinic, appointment);
    return appointment;
  }

  async cancel(clinic: Clinic, id: string) {
    const appointment = await this.appointments.findOne({
      where: { id, clinicId: clinic.id },
    });
    if (!appointment) throw new NotFoundException("Appointment not found");
    if (appointment.status === "cancelled") {
      throw new ConflictException("Appointment already cancelled");
    }

    appointment.status = "cancelled";
    await this.appointments.save(appointment);

    await this.webhook.notifyAppointmentCancelled(clinic, appointment);
  }

  async reschedule(
    clinic: Clinic,
    id: string,
    dto: RescheduleAppointmentDto,
  ) {
    const appointment = await this.appointments.findOne({
      where: { id, clinicId: clinic.id },
    });
    if (!appointment) throw new NotFoundException("Appointment not found");
    if (appointment.status === "cancelled") {
      throw new ConflictException("Cannot reschedule cancelled appointment");
    }

    const service = await this.services.findOne({
      where: { id: appointment.serviceId, clinicId: clinic.id },
    });
    if (!service) throw new NotFoundException("Service not found");

    const startsAt = new Date(dto.startsAt);
    if (startsAt.getTime() < Date.now()) {
      throw new BadRequestException("Cannot reschedule to the past");
    }

    const endsAt = new Date(startsAt.getTime() + service.durationMin * 60_000);

    appointment.startsAt = startsAt;
    appointment.endsAt = endsAt;

    try {
      await this.appointments.save(appointment);
    } catch (error) {
      if (error.code === "23P01") {
        throw new ConflictException("Slot already booked");
      }
      throw error;
    }
  }
}
