import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from "@nestjs/common";
import { PatientService } from "./patient.service";
import { Patient } from "../entities/patient.entity";
import { Appointment } from "../entities/appointment.entity";

describe("PatientService", () => {
  let service: PatientService;
  let patients: { findOne: jest.Mock; save: jest.Mock };
  let appointments: { find: jest.Mock };
  let doctors: { find: jest.Mock };
  let services: { find: jest.Mock };

  beforeEach(() => {
    patients = {
      findOne: jest.fn(),
      save: jest.fn((p: Partial<Patient>) =>
        Promise.resolve({ id: "p2", ...p }),
      ),
    };
    appointments = { find: jest.fn() };
    doctors = { find: jest.fn() };
    services = { find: jest.fn() };
    service = new PatientService(
      patients as never,
      appointments as never,
      doctors as never,
      services as never,
    );
  });

  describe("find", () => {
    it("refuses to search without phone or dni", () => {
      expect(() => service.find("c1", {})).toThrow(BadRequestException);
      expect(() => service.find("c1", { phone: "" })).toThrow(
        BadRequestException,
      );
      expect(patients.findOne).not.toHaveBeenCalled();
    });

    it("searches by phone within the clinic", async () => {
      await service.find("c1", { phone: "+5491100000000" });

      expect(patients.findOne).toHaveBeenCalledWith({
        where: { clinicId: "c1", phone: "+5491100000000" },
      });
    });

    it("searches by dni within the clinic", async () => {
      await service.find("c1", { dni: "12345678" });

      expect(patients.findOne).toHaveBeenCalledWith({
        where: { clinicId: "c1", dni: "12345678" },
      });
    });
  });

  describe("findOrCreate", () => {
    it("returns existing patient when found", async () => {
      const existing = { id: "p1", phone: "+5491100000000" } as Patient;
      patients.findOne.mockResolvedValue(existing);

      const result = await service.findOrCreate("c1", {
        name: "John",
        phone: "+5491100000000",
      });

      expect(result).toEqual({ patient: existing, created: false });
      expect(patients.save).not.toHaveBeenCalled();
    });

    it("creates new patient with optional dni", async () => {
      patients.findOne.mockResolvedValue(null);

      const result = await service.findOrCreate("c1", {
        name: "Jane",
        phone: "+5491100000001",
        dni: "12345678",
      });

      expect(result.created).toBe(true);
      expect(patients.save).toHaveBeenCalledWith({
        clinicId: "c1",
        name: "Jane",
        phone: "+5491100000001",
        dni: "12345678",
      });
    });

    it("maps a duplicate phone or dni to ConflictException", async () => {
      patients.findOne.mockResolvedValue(null);
      patients.save.mockRejectedValue({ code: "23505" });

      await expect(
        service.findOrCreate("c1", { name: "Jane", phone: "1", dni: "123456" }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe("update", () => {
    it("throws NotFoundException for a patient of another clinic", async () => {
      patients.findOne.mockResolvedValue(null);

      await expect(
        service.update("c1", "p1", { dni: "123456" }),
      ).rejects.toThrow(NotFoundException);
      expect(patients.findOne).toHaveBeenCalledWith({
        where: { id: "p1", clinicId: "c1" },
      });
    });

    it("only changes the provided fields", async () => {
      patients.findOne.mockResolvedValue({
        id: "p1",
        clinicId: "c1",
        name: "Juan",
        phone: "+54911",
        dni: null,
      } as Patient);

      await service.update("c1", "p1", { dni: "12345678", name: undefined });

      expect(patients.save).toHaveBeenCalledWith({
        id: "p1",
        clinicId: "c1",
        name: "Juan",
        phone: "+54911",
        dni: "12345678",
      });
    });
  });

  describe("upcomingAppointments", () => {
    it("returns upcoming appointments with doctor and service names", async () => {
      patients.findOne.mockResolvedValue({ id: "p1" } as Patient);
      appointments.find.mockResolvedValue([
        {
          id: "a1",
          doctorId: "d1",
          serviceId: "s1",
          startsAt: new Date("2026-10-13T13:00:00Z"),
          endsAt: new Date("2026-10-13T13:30:00Z"),
          status: "confirmed",
        } as Appointment,
      ]);
      doctors.find.mockResolvedValue([{ id: "d1", name: "Dra. Gómez" }]);
      services.find.mockResolvedValue([{ id: "s1", name: "Consulta" }]);

      const result = await service.upcomingAppointments("c1", "p1");

      expect(result).toEqual([
        expect.objectContaining({
          id: "a1",
          doctorName: "Dra. Gómez",
          serviceName: "Consulta",
        }),
      ]);
      expect(appointments.find).toHaveBeenCalledWith(
        expect.objectContaining({ order: { startsAt: "ASC" } }),
      );
    });

    it("throws NotFoundException when patient is not in the clinic", async () => {
      patients.findOne.mockResolvedValue(null);

      await expect(service.upcomingAppointments("c1", "p1")).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
