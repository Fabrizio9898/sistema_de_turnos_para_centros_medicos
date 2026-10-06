import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { LoggerModule } from "nestjs-pino";
import { TypeOrmModule } from "@nestjs/typeorm";
import { HealthModule } from "./modules/health/health.module";
import { AvailabilityModule } from "./modules/availability/availability.module";
import { AppointmentModule } from "./modules/appointments/appointment.module";
import { WebhookModule } from "./webhook/webhook.module";
import { AuthModule } from "./modules/auth/auth.module";
import { CatalogModule } from "./modules/catalog/catalog.module";
import { PatientModule } from "./modules/patients/patient.module";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    LoggerModule.forRoot({
      pinoHttp: {
        level: process.env.NODE_ENV === "production" ? "info" : "debug",
        transport:
          process.env.NODE_ENV !== "production"
            ? { target: "pino-pretty" }
            : undefined,
      },
    }),
    TypeOrmModule.forRoot({
      type: "postgres",
      url: process.env.DATABASE_URL,
      autoLoadEntities: true,
      synchronize: false,
    }),
    HealthModule,
    AuthModule,
    CatalogModule,
    AvailabilityModule,
    AppointmentModule,
    PatientModule,
    WebhookModule,
  ],
})
export class AppModule {}
