import type { Role } from '../shared/roles';

export interface CreateUserInput {
  email: string;
  name?: string;
  roles?: Role[];
}

export interface CreateUserOutput {
  id: number;
  email: string;
  name: string;
  roles: Role[];
}
