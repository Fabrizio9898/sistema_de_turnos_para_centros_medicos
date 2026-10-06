import { Clinic } from "@/entities/clinic.entity";
import { createParamDecorator, ExecutionContext } from "@nestjs/common";

export const CurrentClinic = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): Clinic => {
    const request = ctx.switchToHttp().getRequest();
    return request.clinic;
  },
);
