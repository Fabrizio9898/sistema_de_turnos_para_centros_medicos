import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";
import { Clinic } from "./clinic.entity";
import { Doctor } from "./doctor.entity";
import { Patient } from "./patient.entity";
import { Service } from "./service.entity";

@Entity("appointments")
export class Appointment {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ name: "clinic_id" })
  clinicId!: string;

  @ManyToOne(() => Clinic, (clinic) => clinic.appointments, {
    onDelete: "CASCADE",
  })
  @JoinColumn({ name: "clinic_id" })
  clinic!: Clinic;

  @Column({ name: "doctor_id" })
  doctorId!: string;

  @ManyToOne(() => Doctor, (doctor) => doctor.appointments, {
    onDelete: "CASCADE",
  })
  @JoinColumn({ name: "doctor_id" })
  doctor!: Doctor;

  @Column({ name: "patient_id" })
  patientId!: string;

  @ManyToOne(() => Patient, (patient) => patient.appointments, {
    onDelete: "CASCADE",
  })
  @JoinColumn({ name: "patient_id" })
  patient!: Patient;

  @Column({ name: "service_id" })
  serviceId!: string;

  @ManyToOne(() => Service, (service) => service.appointments, {
    onDelete: "CASCADE",
  })
  @JoinColumn({ name: "service_id" })
  service!: Service;

  @Column({ name: "starts_at", type: "timestamptz" })
  startsAt!: Date;

  @Column({ name: "ends_at", type: "timestamptz" })
  endsAt!: Date;

  @Column({ default: "confirmed" })
  status!: string;

  @Column()
  source!: string;

  @Column({ name: "payment_link", type: "varchar", nullable: true })
  paymentLink!: string | null;

  @Column({ name: "payment_status", type: "varchar", nullable: true })
  paymentStatus!: string | null;

  @CreateDateColumn({ name: "created_at" })
  createdAt!: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt!: Date;
}
