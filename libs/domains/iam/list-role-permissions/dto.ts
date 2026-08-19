import type { Role } from '../shared/roles';
import type { Permission } from '../shared/permissions';

export interface RoleSummary {
  role: Role;
  label: string;
  description: string;
  /** Droits effectivement accordés, tels qu'ils sont appliqués. */
  permissions: Permission[];
  /** `false` pour super_admin, calculé en code et non modifiable. */
  editable: boolean;
  /** Écart avec la définition d'origine du code, pour rendre la dérive visible. */
  added: Permission[];
  removed: Permission[];
}
