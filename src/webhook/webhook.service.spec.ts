import { WebhookService } from "./webhook.service";
import { Clinic } from "../entities/clinic.entity";
import { Appointment } from "../entities/appointment.entity";

describe("WebhookService", () => {
  let service: WebhookService;
  let http: { post: jest.Mock };

  beforeEach(() => {
    http = { post: jest.fn() };
    service = new WebhookService(http as never);
  });

  it("sends appointment.created webhook", async () => {
    const clinic = {
      id: "c1",
      webhookUrl: "https://example.com/hook",
    } as Clinic;
    const appointment = {
      id: "a1",
      clinicId: "c1",
      doctorId: "d1",
      patientId: "p1",
      serviceId: "s1",
      startsAt: new Date("2026-01-15T10:00:00Z"),
      endsAt: new Date("2026-01-15T10:30:00Z"),
      status: "confirmed",
      source: "bot",
    } as Appointment;

    http.post.mockReturnValue({ toPromise: () => Promise.resolve() });

    await service.notifyAppointmentCreated(clinic, appointment);

    expect(http.post).toHaveBeenCalledWith(
      "https://example.com/hook",
      expect.objectContaining({ event: "appointment.created" }),
      { timeout: 5000 },
    );
  });

  it("does nothing when clinic has no webhookUrl", async () => {
    const clinic = { id: "c1", webhookUrl: null } as Clinic;
    const appointment = { id: "a1" } as Appointment;

    await service.notifyAppointmentCreated(clinic, appointment);

    expect(http.post).not.toHaveBeenCalled();
  });

  it("logs warning on failure but does not throw", async () => {
    const clinic = {
      id: "c1",
      webhookUrl: "https://example.com/hook",
    } as Clinic;
    const appointment = { id: "a1" } as Appointment;

    http.post.mockReturnValue({
      toPromise: () => Promise.reject(new Error("timeout")),
    });

    await expect(
      service.notifyAppointmentCreated(clinic, appointment),
    ).resolves.toBeUndefined();
  });
});
