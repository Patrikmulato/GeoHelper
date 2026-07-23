import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { randomBytes, scrypt as scryptCallback } from 'node:crypto';
import { promisify } from 'node:util';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateUserDto } from './dto/create-user.dto.js';
import { UserDto } from './dto/user.dto.js';

const SCRYPT_KEY_LENGTH = 64;
const scrypt = promisify(scryptCallback);

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  private async hashPassword(password: string): Promise<string> {
    const salt = randomBytes(16).toString('hex');
    const derivedKey = (await scrypt(password, salt, SCRYPT_KEY_LENGTH)) as Buffer;

    // Persist as algorithm$salt$hash for future verification/migrations.
    return `scrypt$${salt}$${derivedKey.toString('hex')}`;
  }

  private toUserDto(user: {
    id: string;
    email: string;
    role: UserRole;
    createdAt: Date;
    updatedAt: Date;
  }): UserDto {
    return {
      id: user.id,
      email: user.email,
      role: user.role,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  async createUser(dto: CreateUserDto): Promise<UserDto> {
    const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existing) {
      throw new ConflictException('A user with this email already exists');
    }

    const created = await this.prisma.user.create({
      data: {
        email: dto.email,
        role: dto.role ?? UserRole.USER,
        passwordHash: dto.password ? await this.hashPassword(dto.password) : undefined,
      },
      select: {
        id: true,
        email: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return this.toUserDto(created);
  }

  async getUserById(id: string): Promise<UserDto> {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return this.toUserDto(user);
  }

  async listUsers(): Promise<UserDto[]> {
    const users = await this.prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        email: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return users.map((user) => this.toUserDto(user));
  }
}
