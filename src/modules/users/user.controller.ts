import { Controller, Get, UseGuards } from "@nestjs/common";
import { ClerkAuthGuard } from "@/guards/clerk-auth.guard";
import { CurrentUser } from "@/modules/auth/current-user.decorator";
import { User } from "@/entities/user.entity";

@Controller("users")
@UseGuards(ClerkAuthGuard)
export class UserController {
  @Get("me")
  me(@CurrentUser() user: User) {
    return user;
  }
}
