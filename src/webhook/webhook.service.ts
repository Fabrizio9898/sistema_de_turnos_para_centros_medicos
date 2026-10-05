import { Injectable, Logger } from "@nestjs/common";
import { HttpService } from "@nestjs/axios";
import { firstValueFrom } from "rxjs";
import { Clinic } from "../entities/clinic.entity";
import { Appointment } from "../entities/appointment.entity";

@Injectable()
export class WebhookService {
  private readonly logger = new Logger(WebhookService.name);

  constructor(private readonly http: HttpService) {}

  async notifyAppointmentCreated(
    clinic: Clinic,
    appointment: Appointment,
  ): Promise<void> {
    if (!clinic.webhookUrl) return;
    await this.send(clinic.webhookUrl, {
      event: "appointment.created",
      appointment: this.payload(appointment),
    });
  }

  async notifyAppointmentCancelled(
    clinic: Clinic,
    appointment: Appointment,
  ): Promise<void> {
    if (!clinic.webhookUrl) return;
    await this.send(clinic.webhookUrl, {
      event: "appointment.cancelled",
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
      await firstValueFrom(
        this.http.post(url, payload, { timeout: 5000 }),
      );
      this.logger.log(`Webhook sent to ${url}`);
    } catch (error) {
      this.logger.warn(
        `Webhook failed to ${url}: ${error.message}`,
      );
    }
  }
}
