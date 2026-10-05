import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Specialty } from "../entities/specialty.entity";
import { Doctor } from "../entities/doctor.entity";
import { DoctorSpecialty } from "../entities/doctor-specialty.entity";
import { CatalogController } from "./catalog.controller";
import { CatalogService } from "./catalog.service";

@Module({
  imports: [TypeOrmModule.forFeature([Specialty, Doctor, DoctorSpecialty])],
  controllers: [CatalogController],
  providers: [CatalogService],
})
export class CatalogModule {}
