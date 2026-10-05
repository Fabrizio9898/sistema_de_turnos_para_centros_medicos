import { AppDataSource } from "../../data-source";

describe("no_double_booking constraint", () => {
  let clinicId: string;
  let doctorId: string;
  let patientId: string;
  let serviceId: string;

  beforeAll(async () => {
    if (!process.env.DATABASE_URL) {
      console.warn("DATABASE_URL not set, skipping e2e constraint test");
      return;
    }
    await AppDataSource.initialize();

    await AppDataSource.query("DELETE FROM appointments");
    await AppDataSource.query("DELETE FROM patients");
    await AppDataSource.query("DELETE FROM services");
    await AppDataSource.query("DELETE FROM doctors");
    await AppDataSource.query("DELETE FROM clinics");

    const clinic = await AppDataSource.query(
      "INSERT INTO clinics (name, api_key_hash) VALUES ($1, $2) RETURNING id",
      ["Test Clinic", "hash"],
    );
    clinicId = clinic[0].id;

    const doctor = await AppDataSource.query(
      "INSERT INTO doctors (clinic_id, name) VALUES ($1, $2) RETURNING id",
      [clinicId, "Dr. Test"],
    );
    doctorId = doctor[0].id;

    const patient = await AppDataSource.query(
      "INSERT INTO patients (clinic_id, name, phone) VALUES ($1, $2, $3) RETURNING id",
      [clinicId, "Patient Test", "+5491100000000"],
    );
    patientId = patient[0].id;

    const service = await AppDataSource.query(
      "INSERT INTO services (clinic_id, doctor_id, name, duration_min) VALUES ($1, $2, $3, $4) RETURNING id",
      [clinicId, doctorId, "Consulta", 30],
    );
    serviceId = service[0].id;
  });

  afterAll(async () => {
    if (AppDataSource.isInitialized) {
      await AppDataSource.destroy();
    }
  });

  it("rejects overlapping appointment for same doctor", async () => {
    if (!process.env.DATABASE_URL) return;

    await AppDataSource.query(
      `INSERT INTO appointments (clinic_id, doctor_id, patient_id, service_id, starts_at, ends_at, source)
       VALUES ($1, $2, $3, $4, $5, $6, 'bot')`,
      [
        clinicId,
        doctorId,
        patientId,
        serviceId,
        "2026-01-15T10:00:00Z",
        "2026-01-15T10:30:00Z",
      ],
    );

    await expect(
      AppDataSource.query(
        `INSERT INTO appointments (clinic_id, doctor_id, patient_id, service_id, starts_at, ends_at, source)
         VALUES ($1, $2, $3, $4, $5, $6, 'bot')`,
        [
          clinicId,
          doctorId,
          patientId,
          serviceId,
          "2026-01-15T10:15:00Z",
          "2026-01-15T10:45:00Z",
        ],
      ),
    ).rejects.toMatchObject({ code: "23P01" });
  });

  it("allows non-overlapping appointment for same doctor", async () => {
    if (!process.env.DATABASE_URL) return;

    await expect(
      AppDataSource.query(
        `INSERT INTO appointments (clinic_id, doctor_id, patient_id, service_id, starts_at, ends_at, source)
         VALUES ($1, $2, $3, $4, $5, $6, 'bot')`,
        [
          clinicId,
          doctorId,
          patientId,
          serviceId,
          "2026-01-15T11:00:00Z",
          "2026-01-15T11:30:00Z",
        ],
      ),
    ).resolves.toBeDefined();
  });

  it("allows overlapping appointment for different doctor", async () => {
    if (!process.env.DATABASE_URL) return;

    const otherDoctor = await AppDataSource.query(
      "INSERT INTO doctors (clinic_id, name) VALUES ($1, $2) RETURNING id",
      [clinicId, "Dr. Other"],
    );

    await expect(
      AppDataSource.query(
        `INSERT INTO appointments (clinic_id, doctor_id, patient_id, service_id, starts_at, ends_at, source)
         VALUES ($1, $2, $3, $4, $5, $6, 'bot')`,
        [
          clinicId,
          otherDoctor[0].id,
          patientId,
          serviceId,
          "2026-01-15T10:15:00Z",
          "2026-01-15T10:45:00Z",
        ],
      ),
    ).resolves.toBeDefined();
  });
});
