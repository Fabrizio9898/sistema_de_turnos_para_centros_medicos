import { UserRole } from "@/enums/roles.enum";
import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from "typeorm";
import { Clinic } from "./clinic.entity";
import { Doctor } from "./doctor.entity";

@Entity("users")
export class User {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ name: "clerk_user_id", unique: true })
  clerkUserId!: string;

  @Column()
  email!: string;

  @Column({ type: "varchar", nullable: true })
  name!: string | null;

  @Column({ type: "enum", enum: UserRole, nullable: true })
  role!: UserRole | null;

  @Column({ name: "clinic_id", nullable: true })
  clinicId!: string | null;

  @ManyToOne(() => Clinic, (clinic) => clinic.users, { onDelete: "SET NULL" })
  @JoinColumn({ name: "clinic_id" })
  clinic!: Clinic | null;

  @Column({ name: "doctor_id", nullable: true })
  doctorId!: string | null;

  @ManyToOne(() => Doctor, (doctor) => doctor.users, { onDelete: "SET NULL" })
  @JoinColumn({ name: "doctor_id" })
  doctor!: Doctor | null;

  @CreateDateColumn({ name: "created_at" })
  createdAt!: Date;
}
