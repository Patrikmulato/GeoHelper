import { Body, Controller, Get, Inject, Param, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { RolesGuard } from '../auth/roles.guard.js';
import { CreateUserDto } from './dto/create-user.dto.js';
import { UserDto } from './dto/user.dto.js';
import { UsersService } from './users.service.js';

@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
export class UsersController {
  private readonly usersService: UsersService;

  constructor(@Inject(UsersService) usersService: UsersService) {
    this.usersService = usersService;
  }

  @Post()
  async createUser(@Body() body: CreateUserDto): Promise<UserDto> {
    return this.usersService.createUser(body);
  }

  @Get()
  async listUsers(): Promise<UserDto[]> {
    return this.usersService.listUsers();
  }

  @Get(':id')
  async getUserById(@Param('id') id: string): Promise<UserDto> {
    return this.usersService.getUserById(id);
  }
}
