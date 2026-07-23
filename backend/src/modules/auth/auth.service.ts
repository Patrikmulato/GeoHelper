import { ConflictException, Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UserRole } from '@prisma/client';
import { hashPassword, verifyPassword } from '../../common/utils/password-hash.js';
import { PrismaService } from '../prisma/prisma.service.js';
import {
  ACCESS_TOKEN_EXPIRES_IN,
  REFRESH_TOKEN_EXPIRES_IN,
  resolveAccessTokenSecret,
  resolveRefreshTokenSecret,
} from './auth.constants.js';
import { AuthResponseDto } from './dto/auth-response.dto.js';
import { LoginDto } from './dto/login.dto.js';
import { RefreshTokenDto } from './dto/refresh-token.dto.js';
import { RegisterDto } from './dto/register.dto.js';

type AuthUser = {
  id: string;
  email: string;
  role: UserRole;
};

type AuthUserWithSecrets = AuthUser & {
  passwordHash?: string | null;
  refreshTokenHash?: string | null;
};

type RefreshTokenPayload = {
  sub: string;
  email: string;
  role: UserRole;
};

@Injectable()
export class AuthService {
  private readonly prisma: PrismaService;
  private readonly jwtService: JwtService;

  constructor(
    @Inject(PrismaService) prisma: PrismaService,
    @Inject(JwtService) jwtService: JwtService
  ) {
    this.prisma = prisma;
    this.jwtService = jwtService;
  }

  async register(dto: RegisterDto): Promise<AuthResponseDto> {
    const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existing) {
      throw new ConflictException('A user with this email already exists');
    }

    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        passwordHash: await hashPassword(dto.password),
      },
      select: {
        id: true,
        email: true,
        role: true,
      },
    });

    return this.issueAndPersistTokens(user);
  }

  async login(dto: LoginDto): Promise<AuthResponseDto> {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
      select: {
        id: true,
        email: true,
        role: true,
        passwordHash: true,
      },
    });

    if (!user?.passwordHash) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isValidPassword = await verifyPassword(dto.password, user.passwordHash);
    if (!isValidPassword) {
      throw new UnauthorizedException('Invalid credentials');
    }

    return this.issueAndPersistTokens(user);
  }

  async refresh(dto: RefreshTokenDto): Promise<AuthResponseDto> {
    let payload: RefreshTokenPayload;

    try {
      payload = await this.jwtService.verifyAsync<RefreshTokenPayload>(dto.refreshToken, {
        secret: resolveRefreshTokenSecret(),
      });
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: {
        id: true,
        email: true,
        role: true,
        refreshTokenHash: true,
      },
    });

    if (!user?.refreshTokenHash) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const isValidRefreshToken = await verifyPassword(dto.refreshToken, user.refreshTokenHash);
    if (!isValidRefreshToken) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    return this.issueAndPersistTokens(user);
  }

  async logout(userId: string): Promise<{ revoked: true }> {
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        refreshTokenHash: null,
      },
    });

    return { revoked: true };
  }

  private toAuthUser(user: AuthUserWithSecrets): AuthUser {
    return {
      id: user.id,
      email: user.email,
      role: user.role,
    };
  }

  private async issueAndPersistTokens(user: AuthUserWithSecrets): Promise<AuthResponseDto> {
    const safeUser = this.toAuthUser(user);
    const tokenPayload = {
      sub: safeUser.id,
      email: safeUser.email,
      role: safeUser.role,
    };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(tokenPayload, {
        secret: resolveAccessTokenSecret(),
        expiresIn: ACCESS_TOKEN_EXPIRES_IN,
      }),
      this.jwtService.signAsync(tokenPayload, {
        secret: resolveRefreshTokenSecret(),
        expiresIn: REFRESH_TOKEN_EXPIRES_IN,
      }),
    ]);

    await this.prisma.user.update({
      where: { id: safeUser.id },
      data: {
        refreshTokenHash: await hashPassword(refreshToken),
      },
    });

    return {
      accessToken,
      refreshToken,
      user: safeUser,
    };
  }
}
