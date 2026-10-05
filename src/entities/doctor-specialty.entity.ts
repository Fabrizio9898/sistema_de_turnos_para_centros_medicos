import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";

@Entity("doctor_specialties")
export class DoctorSpecialty {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ name: "doctor_id" })
  doctorId!: string;

  @Column({ name: "specialty_id" })
  specialtyId!: string;
}
