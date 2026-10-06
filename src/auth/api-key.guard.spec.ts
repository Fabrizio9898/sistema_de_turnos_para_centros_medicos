import { ApiKeyGuard, hashApiKey } from "./api-key.guard";
import { UnauthorizedException } from "@nestjs/common";
import { Clinic } from "../entities/clinic.entity";

describe("ApiKeyGuard", () => {
  let guard: ApiKeyGuard;
  let clinicsRepo: { findOne: jest.Mock };

  beforeEach(() => {
    clinicsRepo = { findOne: jest.fn() };
    guard = new ApiKeyGuard(
      clinicsRepo as never,
      {
        getAllAndOverride: () => false,
      } as never,
    );
  });

  it("throws 401 when x-api-key header is missing", async () => {
    const ctx = {
      getHandler: () => undefined,
      getClass: () => undefined,
      switchToHttp: () => ({
        getRequest: () => ({ headers: {} }),
      }),
    } as never;

    await expect(guard.canActivate(ctx)).rejects.toThrow(UnauthorizedException);
  });

  it("throws 401 when key does not match any clinic", async () => {
    clinicsRepo.findOne.mockResolvedValue(null);

    const ctx = {
      getHandler: () => undefined,
      getClass: () => undefined,
      switchToHttp: () => ({
        getRequest: () => ({ headers: { "x-api-key": "bad-key" } }),
      }),
    } as never;

    await expect(guard.canActivate(ctx)).rejects.toThrow(UnauthorizedException);
  });

  it("sets clinic on request and returns true for valid key", async () => {
    const clinic = { id: "c1", name: "Clinic" } as Clinic;
    clinicsRepo.findOne.mockResolvedValue(clinic);

    const request: Record<string, unknown> = {
      headers: { "x-api-key": "good-key" },
    };
    const ctx = {
      getHandler: () => undefined,
      getClass: () => undefined,
      switchToHttp: () => ({ getRequest: () => request }),
    } as never;

    const result = await guard.canActivate(ctx);

    expect(result).toBe(true);
    expect(request.clinic).toBe(clinic);
    expect(clinicsRepo.findOne).toHaveBeenCalledWith({
      where: { apiKeyHash: hashApiKey("good-key") },
    });
  });
});
