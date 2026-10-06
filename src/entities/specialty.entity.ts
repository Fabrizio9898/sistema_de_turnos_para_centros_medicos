import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from "typeorm";
import { Clinic } from "./clinic.entity";
import { DoctorSpecialty } from "./doctor-specialty.entity";

@Entity("specialties")
export class Specialty {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ name: "clinic_id" })
  clinicId!: string;

  @ManyToOne(() => Clinic, (clinic) => clinic.specialties, {
    onDelete: "CASCADE",
  })
  @JoinColumn({ name: "clinic_id" })
  clinic!: Clinic;

  @Column()
  name!: string;

  @OneToMany(() => DoctorSpecialty, (ds) => ds.specialty)
  doctorSpecialties!: DoctorSpecialty[];
}
