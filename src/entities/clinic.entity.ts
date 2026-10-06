import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
} from "typeorm";
import { Doctor } from "./doctor.entity";
import { Patient } from "./patient.entity";
import { Service } from "./service.entity";
import { Specialty } from "./specialty.entity";
import { AvailabilityRule } from "./availability-rule.entity";
import { TimeOff } from "./time-off.entity";
import { Appointment } from "./appointment.entity";
import { User } from "./user.entity";

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

  @Column("text", {
    name: "patient_required_fields",
    array: true,
    default: "{name,phone}",
  })
  patientRequiredFields!: string[];

  @CreateDateColumn({ name: "created_at" })
  createdAt!: Date;

  @OneToMany(() => Doctor, (doctor) => doctor.clinic)
  doctors!: Doctor[];

  @OneToMany(() => Patient, (patient) => patient.clinic)
  patients!: Patient[];

  @OneToMany(() => Service, (service) => service.clinic)
  services!: Service[];

  @OneToMany(() => Specialty, (specialty) => specialty.clinic)
  specialties!: Specialty[];

  @OneToMany(() => AvailabilityRule, (rule) => rule.clinic)
  availabilityRules!: AvailabilityRule[];

  @OneToMany(() => TimeOff, (timeOff) => timeOff.clinic)
  timeOffs!: TimeOff[];

  @OneToMany(() => Appointment, (appointment) => appointment.clinic)
  appointments!: Appointment[];

  @OneToMany(() => User, (user) => user.clinic)
  users!: User[];
}
