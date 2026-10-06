import { verifyToken, User } from "@clerk/backend";
import { Inject, Injectable, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PassportStrategy } from "@nestjs/passport";
import { Strategy } from "passport-custom";
import { Request } from "express";
import { ClerkClient } from "@clerk/backend";

@Injectable()
export class ClerkStrategy extends PassportStrategy(Strategy, "clerk") {
  constructor(
    @Inject("ClerkClient")
    private readonly clerkClient: ClerkClient,
    private readonly configService: ConfigService,
  ) {
    super();
  }

  async validate(req: Request): Promise<User> {
    const authorization = req.headers.authorization;

    if (!authorization?.startsWith("Bearer ")) {
      throw new UnauthorizedException("No token provided");
    }

    const token = authorization.substring("Bearer ".length);

    try {
      const tokenPayload = await verifyToken(token, {
        secretKey: this.configService.getOrThrow<string>("CLERK_SECRET_KEY"),
      });

      return await this.clerkClient.users.getUser(tokenPayload.sub);
    } catch {
      throw new UnauthorizedException("Invalid token");
    }
  }
}
