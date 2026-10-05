import { NotFoundException } from "@nestjs/common";
import { AvailabilityService } from "./availability.service";
import { AvailabilityRule } from "../entities/availability-rule.entity";
import { Appointment } from "../entities/appointment.entity";
import { Service } from "../entities/service.entity";

describe("AvailabilityService", () => {
  let service: AvailabilityService;
  let rules: { findOne: jest.Mock };
  let timeOffs: { find: jest.Mock };
  let appointments: { find: jest.Mock };
  let services: { findOne: jest.Mock };

  beforeEach(() => {
    rules = { findOne: jest.fn() };
    timeOffs = { find: jest.fn() };
    appointments = { find: jest.fn() };
    services = { findOne: jest.fn() };
    service = new AvailabilityService(
      rules as never,
      timeOffs as never,
      appointments as never,
      services as never,
    );
  });

  it("throws NotFoundException when service does not exist", async () => {
    services.findOne.mockResolvedValue(null);

    await expect(
      service.getSlots(
        "c1",
        "d1",
        "2026-01-15",
        "s1",
        "America/Argentina/Buenos_Aires",
      ),
    ).rejects.toThrow(NotFoundException);
  });

  it("returns empty slots when no availability rule for that day", async () => {
    services.findOne.mockResolvedValue({
      id: "s1",
      durationMin: 30,
    } as Service);
    rules.findOne.mockResolvedValue(null);

    const result = await service.getSlots(
      "c1",
      "d1",
      "2026-01-15",
      "s1",
      "America/Argentina/Buenos_Aires",
    );

    expect(result.slots).toEqual([]);
  });

  it("returns slots excluding busy ranges", async () => {
    services.findOne.mockResolvedValue({
      id: "s1",
      durationMin: 60,
    } as Service);
    rules.findOne.mockResolvedValue({
      startTime: "09:00",
      endTime: "11:00",
    } as AvailabilityRule);
    timeOffs.find.mockResolvedValue([]);
    appointments.find.mockResolvedValue([
      {
        startsAt: new Date("2026-01-15T10:00:00Z"),
        endsAt: new Date("2026-01-15T11:00:00Z"),
        status: "confirmed",
      } as Appointment,
    ]);

    const result = await service.getSlots(
      "c1",
      "d1",
      "2026-01-15",
      "s1",
      "America/Argentina/Buenos_Aires",
    );

    expect(result.slots).toHaveLength(1);
    expect(result.slots[0].start).toBe("09:00");
    expect(result.slots[0].end).toBe("10:00");
  });
});
