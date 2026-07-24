import { Body, Controller, Get, Inject, Post, UseGuards, ValidationPipe } from '@nestjs/common';
import { CurrentUser } from './decorators/current-user.decorator.js';
import { AuthService } from './auth.service.js';
import type { AccessTokenPayload } from './auth.types.js';
import { AuthResponseDto } from './dto/auth-response.dto.js';
import { LoginDto } from './dto/login.dto.js';
import { RefreshTokenDto } from './dto/refresh-token.dto.js';
import { RegisterDto } from './dto/register.dto.js';
import { JwtAuthGuard } from './jwt-auth.guard.js';
import { RateLimit } from '../../common/rate-limit/rate-limit.decorator.js';
import { RateLimitGuard } from '../../common/rate-limit/rate-limit.guard.js';

@Controller('auth')
export class AuthController {
  private readonly authService: AuthService;

  constructor(@Inject(AuthService) authService: AuthService) {
    this.authService = authService;
  }

  @Post('register')
  @UseGuards(RateLimitGuard)
  @RateLimit(10, 60_000)
  async register(
    // The global ValidationPipe can't infer the @Body() metatype in this build
    // (no emitted design:paramtypes metadata), so it silently skips validation
    // unless the expected type is passed explicitly here.
    @Body(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        expectedType: RegisterDto,
      })
    )
    body: RegisterDto
  ): Promise<AuthResponseDto> {
    return this.authService.register(body);
  }

  @Post('login')
  @UseGuards(RateLimitGuard)
  @RateLimit(10, 60_000)
  async login(
    @Body(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        expectedType: LoginDto,
      })
    )
    body: LoginDto
  ): Promise<AuthResponseDto> {
    return this.authService.login(body);
  }

  @Post('refresh')
  @UseGuards(RateLimitGuard)
  @RateLimit(20, 60_000)
  async refresh(
    @Body(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        expectedType: RefreshTokenDto,
      })
    )
    body: RefreshTokenDto
  ): Promise<AuthResponseDto> {
    return this.authService.refresh(body);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  getMe(@CurrentUser() user: AccessTokenPayload): { id: string; email: string; role: string } {
    return {
      id: user.sub,
      email: user.email,
      role: user.role,
    };
  }

  @UseGuards(JwtAuthGuard, RateLimitGuard)
  @RateLimit(30, 60_000)
  @Post('logout')
  async logout(@CurrentUser('sub') userId: string): Promise<{ revoked: true }> {
    return this.authService.logout(userId);
  }
}
