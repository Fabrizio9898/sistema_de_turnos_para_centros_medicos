import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";

@Entity("doctors")
export class Doctor {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ name: "clinic_id" })
  clinicId!: string;

  @Column()
  name!: string;

  /** Patient fields required to book with this doctor, on top of the clinic's (see src/patients/patient-fields.ts). */
  @Column("text", {
    name: "patient_required_fields",
    array: true,
    default: "{}",
  })
  patientRequiredFields!: string[];
}
