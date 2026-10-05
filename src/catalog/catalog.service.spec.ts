import { CatalogService } from "./catalog.service";
import { Specialty } from "../entities/specialty.entity";
import { Doctor } from "../entities/doctor.entity";
import { DoctorSpecialty } from "../entities/doctor-specialty.entity";

describe("CatalogService", () => {
  let service: CatalogService;
  let specialties: { find: jest.Mock };
  let doctors: { find: jest.Mock };
  let doctorSpecialties: { find: jest.Mock };

  beforeEach(() => {
    specialties = { find: jest.fn() };
    doctors = { find: jest.fn() };
    doctorSpecialties = { find: jest.fn() };
    service = new CatalogService(
      specialties as never,
      doctors as never,
      doctorSpecialties as never,
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
    });
  });

  it("listDoctorsBySpecialty returns empty when no links", async () => {
    doctorSpecialties.find.mockResolvedValue([]);

    const result = await service.listDoctorsBySpecialty("clinic-1", "s1");

    expect(result).toEqual([]);
    expect(doctors.find).not.toHaveBeenCalled();
  });
});
