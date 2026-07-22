import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto.js';
import { UserDto } from './dto/user.dto.js';
import { UsersService } from './users.service.js';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

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
