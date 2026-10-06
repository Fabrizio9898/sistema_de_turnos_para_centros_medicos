import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from "typeorm";

@Entity("clinics")
export class Clinic {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column()
  name!: string;

  @Column({ name: "api_key_hash" })
  apiKeyHash!: string;

  @Column({ default: "America/Argentina/Buenos_Aires" })
  timezone!: string;

  @Column({ name: "webhook_url", type: "varchar", nullable: true })
  webhookUrl!: string | null;

  /** Patient fields required to book (see src/patients/patient-fields.ts). */
  @Column("text", {
    name: "patient_required_fields",
    array: true,
    default: "{name,phone}",
  })
  patientRequiredFields!: string[];

  @CreateDateColumn({ name: "created_at" })
  createdAt!: Date;
}
