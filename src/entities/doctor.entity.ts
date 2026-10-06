import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from "typeorm";
import { Clinic } from "./clinic.entity";
import { Service } from "./service.entity";
import { AvailabilityRule } from "./availability-rule.entity";
import { TimeOff } from "./time-off.entity";
import { Appointment } from "./appointment.entity";
import { DoctorSpecialty } from "./doctor-specialty.entity";
import { User } from "./user.entity";

@Entity("doctors")
export class Doctor {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ name: "clinic_id" })
  clinicId!: string;

  @ManyToOne(() => Clinic, (clinic) => clinic.doctors, { onDelete: "CASCADE" })
  @JoinColumn({ name: "clinic_id" })
  clinic!: Clinic;

  @Column()
  name!: string;

  @Column("text", {
    name: "patient_required_fields",
    array: true,
    default: "{}",
  })
  patientRequiredFields!: string[];

  @OneToMany(() => Service, (service) => service.doctor)
  services!: Service[];

  @OneToMany(() => AvailabilityRule, (rule) => rule.doctor)
  availabilityRules!: AvailabilityRule[];

  @OneToMany(() => TimeOff, (timeOff) => timeOff.doctor)
  timeOffs!: TimeOff[];

  @OneToMany(() => Appointment, (appointment) => appointment.doctor)
  appointments!: Appointment[];

  @OneToMany(() => DoctorSpecialty, (ds) => ds.doctor)
  doctorSpecialties!: DoctorSpecialty[];

  @OneToMany(() => User, (user) => user.doctor)
  users!: User[];
}
