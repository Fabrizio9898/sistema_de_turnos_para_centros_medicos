import { MigrationInterface, QueryRunner } from "typeorm";

export class PatientDniAndRequiredFields1791158400000 implements MigrationInterface {
  name = "PatientDniAndRequiredFields1791158400000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query("ALTER TABLE patients ADD COLUMN dni varchar(20)");
    // Postgres treats NULLs as distinct, so many patients can have no DNI.
    await queryRunner.query(
      "ALTER TABLE patients ADD CONSTRAINT uq_patients_clinic_dni UNIQUE (clinic_id, dni)",
    );

    await queryRunner.query(
      "ALTER TABLE clinics ADD COLUMN patient_required_fields text[] NOT NULL DEFAULT '{name,phone}'",
    );
    await queryRunner.query(
      "ALTER TABLE doctors ADD COLUMN patient_required_fields text[] NOT NULL DEFAULT '{}'",
    );

    await queryRunner.query(
      "CREATE INDEX idx_appointments_doctor_starts ON appointments(doctor_id, starts_at)",
    );
    await queryRunner.query(
      "CREATE INDEX idx_appointments_patient_starts ON appointments(patient_id, starts_at)",
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      "DROP INDEX IF EXISTS idx_appointments_patient_starts",
    );
    await queryRunner.query(
      "DROP INDEX IF EXISTS idx_appointments_doctor_starts",
    );
    await queryRunner.query(
      "ALTER TABLE doctors DROP COLUMN patient_required_fields",
    );
    await queryRunner.query(
      "ALTER TABLE clinics DROP COLUMN patient_required_fields",
    );
    await queryRunner.query(
      "ALTER TABLE patients DROP CONSTRAINT uq_patients_clinic_dni",
    );
    await queryRunner.query("ALTER TABLE patients DROP COLUMN dni");
  }
}
