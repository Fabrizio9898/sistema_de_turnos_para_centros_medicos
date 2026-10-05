import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { LoggerModule } from "nestjs-pino";
import { TypeOrmModule } from "@nestjs/typeorm";
import { HealthModule } from "./health/health.module";
import { AuthModule } from "./auth/auth.module";
import { CatalogModule } from "./catalog/catalog.module";
import { AvailabilityModule } from "./availability/availability.module";
import { AppointmentModule } from "./appointments/appointment.module";

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
  ],
})
export class AppModule {}
