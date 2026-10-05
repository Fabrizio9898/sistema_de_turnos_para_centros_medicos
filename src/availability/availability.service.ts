import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { formatInTimeZone, fromZonedTime, toZonedTime } from "date-fns-tz";
import { AvailabilityRule } from "../entities/availability-rule.entity";
import { TimeOff } from "../entities/time-off.entity";
import { Appointment } from "../entities/appointment.entity";
import { Service } from "../entities/service.entity";

interface BusyRange {
  start: Date;
  end: Date;
}

@Injectable()
export class AvailabilityService {
  constructor(
    @InjectRepository(AvailabilityRule)
    private readonly rules: Repository<AvailabilityRule>,
    @InjectRepository(TimeOff)
    private readonly timeOffs: Repository<TimeOff>,
    @InjectRepository(Appointment)
    private readonly appointments: Repository<Appointment>,
    @InjectRepository(Service)
    private readonly services: Repository<Service>,
  ) {}

  async getSlots(
    clinicId: string,
    doctorId: string,
    date: string,
    serviceId: string,
    timezone: string,
  ) {
    const service = await this.services.findOne({
      where: { id: serviceId, clinicId },
    });
    if (!service) throw new NotFoundException("Service not found");

    const dayOfWeek = toZonedTime(
      new Date(`${date}T00:00:00Z`),
      timezone,
    ).getDay();

    const rule = await this.rules.findOne({ where: { doctorId, dayOfWeek } });
    if (!rule) return { date, doctorId, serviceId, slots: [] };

    const startUtc = fromZonedTime(`${date}T${rule.startTime}:00`, timezone);
    const endUtc = fromZonedTime(`${date}T${rule.endTime}:00`, timezone);

    const [timeOffs, appointments] = await Promise.all([
      this.timeOffs.find({ where: { doctorId, clinicId } }),
      this.appointments.find({ where: { doctorId, clinicId } }),
    ]);

    const busy: BusyRange[] = [
      ...timeOffs.map((t) => ({ start: t.startsAt, end: t.endsAt })),
      ...appointments
        .filter((a) => a.status !== "cancelled")
        .map((a) => ({ start: a.startsAt, end: a.endsAt })),
    ];

    const slots: Array<{
      start: string;
      end: string;
      startUtc: string;
      endUtc: string;
    }> = [];

    let cursor = startUtc;
    while (
      cursor.getTime() + service.durationMin * 60_000 <=
      endUtc.getTime()
    ) {
      const slotEnd = new Date(cursor.getTime() + service.durationMin * 60_000);
      const isFree = !busy.some((b) => cursor < b.end && slotEnd > b.start);
      if (isFree) {
        slots.push({
          start: formatInTimeZone(cursor, timezone, "HH:mm"),
          end: formatInTimeZone(slotEnd, timezone, "HH:mm"),
          startUtc: cursor.toISOString(),
          endUtc: slotEnd.toISOString(),
        });
      }
      cursor = slotEnd;
    }

    return { date, doctorId, serviceId, slots };
  }
}
