import { UserRole } from '../../../../generated/prisma/index.js';

export class AuthResponseDto {
  accessToken!: string;
  refreshToken!: string;
  user!: {
    id: string;
    email: string;
    role: UserRole;
  };
}
