import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { createHash } from "crypto";
import { Clinic } from "../entities/clinic.entity";

const PEPPER = process.env.API_KEY_PEPPER ?? "dev-pepper-change-in-prod";

export function hashApiKey(key: string): string {
  return createHash("sha256")
    .update(key + PEPPER)
    .digest("hex");
}

@Injectable()
export class ApiKeyGuard implements CanActivate {
  constructor(
    @InjectRepository(Clinic)
    private readonly clinics: Repository<Clinic>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const key = request.headers["x-api-key"];

    if (!key || typeof key !== "string") {
      throw new UnauthorizedException("Missing API key");
    }

    const hash = hashApiKey(key);
    const clinic = await this.clinics.findOne({
      where: { apiKeyHash: hash },
    });

    if (!clinic) {
      throw new UnauthorizedException("Invalid API key");
    }

    request.clinic = clinic;
    return true;
  }
}
