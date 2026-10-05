import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";

@Entity("time_offs")
export class TimeOff {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ name: "clinic_id" })
  clinicId: string;

  @Column({ name: "doctor_id" })
  doctorId: string;

  @Column({ name: "starts_at", type: "timestamptz" })
  startsAt: Date;

  @Column({ name: "ends_at", type: "timestamptz" })
  endsAt: Date;

  @Column({ nullable: true })
  reason: string | null;
}
