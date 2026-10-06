import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Makes cross-clinic references impossible at the DB level.
 *
 * The single-column FKs only check that the referenced row exists, not that it
 * belongs to the same clinic. Composite FKs that include clinic_id (and doctor_id
 * for appointment -> service) close that gap. They are added alongside the
 * existing FKs; nothing is dropped.
 *
 * Existing rows must already be consistent or this migration fails.
 */
export class EnforceSameClinicReferences1791244800000 implements MigrationInterface {
  name = "EnforceSameClinicReferences1791244800000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Targets for the composite FKs (id is already unique, so these always hold).
    await queryRunner.query(
      "ALTER TABLE doctors ADD CONSTRAINT uq_doctors_id_clinic UNIQUE (id, clinic_id)",
    );
    await queryRunner.query(
      "ALTER TABLE patients ADD CONSTRAINT uq_patients_id_clinic UNIQUE (id, clinic_id)",
    );
    await queryRunner.query(
      "ALTER TABLE specialties ADD CONSTRAINT uq_specialties_id_clinic UNIQUE (id, clinic_id)",
    );
    await queryRunner.query(
      "ALTER TABLE services ADD CONSTRAINT uq_services_id_doctor_clinic UNIQUE (id, doctor_id, clinic_id)",
    );

    // Doctor-owned rows: the doctor must belong to the row's clinic.
    for (const table of ["services", "availability_rules", "time_offs"]) {
      await queryRunner.query(
        `ALTER TABLE ${table} ADD CONSTRAINT fk_${table}_doctor_same_clinic
         FOREIGN KEY (doctor_id, clinic_id) REFERENCES doctors(id, clinic_id) ON DELETE CASCADE`,
      );
    }

    // Appointments: doctor, patient and service from the same clinic, and the
    // service must be one of that doctor's services.
    await queryRunner.query(
      `ALTER TABLE appointments ADD CONSTRAINT fk_appointments_doctor_same_clinic
       FOREIGN KEY (doctor_id, clinic_id) REFERENCES doctors(id, clinic_id) ON DELETE CASCADE`,
    );
    await queryRunner.query(
      `ALTER TABLE appointments ADD CONSTRAINT fk_appointments_patient_same_clinic
       FOREIGN KEY (patient_id, clinic_id) REFERENCES patients(id, clinic_id) ON DELETE CASCADE`,
    );
    await queryRunner.query(
      `ALTER TABLE appointments ADD CONSTRAINT fk_appointments_service_same_doctor_clinic
       FOREIGN KEY (service_id, doctor_id, clinic_id) REFERENCES services(id, doctor_id, clinic_id) ON DELETE CASCADE`,
    );

    // doctor_specialties had no clinic_id; derive it from the doctor.
    await queryRunner.query(
      "ALTER TABLE doctor_specialties ADD COLUMN clinic_id uuid",
    );
    await queryRunner.query(
      `UPDATE doctor_specialties ds SET clinic_id = d.clinic_id
       FROM doctors d WHERE d.id = ds.doctor_id`,
    );
    await queryRunner.query(
      "ALTER TABLE doctor_specialties ALTER COLUMN clinic_id SET NOT NULL",
    );
    await queryRunner.query(
      `ALTER TABLE doctor_specialties ADD CONSTRAINT fk_doctor_specialties_doctor_same_clinic
       FOREIGN KEY (doctor_id, clinic_id) REFERENCES doctors(id, clinic_id) ON DELETE CASCADE`,
    );
    await queryRunner.query(
      `ALTER TABLE doctor_specialties ADD CONSTRAINT fk_doctor_specialties_specialty_same_clinic
       FOREIGN KEY (specialty_id, clinic_id) REFERENCES specialties(id, clinic_id) ON DELETE CASCADE`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      "ALTER TABLE doctor_specialties DROP CONSTRAINT fk_doctor_specialties_specialty_same_clinic",
    );
    await queryRunner.query(
      "ALTER TABLE doctor_specialties DROP CONSTRAINT fk_doctor_specialties_doctor_same_clinic",
    );
    await queryRunner.query(
      "ALTER TABLE doctor_specialties DROP COLUMN clinic_id",
    );

    await queryRunner.query(
      "ALTER TABLE appointments DROP CONSTRAINT fk_appointments_service_same_doctor_clinic",
    );
    await queryRunner.query(
      "ALTER TABLE appointments DROP CONSTRAINT fk_appointments_patient_same_clinic",
    );
    await queryRunner.query(
      "ALTER TABLE appointments DROP CONSTRAINT fk_appointments_doctor_same_clinic",
    );
    for (const table of ["services", "availability_rules", "time_offs"]) {
      await queryRunner.query(
        `ALTER TABLE ${table} DROP CONSTRAINT fk_${table}_doctor_same_clinic`,
      );
    }

    await queryRunner.query(
      "ALTER TABLE services DROP CONSTRAINT uq_services_id_doctor_clinic",
    );
    await queryRunner.query(
      "ALTER TABLE specialties DROP CONSTRAINT uq_specialties_id_clinic",
    );
    await queryRunner.query(
      "ALTER TABLE patients DROP CONSTRAINT uq_patients_id_clinic",
    );
    await queryRunner.query(
      "ALTER TABLE doctors DROP CONSTRAINT uq_doctors_id_clinic",
    );
  }
}
