import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { In, Repository } from "typeorm";
import { PATIENT_FIELDS } from "../patients/patient-fields";
import { Specialty } from "@/entities/specialty.entity";
import { Doctor } from "@/entities/doctor.entity";
import { DoctorSpecialty } from "@/entities/doctor-specialty.entity";
import { Service } from "@/entities/service.entity";
import { Clinic } from "@/entities/clinic.entity";

@Injectable()
export class CatalogService {
  constructor(
    @InjectRepository(Specialty)
    private readonly specialties: Repository<Specialty>,
    @InjectRepository(Doctor)
    private readonly doctors: Repository<Doctor>,
    @InjectRepository(DoctorSpecialty)
    private readonly doctorSpecialties: Repository<DoctorSpecialty>,
    @InjectRepository(Service)
    private readonly services: Repository<Service>,
  ) {}

  listSpecialties(clinicId: string): Promise<Specialty[]> {
    return this.specialties.find({
      where: { clinicId },
      order: { name: "ASC" },
    });
  }

  async listDoctorsBySpecialty(
    clinicId: string,
    specialtyId: string,
  ): Promise<Doctor[]> {
    const links = await this.doctorSpecialties.find({
      where: { specialtyId },
    });
    const doctorIds = links.map((l) => l.doctorId);
    if (doctorIds.length === 0) return [];
    return this.doctors.find({
      where: { id: In(doctorIds), clinicId },
      order: { name: "ASC" },
    });
  }

  /**
   * Bookable services of a doctor, plus the patient fields the booking will
   * require (clinic + doctor), so the bot can collect them up front.
   */
  async listDoctorServices(clinic: Clinic, doctorId: string) {
    const doctor = await this.doctors.findOne({
      where: { id: doctorId, clinicId: clinic.id },
    });
    if (!doctor) throw new NotFoundException("Doctor not found");

    const services = await this.services.find({
      where: { doctorId, clinicId: clinic.id },
      order: { name: "ASC" },
    });
    const required = [
      ...(clinic.patientRequiredFields ?? []),
      ...(doctor.patientRequiredFields ?? []),
    ];

    return {
      doctorId: doctor.id,
      doctorName: doctor.name,
      patientRequiredFields: PATIENT_FIELDS.filter((f) => required.includes(f)),
      services: services.map((s) => ({
        id: s.id,
        name: s.name,
        durationMin: s.durationMin,
      })),
    };
  }
}
