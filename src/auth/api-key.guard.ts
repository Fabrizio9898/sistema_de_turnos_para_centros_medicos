import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { createHash } from "crypto";
import { Clinic } from "../entities/clinic.entity";
import { IS_PUBLIC_KEY } from "./public.decorator";

export function hashApiKey(key: string): string {
  // Read lazily: this module is imported before ConfigModule loads .env.
  const pepper = process.env.API_KEY_PEPPER ?? "dev-pepper-change-in-prod";
  return createHash("sha256")
    .update(key + pepper)
    .digest("hex");
}

@Injectable()
export class ApiKeyGuard implements CanActivate {
  constructor(
    @InjectRepository(Clinic)
    private readonly clinics: Repository<Clinic>,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

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
