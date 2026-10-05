import { createParamDecorator, ExecutionContext } from "@nestjs/common";
import { Clinic } from "../entities/clinic.entity";

export const CurrentClinic = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): Clinic => {
    const request = ctx.switchToHttp().getRequest();
    return request.clinic;
  },
);
