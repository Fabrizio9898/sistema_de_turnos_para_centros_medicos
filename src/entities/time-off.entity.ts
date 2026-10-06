import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from "typeorm";
import { Clinic } from "./clinic.entity";
import { Doctor } from "./doctor.entity";

@Entity("time_offs")
export class TimeOff {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ name: "clinic_id" })
  clinicId!: string;

  @ManyToOne(() => Clinic, (clinic) => clinic.timeOffs, { onDelete: "CASCADE" })
  @JoinColumn({ name: "clinic_id" })
  clinic!: Clinic;

  @Column({ name: "doctor_id" })
  doctorId!: string;

  @ManyToOne(() => Doctor, (doctor) => doctor.timeOffs, { onDelete: "CASCADE" })
  @JoinColumn({ name: "doctor_id" })
  doctor!: Doctor;

  @Column({ name: "starts_at", type: "timestamptz" })
  startsAt!: Date;

  @Column({ name: "ends_at", type: "timestamptz" })
  endsAt!: Date;

  @Column({ type: "text", nullable: true })
  reason!: string | null;
}
