import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  Unique,
} from "typeorm";
import { Clinic } from "./clinic.entity";
import { Appointment } from "./appointment.entity";

@Entity("patients")
@Unique(["clinicId", "phone"])
@Unique(["clinicId", "dni"])
export class Patient {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ name: "clinic_id" })
  clinicId!: string;

  @ManyToOne(() => Clinic, (clinic) => clinic.patients, { onDelete: "CASCADE" })
  @JoinColumn({ name: "clinic_id" })
  clinic!: Clinic;

  @Column()
  name!: string;

  @Column()
  phone!: string;

  @Column({ type: "varchar", nullable: true })
  dni!: string | null;

  @Column({ name: "telegram_chat_id", type: "varchar", nullable: true })
  telegramChatId!: string | null;

  @Column({ name: "whatsapp_id", type: "varchar", nullable: true })
  whatsappId!: string | null;

  @OneToMany(() => Appointment, (appointment) => appointment.patient)
  appointments!: Appointment[];
}
