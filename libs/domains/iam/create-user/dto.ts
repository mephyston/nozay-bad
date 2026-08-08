import type { Role } from '../shared/roles';

export interface CreateUserInput {
  email: string;
  name?: string;
  roles?: Role[];
  /** Ancien format, recopié tel quel le temps de la transition. @deprecated */
  permissions?: string[];
}

export interface CreateUserOutput {
  id: number;
  email: string;
  name: string;
  roles: Role[];
}
