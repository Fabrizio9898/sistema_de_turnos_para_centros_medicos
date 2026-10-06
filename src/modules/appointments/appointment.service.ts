import {
  ConflictException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Clinic } from "../../entities/clinic.entity";
import { Appointment } from "../../entities/appointment.entity";
import { Doctor } from "../../entities/doctor.entity";
import { Patient } from "../../entities/patient.entity";
import { Service } from "../../entities/service.entity";
import { AvailabilityService } from "../availability/availability.service";
import { WebhookService } from "../../webhook/webhook.service";
import { CreateAppointmentDto } from "./create-appointment.dto";
import { RescheduleAppointmentDto } from "./reschedule-appointment.dto";
import { missingPatientFields } from "../patients/patient-fields";

const EXCLUSION_VIOLATION = "23P01";

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
    private readonly availability: AvailabilityService,
    private readonly webhook: WebhookService,
  ) {}

  async create(clinic: Clinic, dto: CreateAppointmentDto) {
    const [doctor, patient, service] = await Promise.all([
      this.doctors.findOne({
        where: { id: dto.doctorId, clinicId: clinic.id },
      }),
      this.patients.findOne({
        where: { id: dto.patientId, clinicId: clinic.id },
      }),
      this.services.findOne({
        where: {
          id: dto.serviceId,
          doctorId: dto.doctorId,
          clinicId: clinic.id,
        },
      }),
    ]);

    if (!doctor) throw new NotFoundException("Doctor not found");
    if (!patient) throw new NotFoundException("Patient not found");
    if (!service) throw new NotFoundException("Service not found for doctor");

    const missingFields = missingPatientFields(patient, [
      ...(clinic.patientRequiredFields ?? []),
      ...(doctor.patientRequiredFields ?? []),
    ]);
    if (missingFields.length > 0) {
      throw new UnprocessableEntityException({
        message: "Patient is missing required fields",
        missingFields,
      });
    }

    const startsAt = new Date(dto.startsAt);
    await this.availability.assertBookable(
      clinic,
      doctor.id,
      service.durationMin,
      startsAt,
    );

    const appointment = await this.saveOrConflict({
      clinicId: clinic.id,
      doctorId: dto.doctorId,
      patientId: dto.patientId,
      serviceId: dto.serviceId,
      startsAt,
      endsAt: new Date(startsAt.getTime() + service.durationMin * 60_000),
      status: "confirmed",
      source: "bot",
    } as Appointment);

    await this.webhook.notifyAppointmentCreated(clinic, appointment);
    return appointment;
  }

  async cancel(clinic: Clinic, id: string) {
    const appointment = await this.findActive(clinic, id, "cancel");

    appointment.status = "cancelled";
    await this.appointments.save(appointment);

    await this.webhook.notifyAppointmentCancelled(clinic, appointment);
    return appointment;
  }

  async reschedule(clinic: Clinic, id: string, dto: RescheduleAppointmentDto) {
    const appointment = await this.findActive(clinic, id, "reschedule");

    const service = await this.services.findOne({
      where: { id: appointment.serviceId, clinicId: clinic.id },
    });
    if (!service) throw new NotFoundException("Service not found");

    const startsAt = new Date(dto.startsAt);
    await this.availability.assertBookable(
      clinic,
      appointment.doctorId,
      service.durationMin,
      startsAt,
      appointment.id,
    );

    appointment.startsAt = startsAt;
    appointment.endsAt = new Date(
      startsAt.getTime() + service.durationMin * 60_000,
    );
    await this.saveOrConflict(appointment);

    await this.webhook.notifyAppointmentRescheduled(clinic, appointment);
    return appointment;
  }

  private async findActive(
    clinic: Clinic,
    id: string,
    action: string,
  ): Promise<Appointment> {
    const appointment = await this.appointments.findOne({
      where: { id, clinicId: clinic.id },
    });
    if (!appointment) throw new NotFoundException("Appointment not found");
    if (appointment.status === "cancelled") {
      throw new ConflictException(`Cannot ${action} a cancelled appointment`);
    }
    return appointment;
  }

  /** The no_double_booking constraint is the final guard against concurrent bookings. */
  private async saveOrConflict(appointment: Appointment): Promise<Appointment> {
    try {
      return await this.appointments.save(appointment);
    } catch (error) {
      if ((error as { code?: string }).code === EXCLUSION_VIOLATION) {
        throw new ConflictException("Slot already booked");
      }
      throw error;
    }
  }
}
