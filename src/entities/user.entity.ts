import { UserRole } from "@/enums/roles.enum";
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from "typeorm";

@Entity("users")
export class User {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ name: "clerk_user_id", unique: true })
  clerkUserId!: string;

  @Column()
  email!: string;

  @Column({
    type: "enum",
    enum: UserRole,
  })
  role!: UserRole;

  @Column({ name: "clinic_id", nullable: true })
  clinicId!: string | null;

  @Column({ name: "doctor_id", nullable: true })
  doctorId!: string | null;

  @CreateDateColumn({ name: "created_at" })
  createdAt!: Date;
}
