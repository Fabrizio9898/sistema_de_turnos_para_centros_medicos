import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { AvailabilityRule } from "../entities/availability-rule.entity";
import { TimeOff } from "../entities/time-off.entity";
import { Appointment } from "../entities/appointment.entity";
import { Service } from "../entities/service.entity";
import { AvailabilityController } from "./availability.controller";
import { AvailabilityService } from "./availability.service";

@Module({
  imports: [
    TypeOrmModule.forFeature([AvailabilityRule, TimeOff, Appointment, Service]),
  ],
  controllers: [AvailabilityController],
  providers: [AvailabilityService],
})
export class AvailabilityModule {}
