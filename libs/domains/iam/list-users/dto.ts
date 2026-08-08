import type { Role } from '../shared/roles';

export interface AdminUserSummary {
  id: number;
  email: string;
  name: string;
  roles: Role[];
  createdAt: Date;
  updatedAt: Date | null;
}
