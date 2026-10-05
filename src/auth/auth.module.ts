import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Clinic } from "../entities/clinic.entity";
import { ApiKeyGuard } from "./api-key.guard";

@Module({
  imports: [TypeOrmModule.forFeature([Clinic])],
  providers: [ApiKeyGuard],
  exports: [ApiKeyGuard],
})
export class AuthModule {}
