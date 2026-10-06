import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { LessThan, MoreThan, Not, Repository } from "typeorm";
import { formatInTimeZone, fromZonedTime } from "date-fns-tz";
import { Clinic } from "../../entities/clinic.entity";
import { AvailabilityRule } from "../../entities/availability-rule.entity";
import { TimeOff } from "../../entities/time-off.entity";
import { Appointment } from "../../entities/appointment.entity";
import { Service } from "../../entities/service.entity";

interface Range {
  start: Date;
  end: Date;
}

export interface Slot {
  start: string;
  end: string;
  startUtc: string;
  endUtc: string;
}

const MINUTE = 60_000;

/** Weekday (0 = Sunday, as stored in availability_rules) of a YYYY-MM-DD calendar date. */
export function dayOfWeek(date: string): number {
  return new Date(`${date}T00:00:00Z`).getUTCDay();
}

/**
 * Postgres `time` columns come back as "HH:mm:ss"; seeds and mocks may use "HH:mm".
 * "24:00" (valid in Postgres) means midnight at the end of the day.
 */
function toLocalInstant(date: string, time: string, timezone: string): Date {
  const hhmm = time.slice(0, 5);
  if (hhmm === "24:00") {
    const nextDay = new Date(Date.parse(`${date}T00:00:00Z`) + 86_400_000);
    return fromZonedTime(
      `${nextDay.toISOString().slice(0, 10)}T00:00:00`,
      timezone,
    );
  }
  return fromZonedTime(`${date}T${hhmm}:00`, timezone);
}

function overlaps(a: Range, b: Range): boolean {
  return a.start < b.end && a.end > b.start;
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
    clinic: Clinic,
    doctorId: string,
    date: string,
    serviceId: string,
  ) {
    const service = await this.services.findOne({
      where: { id: serviceId, doctorId, clinicId: clinic.id },
    });
    if (!service) throw new NotFoundException("Service not found for doctor");

    const windows = await this.workingWindows(clinic, doctorId, date);
    if (windows.length === 0) return { date, doctorId, serviceId, slots: [] };

    const busy = await this.busyRanges(clinic.id, doctorId, {
      start: windows[0].start,
      end: windows[windows.length - 1].end,
    });

    const duration = service.durationMin * MINUTE;
    const now = Date.now();
    const slots: Slot[] = [];

    for (const window of windows) {
      for (
        let start = window.start.getTime();
        start + duration <= window.end.getTime();
        start += duration
      ) {
        const slot = {
          start: new Date(start),
          end: new Date(start + duration),
        };
        if (start <= now || busy.some((b) => overlaps(slot, b))) continue;
        slots.push({
          start: formatInTimeZone(slot.start, clinic.timezone, "HH:mm"),
          end: formatInTimeZone(slot.end, clinic.timezone, "HH:mm"),
          startUtc: slot.start.toISOString(),
          endUtc: slot.end.toISOString(),
        });
      }
    }

    return { date, doctorId, serviceId, slots };
  }

  /**
   * Throws unless [startsAt, startsAt + durationMin) is in the future, inside one of
   * the doctor's working windows, and clear of time off and other appointments.
   * The DB exclusion constraint still guards against concurrent bookings.
   */
  async assertBookable(
    clinic: Clinic,
    doctorId: string,
    durationMin: number,
    startsAt: Date,
    excludeAppointmentId?: string,
  ): Promise<void> {
    if (startsAt.getTime() <= Date.now()) {
      throw new BadRequestException("Cannot book a time in the past");
    }
    const requested = {
      start: startsAt,
      end: new Date(startsAt.getTime() + durationMin * MINUTE),
    };

    const date = formatInTimeZone(startsAt, clinic.timezone, "yyyy-MM-dd");
    const windows = await this.workingWindows(clinic, doctorId, date);
    const fits = windows.some(
      (w) => requested.start >= w.start && requested.end <= w.end,
    );
    if (!fits) {
      throw new BadRequestException("Requested time is outside doctor's hours");
    }

    const [timeOffs, appointments] = await Promise.all([
      this.findTimeOffs(clinic.id, doctorId, requested),
      this.findAppointments(clinic.id, doctorId, requested),
    ]);
    if (timeOffs.length > 0) {
      throw new ConflictException("Doctor is not available at that time");
    }
    if (appointments.some((a) => a.id !== excludeAppointmentId)) {
      throw new ConflictException("Slot already booked");
    }
  }

  private async workingWindows(
    clinic: Clinic,
    doctorId: string,
    date: string,
  ): Promise<Range[]> {
    const rules = await this.rules.find({
      where: { clinicId: clinic.id, doctorId, dayOfWeek: dayOfWeek(date) },
      order: { startTime: "ASC" },
    });
    return rules.map((r) => ({
      start: toLocalInstant(date, r.startTime, clinic.timezone),
      end: toLocalInstant(date, r.endTime, clinic.timezone),
    }));
  }

  private async busyRanges(
    clinicId: string,
    doctorId: string,
    range: Range,
  ): Promise<Range[]> {
    const [timeOffs, appointments] = await Promise.all([
      this.findTimeOffs(clinicId, doctorId, range),
      this.findAppointments(clinicId, doctorId, range),
    ]);
    return [...timeOffs, ...appointments].map((b) => ({
      start: b.startsAt,
      end: b.endsAt,
    }));
  }

  private findTimeOffs(clinicId: string, doctorId: string, range: Range) {
    return this.timeOffs.find({
      where: {
        clinicId,
        doctorId,
        startsAt: LessThan(range.end),
        endsAt: MoreThan(range.start),
      },
    });
  }

  private findAppointments(clinicId: string, doctorId: string, range: Range) {
    return this.appointments.find({
      where: {
        clinicId,
        doctorId,
        status: Not("cancelled"),
        startsAt: LessThan(range.end),
        endsAt: MoreThan(range.start),
      },
    });
  }
}
