import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from "typeorm";
import { Clinic } from "./clinic.entity";
import { Doctor } from "./doctor.entity";
import { Appointment } from "./appointment.entity";

@Entity("services")
export class Service {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ name: "clinic_id" })
  clinicId!: string;

  @ManyToOne(() => Clinic, (clinic) => clinic.services, { onDelete: "CASCADE" })
  @JoinColumn({ name: "clinic_id" })
  clinic!: Clinic;

  @Column({ name: "doctor_id" })
  doctorId!: string;

  @ManyToOne(() => Doctor, (doctor) => doctor.services, { onDelete: "CASCADE" })
  @JoinColumn({ name: "doctor_id" })
  doctor!: Doctor;

  @Column()
  name!: string;

  @Column({ name: "duration_min" })
  durationMin!: number;

  @OneToMany(() => Appointment, (appointment) => appointment.service)
  appointments!: Appointment[];
}
