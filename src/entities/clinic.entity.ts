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

  @CreateDateColumn({ name: "created_at" })
  createdAt!: Date;
}
