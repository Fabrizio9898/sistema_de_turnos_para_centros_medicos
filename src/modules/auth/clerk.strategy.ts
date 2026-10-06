import { UserService } from "@/modules/users/user.service";
import { ClerkClient, verifyToken } from "@clerk/backend";
import { Inject, Injectable, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PassportStrategy } from "@nestjs/passport";
import { FastifyRequest } from "fastify";
import { Strategy } from "passport-custom";

@Injectable()
export class ClerkStrategy extends PassportStrategy(Strategy, "clerk") {
  constructor(
    @Inject("ClerkClient")
    private readonly clerkClient: ClerkClient,
    private readonly configService: ConfigService,
    private readonly userService: UserService,
  ) {
    super();
  }

  async validate(req: FastifyRequest) {
    const authorization = req.headers.authorization;

    if (!authorization?.startsWith("Bearer ")) {
      throw new UnauthorizedException("No token provided");
    }

    const token = authorization.substring("Bearer ".length);

    let tokenPayload;
    try {
      tokenPayload = await verifyToken(token, {
        secretKey: this.configService.getOrThrow<string>("CLERK_SECRET_KEY"),
      });
    } catch {
      throw new UnauthorizedException("Invalid token");
    }

    const clerkUserId = tokenPayload.sub;
    const clerkUser = await this.clerkClient.users.getUser(clerkUserId);

    return this.userService.findOrCreateFromClerk({
      clerkUserId,
      email: clerkUser.emailAddresses[0]?.emailAddress,
    });
  }
}
