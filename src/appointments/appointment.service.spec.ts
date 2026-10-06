import {
  BadRequestException,
  ConflictException,
  NotFoundException,
  UnprocessableEntityException,
} from "@nestjs/common";
import { AppointmentService } from "./appointment.service";
import { Clinic } from "../entities/clinic.entity";
import { Appointment } from "../entities/appointment.entity";
import { Doctor } from "../entities/doctor.entity";
import { Patient } from "../entities/patient.entity";
import { Service } from "../entities/service.entity";

describe("AppointmentService", () => {
  let service: AppointmentService;
  let appointments: { findOne: jest.Mock; save: jest.Mock };
  let doctors: { findOne: jest.Mock };
  let patients: { findOne: jest.Mock };
  let services: { findOne: jest.Mock };
  let availability: { assertBookable: jest.Mock };
  let webhook: {
    notifyAppointmentCreated: jest.Mock;
    notifyAppointmentCancelled: jest.Mock;
    notifyAppointmentRescheduled: jest.Mock;
  };

  const clinic = {
    id: "c1",
    webhookUrl: null,
    patientRequiredFields: ["name", "phone"],
  } as unknown as Clinic;
  const dto = {
    doctorId: "d1",
    patientId: "p1",
    serviceId: "s1",
    startsAt: "2026-10-13T13:00:00Z",
  };

  beforeEach(() => {
    appointments = {
      findOne: jest.fn(),
      save: jest.fn((a: Appointment) => Promise.resolve(a)),
    };
    doctors = {
      findOne: jest.fn().mockResolvedValue({
        id: "d1",
        patientRequiredFields: [],
      } as unknown as Doctor),
    };
    patients = {
      findOne: jest.fn().mockResolvedValue({
        id: "p1",
        name: "Juan",
        phone: "+5491100000000",
        dni: null,
      } as Patient),
    };
    services = {
      findOne: jest.fn().mockResolvedValue({ durationMin: 30 } as Service),
    };
    availability = { assertBookable: jest.fn().mockResolvedValue(undefined) };
    webhook = {
      notifyAppointmentCreated: jest.fn(),
      notifyAppointmentCancelled: jest.fn(),
      notifyAppointmentRescheduled: jest.fn(),
    };
    service = new AppointmentService(
      appointments as never,
      doctors as never,
      patients as never,
      services as never,
      availability as never,
      webhook as never,
    );
  });

  describe("create", () => {
    it("throws NotFoundException when doctor not found", async () => {
      doctors.findOne.mockResolvedValue(null);

      await expect(service.create(clinic, dto)).rejects.toThrow(
        NotFoundException,
      );
    });

    it("only accepts a service that belongs to the doctor", async () => {
      services.findOne.mockResolvedValue(null);

      await expect(service.create(clinic, dto)).rejects.toThrow(
        NotFoundException,
      );
      expect(services.findOne).toHaveBeenCalledWith({
        where: { id: "s1", doctorId: "d1", clinicId: "c1" },
      });
    });

    it("rejects when the doctor requires a field the patient lacks", async () => {
      doctors.findOne.mockResolvedValue({
        id: "d1",
        patientRequiredFields: ["dni"],
      } as unknown as Doctor);

      const error = await service.create(clinic, dto).catch((e: unknown) => e);

      expect(error).toBeInstanceOf(UnprocessableEntityException);
      expect(
        (error as UnprocessableEntityException).getResponse(),
      ).toMatchObject({ missingFields: ["dni"] });
      expect(appointments.save).not.toHaveBeenCalled();
    });

    it("rejects when the clinic requires a field the patient lacks", async () => {
      const strict = {
        ...clinic,
        patientRequiredFields: ["name", "dni"],
      } as Clinic;

      await expect(service.create(strict, dto)).rejects.toThrow(
        UnprocessableEntityException,
      );
    });

    it("propagates availability errors without saving", async () => {
      availability.assertBookable.mockRejectedValue(
        new BadRequestException("outside hours"),
      );

      await expect(service.create(clinic, dto)).rejects.toThrow(
        BadRequestException,
      );
      expect(appointments.save).not.toHaveBeenCalled();
    });

    it("creates appointment with calculated endsAt and sends webhook", async () => {
      const result = await service.create(clinic, dto);

      expect(availability.assertBookable).toHaveBeenCalledWith(
        clinic,
        "d1",
        30,
        new Date("2026-10-13T13:00:00Z"),
      );
      expect(result.endsAt).toEqual(new Date("2026-10-13T13:30:00Z"));
      expect(result.status).toBe("confirmed");
      expect(result.source).toBe("bot");
      expect(webhook.notifyAppointmentCreated).toHaveBeenCalledWith(
        clinic,
        result,
      );
    });

    it("throws ConflictException on exclusion constraint violation", async () => {
      appointments.save.mockRejectedValue({ code: "23P01" });

      await expect(service.create(clinic, dto)).rejects.toThrow(
        ConflictException,
      );
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

    it("cancels, returns the appointment and sends webhook", async () => {
      const appointment = { status: "confirmed" } as Appointment;
      appointments.findOne.mockResolvedValue(appointment);

      const result = await service.cancel(clinic, "a1");

      expect(result.status).toBe("cancelled");
      expect(appointments.save).toHaveBeenCalledWith(appointment);
      expect(webhook.notifyAppointmentCancelled).toHaveBeenCalledWith(
        clinic,
        appointment,
      );
    });
  });

  describe("reschedule", () => {
    const newTime = { startsAt: "2026-10-13T14:00:00Z" };

    it("throws ConflictException when appointment is cancelled", async () => {
      appointments.findOne.mockResolvedValue({
        status: "cancelled",
      } as Appointment);

      await expect(service.reschedule(clinic, "a1", newTime)).rejects.toThrow(
        ConflictException,
      );
    });

    it("validates availability excluding itself, then saves and notifies", async () => {
      const appointment = {
        id: "a1",
        doctorId: "d1",
        status: "confirmed",
        serviceId: "s1",
      } as Appointment;
      appointments.findOne.mockResolvedValue(appointment);

      const result = await service.reschedule(clinic, "a1", newTime);

      expect(availability.assertBookable).toHaveBeenCalledWith(
        clinic,
        "d1",
        30,
        new Date("2026-10-13T14:00:00Z"),
        "a1",
      );
      expect(result.startsAt).toEqual(new Date("2026-10-13T14:00:00Z"));
      expect(result.endsAt).toEqual(new Date("2026-10-13T14:30:00Z"));
      expect(webhook.notifyAppointmentRescheduled).toHaveBeenCalledWith(
        clinic,
        appointment,
      );
    });

    it("does not save when the new time is not bookable", async () => {
      appointments.findOne.mockResolvedValue({
        id: "a1",
        status: "confirmed",
        serviceId: "s1",
      } as Appointment);
      availability.assertBookable.mockRejectedValue(new ConflictException());

      await expect(service.reschedule(clinic, "a1", newTime)).rejects.toThrow(
        ConflictException,
      );
      expect(appointments.save).not.toHaveBeenCalled();
    });
  });
});
