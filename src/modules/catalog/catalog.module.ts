import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { CatalogController } from "./catalog.controller";
import { DoctorController } from "./doctor.controller";
import { CatalogService } from "./catalog.service";
import { Service } from "@/entities/service.entity";
import { DoctorSpecialty } from "@/entities/doctor-specialty.entity";
import { Specialty } from "@/entities/specialty.entity";
import { Doctor } from "@/entities/doctor.entity";

@Module({
  imports: [
    TypeOrmModule.forFeature([Specialty, Doctor, DoctorSpecialty, Service]),
  ],
  controllers: [CatalogController, DoctorController],
  providers: [CatalogService],
})
export class CatalogModule {}
