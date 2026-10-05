import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";

@Entity("doctors")
export class Doctor {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ name: "clinic_id" })
  clinicId!: string;

  @Column()
  name!: string;
}
