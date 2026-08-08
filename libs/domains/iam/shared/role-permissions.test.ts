import { describe, it, expect } from 'vitest';
import { ALL_PERMISSIONS } from './permissions';
import { ROLE_PERMISSIONS } from './roles';
import {
  EDITABLE_ROLES,
  isEditableRole,
  buildRolePermissionMap,
  permissionsForRoles,
  driftFromDefaults
} from './role-permissions';

describe('rôles modifiables', () => {
  it('exclut super_admin, et lui seul', () => {
    expect(isEditableRole('super_admin')).toBe(false);
    expect(EDITABLE_ROLES).not.toContain('super_admin');
    for (const role of ['president', 'tresorier', 'secretaire', 'coach', 'membre']) {
      expect(isEditableRole(role), role).toBe(true);
    }
  });

  it('rejette un rôle inconnu', () => {
    expect(isEditableRole('dieu')).toBe(false);
  });
});

describe('buildRolePermissionMap', () => {
  it('construit les droits à partir des lignes stockées', () => {
    const map = buildRolePermissionMap([
      { role: 'coach', permission: 'shop:products:write' },
      { role: 'coach', permission: 'members:members:read' }
    ]);
    expect([...map.get('coach')!].sort()).toEqual(['members:members:read', 'shop:products:write']);
  });

  it('donne toujours tout le catalogue à super_admin, quoi que dise la base', () => {
    // Figé en base, il n'obtiendrait pas les permissions ajoutées par une nouvelle
    // fonctionnalité : on livrerait un écran qu'il ne peut pas ouvrir.
    const map = buildRolePermissionMap([{ role: 'super_admin', permission: 'help:docs:read' }]);
    expect(map.get('super_admin')!.size).toBe(ALL_PERMISSIONS.length);
  });

  it('ignore une ligne dont le rôle ou la permission est inconnu', () => {
    // Vestige d'une version antérieure : cela doit se traduire par une absence de
    // droit, jamais par un droit accordé.
    const map = buildRolePermissionMap([
      { role: 'dieu', permission: 'accounting:ledger:write' },
      { role: 'coach', permission: 'accounting:tout:casser' }
    ]);
    expect(map.has('dieu' as never)).toBe(false);
    expect(map.get('coach')!.size).toBe(0);
  });

  it('donne un ensemble vide à un rôle sans ligne', () => {
    const map = buildRolePermissionMap([]);
    for (const role of EDITABLE_ROLES) expect(map.get(role)!.size, role).toBe(0);
  });
});

describe('permissionsForRoles', () => {
  const map = buildRolePermissionMap([
    { role: 'coach', permission: 'shop:orders:write' },
    { role: 'secretaire', permission: 'members:members:import' }
  ]);

  it('fait l’union de plusieurs rôles', () => {
    const resolved = permissionsForRoles(map, ['coach', 'secretaire']);
    expect([...resolved].sort()).toEqual(['members:members:import', 'shop:orders:write']);
  });

  it('ignore un rôle inconnu', () => {
    expect(permissionsForRoles(map, ['dieu']).size).toBe(0);
  });

  it('ne donne rien sans rôle', () => {
    expect(permissionsForRoles(map, []).size).toBe(0);
  });
});

describe('driftFromDefaults', () => {
  it('ne signale aucun écart sur la définition d’origine', () => {
    const current = new Set(ROLE_PERMISSIONS.coach);
    expect(driftFromDefaults('coach', current)).toEqual({ added: [], removed: [] });
  });

  it('signale les ajouts et les retraits', () => {
    const current = new Set(ROLE_PERMISSIONS.coach);
    current.delete('shop:orders:write');
    current.add('accounting:ledger:write');

    expect(driftFromDefaults('coach', current)).toEqual({
      added: ['accounting:ledger:write'],
      removed: ['shop:orders:write']
    });
  });
});
