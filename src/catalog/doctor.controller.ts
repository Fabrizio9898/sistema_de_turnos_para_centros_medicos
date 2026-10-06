import { Controller, Get, Param, ParseUUIDPipe } from "@nestjs/common";
import { CurrentClinic } from "../auth/current-clinic.decorator";
import { Clinic } from "../entities/clinic.entity";
import { CatalogService } from "./catalog.service";

@Controller("doctors")
export class DoctorController {
  constructor(private readonly catalog: CatalogService) {}

  @Get(":id/services")
  services(
    @CurrentClinic() clinic: Clinic,
    @Param("id", ParseUUIDPipe) id: string,
  ) {
    return this.catalog.listDoctorServices(clinic, id);
  }
}
