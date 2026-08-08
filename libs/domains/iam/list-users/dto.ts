import type { Role } from '../shared/roles';

export interface AdminUserSummary {
  id: number;
  email: string;
  name: string;
  roles: Role[];
  /**
   * Ancienne liste de permissions à jokers, restituée telle qu'elle est encore
   * stockée. Elle maintient l'application admin fonctionnelle tant qu'elle n'est pas
   * passée aux rôles (phase 3), après quoi ce champ et la colonne disparaissent.
   *
   * @deprecated Utiliser `roles`.
   */
  permissions: string[];
  createdAt: Date;
  updatedAt: Date | null;
}
