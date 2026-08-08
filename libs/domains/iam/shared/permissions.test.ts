import { describe, it, expect } from 'vitest';
import { ALL_PERMISSIONS, can, canAny, canAll, isPermission, type Permission } from './permissions';

/** Vocabulaire d'actions fermé : toute nouvelle action doit être ajoutée ici sciemment. */
const ACTIONS = [
  'read',
  'write',
  'delete',
  'approve',
  'import',
  'export',
  'close',
  'reconcile',
  'send',
  'use',
  'impersonate'
];

describe('catalogue de permissions', () => {
  it('respecte la convention <domaine>:<ressource>:<action>', () => {
    for (const permission of ALL_PERMISSIONS) {
      expect(permission, `${permission} ne respecte pas la convention`).toMatch(
        /^[a-z]+:[a-z-]+:[a-z-]+$/
      );
    }
  });

  it("n'utilise que le vocabulaire d'actions autorisé", () => {
    for (const permission of ALL_PERMISSIONS) {
      const action = permission.split(':')[2];
      expect(ACTIONS, `action inconnue dans ${permission}`).toContain(action);
    }
  });

  it('ne contient aucun doublon', () => {
    expect(new Set(ALL_PERMISSIONS).size).toBe(ALL_PERMISSIONS.length);
  });

  it('ne contient plus aucun joker', () => {
    for (const permission of ALL_PERMISSIONS) {
      expect(permission).not.toContain('*');
    }
  });
});

describe('isPermission', () => {
  it('reconnaît une permission du catalogue', () => {
    expect(isPermission('members:members:read')).toBe(true);
  });

  it("rejette une chaîne inconnue, y compris l'ancien vocabulaire à jokers", () => {
    expect(isPermission('members:read')).toBe(false);
    expect(isPermission('accounting:*')).toBe(false);
    expect(isPermission('*')).toBe(false);
  });
});

describe('can', () => {
  const granted: Permission[] = ['members:members:read', 'accounting:ledger:read'];

  it('accorde une permission présente', () => {
    expect(can(granted, 'members:members:read')).toBe(true);
  });

  it('refuse une permission absente', () => {
    expect(can(granted, 'members:members:write')).toBe(false);
  });

  it('accepte indifféremment un Set ou un tableau', () => {
    expect(can(new Set(granted), 'accounting:ledger:read')).toBe(true);
    expect(can(new Set(granted), 'accounting:ledger:write')).toBe(false);
  });

  it("n'infère rien : aucune correspondance de préfixe", () => {
    // Le cœur du changement de modèle : `accounting:ledger:read` n'ouvre pas
    // `accounting:ledger:write`, et rien n'ouvre tout.
    expect(can(['accounting:ledger:read'], 'accounting:ledger:write')).toBe(false);
    expect(can([], 'dashboard:overview:read')).toBe(false);
  });

  it('refuse tout pour un ensemble vide (deny-by-default)', () => {
    for (const permission of ALL_PERMISSIONS) {
      expect(can(new Set<string>(), permission)).toBe(false);
    }
  });
});

describe('canAny / canAll', () => {
  const granted: Permission[] = ['shop:orders:read'];

  it('canAny suffit avec une seule correspondance', () => {
    expect(canAny(granted, ['shop:orders:read', 'shop:orders:approve'])).toBe(true);
    expect(canAny(granted, ['shop:orders:write', 'shop:orders:approve'])).toBe(false);
  });

  it('canAll exige toutes les correspondances', () => {
    expect(canAll(granted, ['shop:orders:read'])).toBe(true);
    expect(canAll(granted, ['shop:orders:read', 'shop:orders:approve'])).toBe(false);
  });

  it('canAny est faux sur une liste requise vide, canAll est vrai', () => {
    expect(canAny(granted, [])).toBe(false);
    expect(canAll(granted, [])).toBe(true);
  });
});
