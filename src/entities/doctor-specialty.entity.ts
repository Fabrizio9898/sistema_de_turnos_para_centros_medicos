import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from "typeorm";
import { Clinic } from "./clinic.entity";
import { Doctor } from "./doctor.entity";
import { Specialty } from "./specialty.entity";

@Entity("doctor_specialties")
export class DoctorSpecialty {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ name: "clinic_id" })
  clinicId!: string;

  @ManyToOne(() => Clinic, { onDelete: "CASCADE" })
  @JoinColumn({ name: "clinic_id" })
  clinic!: Clinic;

  @Column({ name: "doctor_id" })
  doctorId!: string;

  @ManyToOne(() => Doctor, (doctor) => doctor.doctorSpecialties, {
    onDelete: "CASCADE",
  })
  @JoinColumn({ name: "doctor_id" })
  doctor!: Doctor;

  @Column({ name: "specialty_id" })
  specialtyId!: string;

  @ManyToOne(() => Specialty, (specialty) => specialty.doctorSpecialties, {
    onDelete: "CASCADE",
  })
  @JoinColumn({ name: "specialty_id" })
  specialty!: Specialty;
}
