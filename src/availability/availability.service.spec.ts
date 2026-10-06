import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from "@nestjs/common";
import { AvailabilityService, dayOfWeek } from "./availability.service";
import { Clinic } from "../entities/clinic.entity";
import { AvailabilityRule } from "../entities/availability-rule.entity";
import { Appointment } from "../entities/appointment.entity";
import { Service } from "../entities/service.entity";
import { TimeOff } from "../entities/time-off.entity";

const TZ = "America/Argentina/Buenos_Aires"; // UTC-3, no DST
// 2026-10-13 is a Tuesday.
const DATE = "2026-10-13";

describe("dayOfWeek", () => {
  it("returns the weekday of the calendar date, regardless of timezone", () => {
    expect(dayOfWeek("2026-10-05")).toBe(1); // Monday
    expect(dayOfWeek("2026-10-13")).toBe(2); // Tuesday
    expect(dayOfWeek("2026-10-11")).toBe(0); // Sunday
  });
});

describe("AvailabilityService", () => {
  let service: AvailabilityService;
  let rules: { find: jest.Mock };
  let timeOffs: { find: jest.Mock };
  let appointments: { find: jest.Mock };
  let services: { findOne: jest.Mock };

  const clinic = { id: "c1", timezone: TZ } as Clinic;

  beforeEach(() => {
    rules = { find: jest.fn().mockResolvedValue([]) };
    timeOffs = { find: jest.fn().mockResolvedValue([]) };
    appointments = { find: jest.fn().mockResolvedValue([]) };
    services = {
      findOne: jest
        .fn()
        .mockResolvedValue({ id: "s1", durationMin: 60 } as Service),
    };
    service = new AvailabilityService(
      rules as never,
      timeOffs as never,
      appointments as never,
      services as never,
    );
    jest.spyOn(Date, "now").mockReturnValue(Date.parse("2026-10-01T12:00:00Z"));
  });

  afterEach(() => jest.restoreAllMocks());

  const rule = (startTime: string, endTime: string) =>
    ({ startTime, endTime }) as AvailabilityRule;

  describe("getSlots", () => {
    it("throws NotFoundException when service is not the doctor's", async () => {
      services.findOne.mockResolvedValue(null);

      await expect(service.getSlots(clinic, "d1", DATE, "s1")).rejects.toThrow(
        NotFoundException,
      );
      expect(services.findOne).toHaveBeenCalledWith({
        where: { id: "s1", doctorId: "d1", clinicId: "c1" },
      });
    });

    it("looks up rules for the requested weekday", async () => {
      await service.getSlots(clinic, "d1", DATE, "s1");

      expect(rules.find).toHaveBeenCalledWith({
        where: { clinicId: "c1", doctorId: "d1", dayOfWeek: 2 },
        order: { startTime: "ASC" },
      });
    });

    it("returns empty slots when the doctor doesn't work that day", async () => {
      const result = await service.getSlots(clinic, "d1", DATE, "s1");

      expect(result.slots).toEqual([]);
    });

    it("handles Postgres HH:mm:ss times and returns local + UTC slots", async () => {
      rules.find.mockResolvedValue([rule("09:00:00", "11:00:00")]);

      const result = await service.getSlots(clinic, "d1", DATE, "s1");

      expect(result.slots).toEqual([
        {
          start: "09:00",
          end: "10:00",
          startUtc: "2026-10-13T12:00:00.000Z",
          endUtc: "2026-10-13T13:00:00.000Z",
        },
        {
          start: "10:00",
          end: "11:00",
          startUtc: "2026-10-13T13:00:00.000Z",
          endUtc: "2026-10-13T14:00:00.000Z",
        },
      ]);
    });

    it("combines multiple windows in the same day", async () => {
      rules.find.mockResolvedValue([
        rule("09:00", "10:00"),
        rule("16:00", "18:00"),
      ]);

      const result = await service.getSlots(clinic, "d1", DATE, "s1");

      expect(result.slots.map((s) => s.start)).toEqual([
        "09:00",
        "16:00",
        "17:00",
      ]);
    });

    it("excludes appointments and time off", async () => {
      rules.find.mockResolvedValue([rule("09:00", "12:00")]);
      appointments.find.mockResolvedValue([
        {
          startsAt: new Date("2026-10-13T12:00:00Z"), // 09:00 local
          endsAt: new Date("2026-10-13T13:00:00Z"),
        } as Appointment,
      ]);
      timeOffs.find.mockResolvedValue([
        {
          startsAt: new Date("2026-10-13T14:30:00Z"), // 11:30 local
          endsAt: new Date("2026-10-13T15:00:00Z"),
        } as TimeOff,
      ]);

      const result = await service.getSlots(clinic, "d1", DATE, "s1");

      expect(result.slots.map((s) => s.start)).toEqual(["10:00"]);
    });

    it("does not offer slots that already started", async () => {
      rules.find.mockResolvedValue([rule("09:00", "12:00")]);
      // 10:30 local on the requested day.
      jest
        .spyOn(Date, "now")
        .mockReturnValue(Date.parse("2026-10-13T13:30:00Z"));

      const result = await service.getSlots(clinic, "d1", DATE, "s1");

      expect(result.slots.map((s) => s.start)).toEqual(["11:00"]);
    });

    it("supports a window ending at 24:00", async () => {
      rules.find.mockResolvedValue([rule("22:00", "24:00:00")]);

      const result = await service.getSlots(clinic, "d1", DATE, "s1");

      expect(result.slots.map((s) => s.start)).toEqual(["22:00", "23:00"]);
    });
  });

  describe("assertBookable", () => {
    // 10:00 local on Tuesday 2026-10-13.
    const at10 = new Date("2026-10-13T13:00:00Z");

    beforeEach(() => {
      rules.find.mockResolvedValue([
        rule("09:00", "12:00"),
        rule("16:00", "18:00"),
      ]);
    });

    it("accepts a time inside a working window", async () => {
      await expect(
        service.assertBookable(clinic, "d1", 60, at10),
      ).resolves.toBeUndefined();
    });

    it("rejects times in the past", async () => {
      await expect(
        service.assertBookable(
          clinic,
          "d1",
          60,
          new Date("2026-09-01T13:00:00Z"),
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it("rejects times outside the doctor's hours", async () => {
      // 13:00 local, between windows.
      await expect(
        service.assertBookable(
          clinic,
          "d1",
          60,
          new Date("2026-10-13T16:00:00Z"),
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it("rejects when the duration runs past the end of the window", async () => {
      // 11:30 local + 60 min ends 12:30.
      await expect(
        service.assertBookable(
          clinic,
          "d1",
          60,
          new Date("2026-10-13T14:30:00Z"),
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it("rejects when the doctor has time off", async () => {
      timeOffs.find.mockResolvedValue([{ id: "t1" } as TimeOff]);

      await expect(
        service.assertBookable(clinic, "d1", 60, at10),
      ).rejects.toThrow(ConflictException);
    });

    it("rejects overlapping appointments", async () => {
      appointments.find.mockResolvedValue([{ id: "a1" } as Appointment]);

      await expect(
        service.assertBookable(clinic, "d1", 60, at10),
      ).rejects.toThrow(ConflictException);
    });

    it("ignores the appointment being rescheduled", async () => {
      appointments.find.mockResolvedValue([{ id: "a1" } as Appointment]);

      await expect(
        service.assertBookable(clinic, "d1", 60, at10, "a1"),
      ).resolves.toBeUndefined();
    });
  });
});
