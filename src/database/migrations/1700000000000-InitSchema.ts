import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitSchema1700000000000 implements MigrationInterface {
  name = 'InitSchema1700000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');
    await queryRunner.query('CREATE EXTENSION IF NOT EXISTS btree_gist');

    await queryRunner.query(`
      CREATE TABLE clinics (
        id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        name varchar(255) NOT NULL,
        api_key_hash varchar(255) NOT NULL,
        timezone varchar(100) NOT NULL DEFAULT 'America/Argentina/Buenos_Aires',
        webhook_url varchar(500),
        created_at timestamptz NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`
      CREATE TABLE specialties (
        id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        clinic_id uuid NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
        name varchar(255) NOT NULL
      )
    `);

    await queryRunner.query(`
      CREATE TABLE doctors (
        id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        clinic_id uuid NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
        name varchar(255) NOT NULL
      )
    `);

    await queryRunner.query(`
      CREATE TABLE doctor_specialties (
        id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        doctor_id uuid NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
        specialty_id uuid NOT NULL REFERENCES specialties(id) ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE TABLE services (
        id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        clinic_id uuid NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
        doctor_id uuid NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
        name varchar(255) NOT NULL,
        duration_min int NOT NULL
      )
    `);

    await queryRunner.query(`
      CREATE TABLE availability_rules (
        id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        clinic_id uuid NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
        doctor_id uuid NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
        day_of_week int NOT NULL,
        start_time time NOT NULL,
        end_time time NOT NULL
      )
    `);

    await queryRunner.query(`
      CREATE TABLE time_offs (
        id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        clinic_id uuid NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
        doctor_id uuid NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
        starts_at timestamptz NOT NULL,
        ends_at timestamptz NOT NULL,
        reason text
      )
    `);

    await queryRunner.query(`
      CREATE TABLE patients (
        id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        clinic_id uuid NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
        name varchar(255) NOT NULL,
        phone varchar(50) NOT NULL,
        telegram_chat_id varchar(100),
        whatsapp_id varchar(100),
        UNIQUE (clinic_id, phone)
      )
    `);

    await queryRunner.query(`
      CREATE TABLE appointments (
        id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        clinic_id uuid NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
        doctor_id uuid NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
        patient_id uuid NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
        service_id uuid NOT NULL REFERENCES services(id) ON DELETE CASCADE,
        starts_at timestamptz NOT NULL,
        ends_at timestamptz NOT NULL,
        status varchar(50) NOT NULL DEFAULT 'confirmed',
        source varchar(50) NOT NULL,
        payment_link varchar(500),
        payment_status varchar(50),
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      )
    `);

    await queryRunner.query(`
      ALTER TABLE appointments ADD CONSTRAINT no_double_booking
      EXCLUDE USING gist (
        doctor_id WITH =,
        tstzrange(starts_at, ends_at) WITH &&
      ) WHERE (status <> 'cancelled')
    `);

    await queryRunner.query(
      'CREATE INDEX idx_appointments_doctor ON appointments(doctor_id)',
    );
    await queryRunner.query(
      'CREATE INDEX idx_appointments_patient ON appointments(patient_id)',
    );
    await queryRunner.query(
      'CREATE INDEX idx_appointments_clinic ON appointments(clinic_id)',
    );
    await queryRunner.query(
      'CREATE INDEX idx_availability_rules_doctor ON availability_rules(doctor_id)',
    );
    await queryRunner.query(
      'CREATE INDEX idx_time_offs_doctor ON time_offs(doctor_id)',
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE IF EXISTS appointments');
    await queryRunner.query('DROP TABLE IF EXISTS patients');
    await queryRunner.query('DROP TABLE IF EXISTS time_offs');
    await queryRunner.query('DROP TABLE IF EXISTS availability_rules');
    await queryRunner.query('DROP TABLE IF EXISTS services');
    await queryRunner.query('DROP TABLE IF EXISTS doctor_specialties');
    await queryRunner.query('DROP TABLE IF EXISTS doctors');
    await queryRunner.query('DROP TABLE IF EXISTS specialties');
    await queryRunner.query('DROP TABLE IF EXISTS clinics');
  }
}
