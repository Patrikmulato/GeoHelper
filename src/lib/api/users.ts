import { apiClient } from '@/lib/api/client';
import type { User } from '@/types/user';

export function listUsers() {
  return apiClient.get<User[]>('/api/users');
}
