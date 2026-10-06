import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from "typeorm";
import { Clinic } from "./clinic.entity";
import { Doctor } from "./doctor.entity";

@Entity("availability_rules")
export class AvailabilityRule {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ name: "clinic_id" })
  clinicId!: string;

  @ManyToOne(() => Clinic, (clinic) => clinic.availabilityRules, {
    onDelete: "CASCADE",
  })
  @JoinColumn({ name: "clinic_id" })
  clinic!: Clinic;

  @Column({ name: "doctor_id" })
  doctorId!: string;

  @ManyToOne(() => Doctor, (doctor) => doctor.availabilityRules, {
    onDelete: "CASCADE",
  })
  @JoinColumn({ name: "doctor_id" })
  doctor!: Doctor;

  @Column({ name: "day_of_week" })
  dayOfWeek!: number;

  @Column({ name: "start_time" })
  startTime!: string;

  @Column({ name: "end_time" })
  endTime!: string;
}
