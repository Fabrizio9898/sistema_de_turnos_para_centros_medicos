import { NotFoundException } from "@nestjs/common";
import { CatalogService } from "./catalog.service";
import { DoctorSpecialty } from "@/entities/doctor-specialty.entity";
import { Specialty } from "@/entities/specialty.entity";
import { Doctor } from "@/entities/doctor.entity";
import { Clinic } from "@/entities/clinic.entity";

describe("CatalogService", () => {
  let service: CatalogService;
  let specialties: { find: jest.Mock };
  let doctors: { find: jest.Mock; findOne: jest.Mock };
  let doctorSpecialties: { find: jest.Mock };
  let services: { find: jest.Mock };

  beforeEach(() => {
    specialties = { find: jest.fn() };
    doctors = { find: jest.fn(), findOne: jest.fn() };
    doctorSpecialties = { find: jest.fn() };
    services = { find: jest.fn() };
    service = new CatalogService(
      specialties as never,
      doctors as never,
      doctorSpecialties as never,
      services as never,
    );
  });

  it("listSpecialties returns specialties for clinic ordered by name", async () => {
    const list = [{ id: "s1", name: "Cardiología" }] as Specialty[];
    specialties.find.mockResolvedValue(list);

    const result = await service.listSpecialties("clinic-1");

    expect(result).toBe(list);
    expect(specialties.find).toHaveBeenCalledWith({
      where: { clinicId: "clinic-1" },
      order: { name: "ASC" },
    });
  });

  it("listDoctorsBySpecialty returns doctors for specialty", async () => {
    doctorSpecialties.find.mockResolvedValue([
      { doctorId: "d1" },
      { doctorId: "d2" },
    ] as DoctorSpecialty[]);
    const list = [{ id: "d1" }, { id: "d2" }] as Doctor[];
    doctors.find.mockResolvedValue(list);

    const result = await service.listDoctorsBySpecialty("clinic-1", "s1");

    expect(result).toBe(list);
    expect(doctors.find).toHaveBeenCalledWith({
      where: {
        id: expect.objectContaining({ _type: "in" }),
        clinicId: "clinic-1",
      },
      order: { name: "ASC" },
    });
  });

  it("listDoctorsBySpecialty returns empty when no links", async () => {
    doctorSpecialties.find.mockResolvedValue([]);

    const result = await service.listDoctorsBySpecialty("clinic-1", "s1");

    expect(result).toEqual([]);
    expect(doctors.find).not.toHaveBeenCalled();
  });

  describe("listDoctorServices", () => {
    const clinic = {
      id: "clinic-1",
      patientRequiredFields: ["name", "phone"],
    } as unknown as Clinic;

    it("throws NotFoundException when doctor is not in the clinic", async () => {
      doctors.findOne.mockResolvedValue(null);

      await expect(service.listDoctorServices(clinic, "d1")).rejects.toThrow(
        NotFoundException,
      );
      expect(doctors.findOne).toHaveBeenCalledWith({
        where: { id: "d1", clinicId: "clinic-1" },
      });
    });

    it("returns services and the combined required patient fields", async () => {
      doctors.findOne.mockResolvedValue({
        id: "d1",
        name: "Dra. Gómez",
        patientRequiredFields: ["dni"],
      });
      services.find.mockResolvedValue([
        { id: "s1", name: "Consulta", durationMin: 30, doctorId: "d1" },
      ]);

      const result = await service.listDoctorServices(clinic, "d1");

      expect(result).toEqual({
        doctorId: "d1",
        doctorName: "Dra. Gómez",
        patientRequiredFields: ["name", "phone", "dni"],
        services: [{ id: "s1", name: "Consulta", durationMin: 30 }],
      });
    });
  });
});
