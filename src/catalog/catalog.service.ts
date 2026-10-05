import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { In, Repository } from "typeorm";
import { Specialty } from "../entities/specialty.entity";
import { Doctor } from "../entities/doctor.entity";
import { DoctorSpecialty } from "../entities/doctor-specialty.entity";

@Injectable()
export class CatalogService {
  constructor(
    @InjectRepository(Specialty)
    private readonly specialties: Repository<Specialty>,
    @InjectRepository(Doctor)
    private readonly doctors: Repository<Doctor>,
    @InjectRepository(DoctorSpecialty)
    private readonly doctorSpecialties: Repository<DoctorSpecialty>,
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
}
