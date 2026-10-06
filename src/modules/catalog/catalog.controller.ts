import { Controller, Get, Param, ParseUUIDPipe } from "@nestjs/common";
import { CurrentClinic } from "../auth/current-clinic.decorator";
import { CatalogService } from "./catalog.service";
import { Clinic } from "@/entities/clinic.entity";

@Controller("specialties")
export class CatalogController {
  constructor(private readonly catalog: CatalogService) {}

  @Get()
  list(@CurrentClinic() clinic: Clinic) {
    return this.catalog.listSpecialties(clinic.id);
  }

  @Get(":id/doctors")
  doctors(
    @CurrentClinic() clinic: Clinic,
    @Param("id", ParseUUIDPipe) id: string,
  ) {
    return this.catalog.listDoctorsBySpecialty(clinic.id, id);
  }
}
