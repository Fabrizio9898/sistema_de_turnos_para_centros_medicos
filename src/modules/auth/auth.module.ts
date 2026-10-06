import { ClerkStrategy } from "@/auth/clerk.staretgy";
import { ClerkAuthGuard } from "@/guards/clerl-auth.guard";
import { ClerkClientProvider } from "@/providers/clerk-client.provider";
import { Global, Module } from "@nestjs/common";
import { PassportModule } from "@nestjs/passport";

@Global()
@Module({
  imports: [PassportModule],
  providers: [ClerkClientProvider, ClerkStrategy, ClerkAuthGuard],
  exports: [ClerkAuthGuard],
})
export class AuthModule {}
