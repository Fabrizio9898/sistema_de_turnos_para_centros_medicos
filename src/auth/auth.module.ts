import { Global, Module } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Clinic } from "../entities/clinic.entity";
import { ApiKeyGuard } from "./api-key.guard";

@Global()
@Module({
  imports: [TypeOrmModule.forFeature([Clinic])],
  providers: [ApiKeyGuard, { provide: APP_GUARD, useClass: ApiKeyGuard }],
})
export class AuthModule {}
