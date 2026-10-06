import { Injectable, Logger } from "@nestjs/common";
import axios from "axios";
import { Clinic } from "../entities/clinic.entity";
import { Appointment } from "../entities/appointment.entity";

export type AppointmentEvent =
  "appointment.created" | "appointment.cancelled" | "appointment.rescheduled";

@Injectable()
export class WebhookService {
  private readonly logger = new Logger(WebhookService.name);

  async notifyAppointmentCreated(
    clinic: Clinic,
    appointment: Appointment,
  ): Promise<void> {
    await this.notify(clinic, "appointment.created", appointment);
  }

  async notifyAppointmentCancelled(
    clinic: Clinic,
    appointment: Appointment,
  ): Promise<void> {
    await this.notify(clinic, "appointment.cancelled", appointment);
  }

  async notifyAppointmentRescheduled(
    clinic: Clinic,
    appointment: Appointment,
  ): Promise<void> {
    await this.notify(clinic, "appointment.rescheduled", appointment);
  }

  private async notify(
    clinic: Clinic,
    event: AppointmentEvent,
    appointment: Appointment,
  ): Promise<void> {
    if (!clinic.webhookUrl) return;
    await this.send(clinic.webhookUrl, {
      event,
      appointment: this.payload(appointment),
    });
  }

  private payload(appointment: Appointment) {
    return {
      id: appointment.id,
      clinicId: appointment.clinicId,
      doctorId: appointment.doctorId,
      patientId: appointment.patientId,
      serviceId: appointment.serviceId,
      startsAt: appointment.startsAt,
      endsAt: appointment.endsAt,
      status: appointment.status,
      source: appointment.source,
    };
  }

  private async send(url: string, payload: object): Promise<void> {
    try {
      await axios.post(url, payload, { timeout: 5000 });
      this.logger.log(`Webhook sent to ${url}`);
    } catch (error) {
      this.logger.warn(`Webhook failed to ${url}: ${(error as Error).message}`);
    }
  }
}
