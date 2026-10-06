import {
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";

import { User } from "@/entities/user.entity";

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async findById(id: string): Promise<User> {
    const user = await this.userRepository.findOne({
      where: { id },
    });

    if (!user) {
      throw new NotFoundException("User not found");
    }

    return user;
  }

  async findByClerkUserId(clerkUserId: string): Promise<User | null> {
    return this.userRepository.findOne({
      where: { clerkUserId },
    });
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.userRepository.findOne({
      where: { email },
    });
  }

  async create(data: Partial<User>): Promise<User> {
    const user = this.userRepository.create(data);

    return this.userRepository.save(user);
  }

  async update(id: string, data: Partial<User>): Promise<User> {
    const user = await this.findById(id);

    Object.assign(user, data);

    return this.userRepository.save(user);
  }

  async findOrCreateFromClerk(data: {
    clerkUserId: string;
    email: string;
    name?: string;
  }): Promise<User> {
    const existingUser = await this.findByClerkUserId(data.clerkUserId);

    if (existingUser) {
      return existingUser;
    }

    const existingEmail = await this.findByEmail(data.email);

    if (existingEmail) {
      throw new ConflictException("Email already in use");
    }

    return this.create({
      clerkUserId: data.clerkUserId,
      email: data.email,
    });
  }
}
