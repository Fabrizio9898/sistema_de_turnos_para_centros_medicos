import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Patient } from "../entities/patient.entity";
import { CreatePatientDto } from "./create-patient.dto";

@Injectable()
export class PatientService {
  constructor(
    @InjectRepository(Patient)
    private readonly patients: Repository<Patient>,
  ) {}

  findByPhone(clinicId: string, phone: string): Promise<Patient | null> {
    return this.patients.findOne({ where: { clinicId, phone } });
  }

  async findOrCreate(
    clinicId: string,
    dto: CreatePatientDto,
  ): Promise<{ patient: Patient; created: boolean }> {
    const existing = await this.patients.findOne({
      where: { clinicId, phone: dto.phone },
    });
    if (existing) return { patient: existing, created: false };

    const patient = await this.patients.save({ clinicId, ...dto });
    return { patient, created: true };
  }
}
