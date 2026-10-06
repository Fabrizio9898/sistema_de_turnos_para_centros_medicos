import { Global, Module } from "@nestjs/common";
import { PassportModule } from "@nestjs/passport";
import { UserModule } from "@/modules/users/user.module";
import { ClerkAuthGuard } from "@/guards/clerk-auth.guard";
import { ClerkClientProvider } from "@/providers/clerk-client.provider";
import { ClerkStrategy } from "./clerk.strategy";

@Global()
@Module({
  imports: [PassportModule, UserModule],
  providers: [ClerkClientProvider, ClerkStrategy, ClerkAuthGuard],
  exports: [ClerkAuthGuard],
})
export class AuthModule {}
