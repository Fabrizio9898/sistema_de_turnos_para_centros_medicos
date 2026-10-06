import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { In, MoreThan, Not, Repository } from "typeorm";
import { Patient } from "../entities/patient.entity";
import { Appointment } from "../entities/appointment.entity";
import { Doctor } from "../entities/doctor.entity";
import { Service } from "../entities/service.entity";
import { CreatePatientDto } from "./create-patient.dto";
import { FindPatientQuery } from "./find-patient.query";
import { UpdatePatientDto } from "./update-patient.dto";

const UNIQUE_VIOLATION = "23505";

@Injectable()
export class PatientService {
  constructor(
    @InjectRepository(Patient)
    private readonly patients: Repository<Patient>,
    @InjectRepository(Appointment)
    private readonly appointments: Repository<Appointment>,
    @InjectRepository(Doctor)
    private readonly doctors: Repository<Doctor>,
    @InjectRepository(Service)
    private readonly services: Repository<Service>,
  ) {}

  /** Looks up by phone and/or DNI. Never runs an unfiltered query. */
  find(clinicId: string, query: FindPatientQuery): Promise<Patient | null> {
    if (!query.phone && !query.dni) {
      throw new BadRequestException("phone or dni is required");
    }
    return this.patients.findOne({
      where: {
        clinicId,
        ...(query.phone ? { phone: query.phone } : {}),
        ...(query.dni ? { dni: query.dni } : {}),
      },
    });
  }

  async findOrCreate(
    clinicId: string,
    dto: CreatePatientDto,
  ): Promise<{ patient: Patient; created: boolean }> {
    const existing = await this.patients.findOne({
      where: { clinicId, phone: dto.phone },
    });
    if (existing) return { patient: existing, created: false };

    const patient = await this.saveOrConflict({ clinicId, ...dto });
    return { patient, created: true };
  }

  async update(
    clinicId: string,
    id: string,
    dto: UpdatePatientDto,
  ): Promise<Patient> {
    const patient = await this.patients.findOne({ where: { id, clinicId } });
    if (!patient) throw new NotFoundException("Patient not found");
    const changes = Object.fromEntries(
      Object.entries(dto).filter(([, value]) => value !== undefined),
    );
    return this.saveOrConflict({ ...patient, ...changes });
  }

  /** Non-cancelled appointments that haven't ended yet, soonest first. */
  async upcomingAppointments(clinicId: string, patientId: string) {
    const patient = await this.patients.findOne({
      where: { id: patientId, clinicId },
    });
    if (!patient) throw new NotFoundException("Patient not found");

    const appointments = await this.appointments.find({
      where: {
        clinicId,
        patientId,
        status: Not("cancelled"),
        endsAt: MoreThan(new Date()),
      },
      order: { startsAt: "ASC" },
    });
    if (appointments.length === 0) return [];

    const [doctors, services] = await Promise.all([
      this.doctors.find({
        where: { id: In(appointments.map((a) => a.doctorId)), clinicId },
      }),
      this.services.find({
        where: { id: In(appointments.map((a) => a.serviceId)), clinicId },
      }),
    ]);
    const doctorName = new Map(doctors.map((d) => [d.id, d.name]));
    const serviceName = new Map(services.map((s) => [s.id, s.name]));

    return appointments.map((a) => ({
      id: a.id,
      doctorId: a.doctorId,
      doctorName: doctorName.get(a.doctorId) ?? null,
      serviceId: a.serviceId,
      serviceName: serviceName.get(a.serviceId) ?? null,
      startsAt: a.startsAt,
      endsAt: a.endsAt,
      status: a.status,
    }));
  }

  private async saveOrConflict(patient: Partial<Patient>): Promise<Patient> {
    try {
      return await this.patients.save(patient);
    } catch (error) {
      if ((error as { code?: string }).code === UNIQUE_VIOLATION) {
        throw new ConflictException(
          "Another patient already has this phone or DNI",
        );
      }
      throw error;
    }
  }
}
