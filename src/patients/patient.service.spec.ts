import { PatientService } from "./patient.service";
import { Patient } from "../entities/patient.entity";

describe("PatientService", () => {
  let service: PatientService;
  let patients: { findOne: jest.Mock; save: jest.Mock };

  beforeEach(() => {
    patients = { findOne: jest.fn(), save: jest.fn() };
    service = new PatientService(patients as never);
  });

  it("findByPhone returns patient or null", async () => {
    const patient = { id: "p1", phone: "+5491100000000" } as Patient;
    patients.findOne.mockResolvedValue(patient);

    const result = await service.findByPhone("c1", "+5491100000000");

    expect(result).toBe(patient);
    expect(patients.findOne).toHaveBeenCalledWith({
      where: { clinicId: "c1", phone: "+5491100000000" },
    });
  });

  it("findOrCreate returns existing patient when found", async () => {
    const existing = { id: "p1", phone: "+5491100000000" } as Patient;
    patients.findOne.mockResolvedValue(existing);

    const result = await service.findOrCreate("c1", {
      name: "John",
      phone: "+5491100000000",
    });

    expect(result).toEqual({ patient: existing, created: false });
    expect(patients.save).not.toHaveBeenCalled();
  });

  it("findOrCreate creates new patient when not found", async () => {
    patients.findOne.mockResolvedValue(null);
    patients.save.mockImplementation((p) =>
      Promise.resolve({ id: "p2", ...p }),
    );

    const result = await service.findOrCreate("c1", {
      name: "Jane",
      phone: "+5491100000001",
    });

    expect(result.created).toBe(true);
    expect(result.patient.id).toBe("p2");
    expect(patients.save).toHaveBeenCalledWith({
      clinicId: "c1",
      name: "Jane",
      phone: "+5491100000001",
    });
  });
});
