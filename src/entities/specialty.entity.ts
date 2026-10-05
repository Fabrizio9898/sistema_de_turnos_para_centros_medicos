import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";

@Entity("specialties")
export class Specialty {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ name: "clinic_id" })
  clinicId: string;

  @Column()
  name: string;
}
