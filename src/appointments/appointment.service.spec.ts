import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from "@nestjs/common";
import { AppointmentService } from "./appointment.service";
import { Clinic } from "../entities/clinic.entity";
import { Appointment } from "../entities/appointment.entity";
import { Doctor } from "../entities/doctor.entity";
import { Patient } from "../entities/patient.entity";
import { Service } from "../entities/service.entity";
import { WebhookService } from "../webhook/webhook.service";

describe("AppointmentService", () => {
  let service: AppointmentService;
  let appointments: { findOne: jest.Mock; save: jest.Mock };
  let doctors: { findOne: jest.Mock };
  let patients: { findOne: jest.Mock };
  let services: { findOne: jest.Mock };
  let webhook: { notifyAppointmentCreated: jest.Mock; notifyAppointmentCancelled: jest.Mock };

  const clinic = { id: "c1", webhookUrl: null } as Clinic;

  beforeEach(() => {
    appointments = { findOne: jest.fn(), save: jest.fn() };
    doctors = { findOne: jest.fn() };
    patients = { findOne: jest.fn() };
    services = { findOne: jest.fn() };
    webhook = { notifyAppointmentCreated: jest.fn(), notifyAppointmentCancelled: jest.fn() };
    service = new AppointmentService(
      appointments as never,
      doctors as never,
      patients as never,
      services as never,
      webhook as never,
    );
  });

  describe("create", () => {
    it("throws NotFoundException when doctor not found", async () => {
      doctors.findOne.mockResolvedValue(null);

      await expect(
        service.create(clinic, {
          doctorId: "d1",
          patientId: "p1",
          serviceId: "s1",
          startsAt: "2026-01-15T10:00:00Z",
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it("throws BadRequestException when startsAt is in the past", async () => {
      doctors.findOne.mockResolvedValue({ id: "d1" } as Doctor);
      patients.findOne.mockResolvedValue({ id: "p1" } as Patient);
      services.findOne.mockResolvedValue({ durationMin: 30 } as Service);

      await expect(
        service.create(clinic, {
          doctorId: "d1",
          patientId: "p1",
          serviceId: "s1",
          startsAt: "2020-01-15T10:00:00Z",
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it("creates appointment with calculated endsAt and sends webhook", async () => {
      doctors.findOne.mockResolvedValue({ id: "d1" } as Doctor);
      patients.findOne.mockResolvedValue({ id: "p1" } as Patient);
      services.findOne.mockResolvedValue({ durationMin: 30 } as Service);
      appointments.save.mockImplementation((a: Appointment) => Promise.resolve(a));

      const result = await service.create(clinic, {
        doctorId: "d1",
        patientId: "p1",
        serviceId: "s1",
        startsAt: "2026-01-15T10:00:00Z",
      });

      expect(result.startsAt).toEqual(new Date("2026-01-15T10:00:00Z"));
      expect(result.endsAt).toEqual(new Date("2026-01-15T10:30:00Z"));
      expect(result.status).toBe("confirmed");
      expect(result.source).toBe("bot");
      expect(webhook.notifyAppointmentCreated).toHaveBeenCalledWith(clinic, result);
    });

    it("throws ConflictException on exclusion constraint violation", async () => {
      doctors.findOne.mockResolvedValue({ id: "d1" } as Doctor);
      patients.findOne.mockResolvedValue({ id: "p1" } as Patient);
      services.findOne.mockResolvedValue({ durationMin: 30 } as Service);
      appointments.save.mockRejectedValue({ code: "23P01" });

      await expect(
        service.create(clinic, {
          doctorId: "d1",
          patientId: "p1",
          serviceId: "s1",
          startsAt: "2026-01-15T10:00:00Z",
        }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe("cancel", () => {
    it("throws NotFoundException when appointment not found", async () => {
      appointments.findOne.mockResolvedValue(null);

      await expect(service.cancel(clinic, "a1")).rejects.toThrow(
        NotFoundException,
      );
    });

    it("throws ConflictException when already cancelled", async () => {
      appointments.findOne.mockResolvedValue({
        status: "cancelled",
      } as Appointment);

      await expect(service.cancel(clinic, "a1")).rejects.toThrow(
        ConflictException,
      );
    });

    it("cancels appointment and sends webhook", async () => {
      const appointment = { status: "confirmed" } as Appointment;
      appointments.findOne.mockResolvedValue(appointment);
      appointments.save.mockImplementation((a: Appointment) => Promise.resolve(a));

      await service.cancel(clinic, "a1");

      expect(appointment.status).toBe("cancelled");
      expect(appointments.save).toHaveBeenCalledWith(appointment);
      expect(webhook.notifyAppointmentCancelled).toHaveBeenCalledWith(clinic, appointment);
    });
  });

  describe("reschedule", () => {
    it("throws NotFoundException when appointment not found", async () => {
      appointments.findOne.mockResolvedValue(null);

      await expect(
        service.reschedule(clinic, "a1", { startsAt: "2026-01-16T10:00:00Z" }),
      ).rejects.toThrow(NotFoundException);
    });

    it("throws ConflictException when appointment is cancelled", async () => {
      appointments.findOne.mockResolvedValue({
        status: "cancelled",
      } as Appointment);

      await expect(
        service.reschedule(clinic, "a1", { startsAt: "2026-01-16T10:00:00Z" }),
      ).rejects.toThrow(ConflictException);
    });

    it("reschedules with new endsAt", async () => {
      const appointment = {
        status: "confirmed",
        serviceId: "s1",
      } as Appointment;
      appointments.findOne.mockResolvedValue(appointment);
      services.findOne.mockResolvedValue({ durationMin: 30 } as Service);
      appointments.save.mockImplementation((a: Appointment) => Promise.resolve(a));

      await service.reschedule(clinic, "a1", {
        startsAt: "2026-01-16T11:00:00Z",
      });

      expect(appointment.startsAt).toEqual(new Date("2026-01-16T11:00:00Z"));
      expect(appointment.endsAt).toEqual(new Date("2026-01-16T11:30:00Z"));
    });
  });
});
