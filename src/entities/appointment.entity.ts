import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from "typeorm";

@Entity("appointments")
export class Appointment {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ name: "clinic_id" })
  clinicId: string;

  @Column({ name: "doctor_id" })
  doctorId: string;

  @Column({ name: "patient_id" })
  patientId: string;

  @Column({ name: "service_id" })
  serviceId: string;

  @Column({ name: "starts_at", type: "timestamptz" })
  startsAt: Date;

  @Column({ name: "ends_at", type: "timestamptz" })
  endsAt: Date;

  @Column({ default: "confirmed" })
  status: string;

  @Column()
  source: string;

  @Column({ name: "payment_link", nullable: true })
  paymentLink: string | null;

  @Column({ name: "payment_status", nullable: true })
  paymentStatus: string | null;

  @CreateDateColumn({ name: "created_at" })
  createdAt: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt: Date;
}
