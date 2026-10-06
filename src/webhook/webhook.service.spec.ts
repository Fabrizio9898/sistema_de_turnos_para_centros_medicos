import axios from "axios";
import { WebhookService } from "./webhook.service";
import { Clinic } from "../entities/clinic.entity";
import { Appointment } from "../entities/appointment.entity";

jest.mock("axios");
const post = axios.post as jest.Mock;

describe("WebhookService", () => {
  let service: WebhookService;

  const clinic = {
    id: "c1",
    webhookUrl: "https://example.com/hook",
  } as Clinic;
  const appointment = { id: "a1", status: "confirmed" } as Appointment;

  beforeEach(() => {
    post.mockReset();
    service = new WebhookService();
  });

  it("sends appointment.created webhook", async () => {
    post.mockResolvedValue({});

    await service.notifyAppointmentCreated(clinic, appointment);

    expect(post).toHaveBeenCalledWith(
      "https://example.com/hook",
      expect.objectContaining({ event: "appointment.created" }),
      { timeout: 5000 },
    );
  });

  it("sends appointment.rescheduled webhook", async () => {
    post.mockResolvedValue({});

    await service.notifyAppointmentRescheduled(clinic, appointment);

    expect(post).toHaveBeenCalledWith(
      "https://example.com/hook",
      expect.objectContaining({ event: "appointment.rescheduled" }),
      { timeout: 5000 },
    );
  });

  it("does nothing when clinic has no webhookUrl", async () => {
    await service.notifyAppointmentCreated(
      { id: "c1", webhookUrl: null } as Clinic,
      appointment,
    );

    expect(post).not.toHaveBeenCalled();
  });

  it("logs warning on failure but does not throw", async () => {
    post.mockRejectedValue(new Error("timeout"));

    await expect(
      service.notifyAppointmentCreated(clinic, appointment),
    ).resolves.toBeUndefined();
  });
});
