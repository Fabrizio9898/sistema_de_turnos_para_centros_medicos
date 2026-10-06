import { MigrationInterface, QueryRunner } from "typeorm";

export class InitSchema1791331200000 implements MigrationInterface {
  name = "InitSchema1791331200000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');
    await queryRunner.query("CREATE EXTENSION IF NOT EXISTS btree_gist");

    await queryRunner.query(`
      CREATE TYPE user_role_enum AS ENUM ('admin', 'clinic_admin', 'doctor')
    `);

    await queryRunner.query(`
      CREATE TABLE clinics (
        id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        name varchar(255) NOT NULL,
        api_key_hash varchar(255) NOT NULL,
        timezone varchar(100) NOT NULL DEFAULT 'America/Argentina/Buenos_Aires',
        webhook_url varchar(500),
        patient_required_fields text[] NOT NULL DEFAULT '{name,phone}',
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
        name varchar(255) NOT NULL,
        patient_required_fields text[] NOT NULL DEFAULT '{}'
      )
    `);

    await queryRunner.query(`
      CREATE TABLE doctor_specialties (
        id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        clinic_id uuid NOT NULL,
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
        dni varchar(20),
        telegram_chat_id varchar(100),
        whatsapp_id varchar(100),
        UNIQUE (clinic_id, phone),
        UNIQUE (clinic_id, dni)
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
      CREATE TABLE users (
        id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        clerk_user_id varchar(255) NOT NULL UNIQUE,
        email varchar(255) NOT NULL,
        name varchar(255),
        role user_role_enum,
        clinic_id uuid REFERENCES clinics(id) ON DELETE SET NULL,
        doctor_id uuid REFERENCES doctors(id) ON DELETE SET NULL,
        created_at timestamptz NOT NULL DEFAULT now()
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
      "CREATE INDEX idx_appointments_doctor ON appointments(doctor_id)",
    );
    await queryRunner.query(
      "CREATE INDEX idx_appointments_patient ON appointments(patient_id)",
    );
    await queryRunner.query(
      "CREATE INDEX idx_appointments_clinic ON appointments(clinic_id)",
    );
    await queryRunner.query(
      "CREATE INDEX idx_availability_rules_doctor ON availability_rules(doctor_id)",
    );
    await queryRunner.query(
      "CREATE INDEX idx_time_offs_doctor ON time_offs(doctor_id)",
    );
    await queryRunner.query(
      "CREATE INDEX idx_appointments_doctor_starts ON appointments(doctor_id, starts_at)",
    );
    await queryRunner.query(
      "CREATE INDEX idx_appointments_patient_starts ON appointments(patient_id, starts_at)",
    );

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

    for (const table of ["services", "availability_rules", "time_offs"]) {
      await queryRunner.query(
        `ALTER TABLE ${table} ADD CONSTRAINT fk_${table}_doctor_same_clinic
         FOREIGN KEY (doctor_id, clinic_id) REFERENCES doctors(id, clinic_id) ON DELETE CASCADE`,
      );
    }

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
    await queryRunner.query("DROP TABLE IF EXISTS users");
    await queryRunner.query("DROP TABLE IF EXISTS appointments");
    await queryRunner.query("DROP TABLE IF EXISTS patients");
    await queryRunner.query("DROP TABLE IF EXISTS time_offs");
    await queryRunner.query("DROP TABLE IF EXISTS availability_rules");
    await queryRunner.query("DROP TABLE IF EXISTS services");
    await queryRunner.query("DROP TABLE IF EXISTS doctor_specialties");
    await queryRunner.query("DROP TABLE IF EXISTS doctors");
    await queryRunner.query("DROP TABLE IF EXISTS specialties");
    await queryRunner.query("DROP TABLE IF EXISTS clinics");
    await queryRunner.query("DROP TYPE IF EXISTS user_role_enum");
  }
}
