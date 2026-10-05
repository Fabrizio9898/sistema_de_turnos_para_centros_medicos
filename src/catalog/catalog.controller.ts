import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  UseGuards,
} from "@nestjs/common";
import { ApiKeyGuard } from "../auth/api-key.guard";
import { CurrentClinic } from "../auth/current-clinic.decorator";
import { Clinic } from "../entities/clinic.entity";
import { CatalogService } from "./catalog.service";

@Controller("specialties")
@UseGuards(ApiKeyGuard)
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
