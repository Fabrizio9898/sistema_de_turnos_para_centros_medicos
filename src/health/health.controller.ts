import { Controller, Get } from "@nestjs/common";
import { Public } from "../auth/public.decorator";

@Controller("health")
export class HealthController {
  @Public()
  @Get()
  check() {
    return { status: "ok", timestamp: new Date().toISOString() };
  }
}
