import { describe, it, expect, vi } from 'vitest';
import { ALL_PERMISSIONS, type Permission } from './permissions';
import { PERMISSION_LABELS, groupedPermissions } from './catalog';
import {
  PERMISSION_PREREQUISITES,
  withPrerequisites,
  missingPrerequisites
} from './prerequisites';
import {
  ROLES,
  ROLE_LABELS,
  ROLE_DESCRIPTIONS,
  ROLE_PERMISSIONS,
  DEFAULT_ROLE,
  isRole,
  resolvePermissions,
  type Role
} from './roles';

describe('définition des rôles', () => {
  it('déclare un libellé et une description pour chaque rôle', () => {
    for (const role of ROLES) {
      expect(ROLE_LABELS[role]).toBeTruthy();
      expect(ROLE_DESCRIPTIONS[role]).toBeTruthy();
    }
  });

  it("n'accorde que des permissions du catalogue", () => {
    // TypeScript l'impose à la compilation, mais les rôles arrivent aussi de la base :
    // on vérifie donc aussi à l'exécution.
    const known = new Set<string>(ALL_PERMISSIONS);
    for (const role of ROLES) {
      for (const permission of ROLE_PERMISSIONS[role]) {
        expect(known, `${role} accorde une permission inconnue : ${permission}`).toContain(
          permission
        );
      }
    }
  });

  it('ne répète aucune permission au sein d’un rôle', () => {
    for (const role of ROLES) {
      const list = ROLE_PERMISSIONS[role];
      expect(new Set(list).size, `doublon dans ${role}`).toBe(list.length);
    }
  });

  it('donne à super_admin la totalité du catalogue', () => {
    expect(new Set(ROLE_PERMISSIONS.super_admin)).toEqual(new Set(ALL_PERMISSIONS));
  });

  it('fait de super_admin un sur-ensemble de tous les autres rôles', () => {
    const superAdmin = new Set<string>(ROLE_PERMISSIONS.super_admin);
    for (const role of ROLES) {
      for (const permission of ROLE_PERMISSIONS[role]) {
        expect(superAdmin, `${permission} (${role}) absent de super_admin`).toContain(permission);
      }
    }
  });

  it('limite le rôle par défaut « membre » au socle commun', () => {
    expect(DEFAULT_ROLE).toBe('membre');
    expect([...ROLE_PERMISSIONS.membre].sort()).toEqual([
      'dashboard:overview:read',
      'help:docs:read'
    ]);
  });

  /**
   * Un rôle livré qui ne satisferait pas ses propres prérequis donnerait à sa prise en
   * main exactement le défaut que la table est censée fermer : des écrans accessibles
   * et vides. Le test rend cet état impossible à fusionner.
   */
  it('livre des rôles qui satisfont leurs propres prérequis', () => {
    for (const role of ROLES) {
      expect(missingPrerequisites(ROLE_PERMISSIONS[role]), role).toEqual([]);
    }
  });

  it('tire les prérequis avec le droit qui les suppose', () => {
    const closed = withPrerequisites(['accounting:reports:read']);

    expect(closed).toContain('accounting:seasons:read');
    expect(closed).toContain('accounting:config:read');
  });

  it("n'invente aucun prérequis hors du catalogue", () => {
    for (const [permission, required] of Object.entries(PERMISSION_PREREQUISITES)) {
      expect(ALL_PERMISSIONS, permission).toContain(permission);
      for (const one of required ?? []) expect(ALL_PERMISSIONS, one).toContain(one);
    }
  });

  it("n'accorde l'usurpation qu'à super_admin", () => {
    for (const role of ROLES) {
      const hasImpersonate = ROLE_PERMISSIONS[role].includes('iam:sessions:impersonate');
      expect(hasImpersonate, role).toBe(role === 'super_admin');
    }
  });

  it("donne à l'entraîneur la boutique et la lecture des adhérents, rien de plus", () => {
    const coach = new Set<string>(ROLE_PERMISSIONS.coach);
    // Ce qu'on lui accorde.
    for (const p of [
      'members:members:read',
      'shop:products:read', 'shop:products:write', 'shop:categories:write',
      'shop:orders:read', 'shop:orders:write'
    ]) {
      expect(coach, p).toContain(p);
    }
    // Ce qu'on lui refuse : encaisser une commande écrit une recette au grand livre,
    // et le fichier des adhérents reste en lecture seule.
    for (const p of [
      'shop:orders:approve',
      'members:members:write', 'members:members:import', 'members:members:export',
      'accounting:ledger:read', 'accounting:ledger:write',
      'expenses:reports:read', 'notifications:messages:send'
    ]) {
      expect(coach, p).not.toContain(p);
    }
  });

  it("n'accorde aucune écriture comptable à la présidence (séparation des tâches)", () => {
    const writes: Permission[] = [
      'accounting:ledger:write',
      'accounting:ledger:delete',
      'accounting:invoices:write',
      'accounting:invoices:delete',
      'accounting:checks:write',
      'accounting:bank:reconcile',
      'accounting:config:write'
    ];
    for (const permission of writes) {
      expect(ROLE_PERMISSIONS.president, permission).not.toContain(permission);
    }
  });

  it('donne le socle commun à tous les rôles', () => {
    for (const role of ROLES) {
      expect(ROLE_PERMISSIONS[role], role).toContain('dashboard:overview:read');
      expect(ROLE_PERMISSIONS[role], role).toContain('help:docs:read');
    }
  });
});

describe('isRole', () => {
  it('reconnaît les rôles déclarés et rejette le reste', () => {
    expect(isRole('tresorier')).toBe(true);
    expect(isRole('admin')).toBe(false);
    expect(isRole('')).toBe(false);
  });
});

describe('resolvePermissions', () => {
  it('retourne un ensemble vide sans rôle (deny-by-default)', () => {
    expect(resolvePermissions([]).size).toBe(0);
  });

  it('fait l’union des permissions de plusieurs rôles', () => {
    const resolved = resolvePermissions(['tresorier', 'secretaire']);
    expect(resolved.has('accounting:ledger:write')).toBe(true); // trésorier
    expect(resolved.has('members:members:import')).toBe(true); // secrétaire
    expect(resolved.has('iam:users:delete')).toBe(false); // ni l'un ni l'autre
  });

  it('ignore un rôle inconnu en le signalant', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    expect(resolvePermissions(['bogus']).size).toBe(0);
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('bogus'));
    warn.mockRestore();
  });

  it('reste correct si un rôle est répété', () => {
    expect(resolvePermissions(['membre', 'membre']).size).toBe(2);
  });
});

/**
 * Instantané de la matrice complète rôle → permissions.
 *
 * C'est le test de plus forte valeur du lot : sans lui, ajouter une permission à un
 * rôle est une édition de tableau invisible en revue. Avec lui, chaque attribution
 * devient un diff explicite. Si ce test échoue, vérifier que l'écart est voulu avant
 * de mettre à jour l'instantané.
 */
describe('matrice des droits', () => {
  it('correspond à l’instantané validé', () => {
    const matrix = Object.fromEntries(
      ROLES.map((role: Role) => [role, [...ROLE_PERMISSIONS[role]].sort()])
    );
    expect(matrix).toMatchSnapshot();
  });
});

describe('catalogue lisible', () => {
  it('donne un libellé à chaque permission', () => {
    // Sans ce test, une permission ajoutée apparaîtrait à l'écran sous sa forme
    // technique — illisible pour qui attribue un rôle.
    for (const permission of ALL_PERMISSIONS) {
      expect(PERMISSION_LABELS[permission], `libellé manquant : ${permission}`).toBeTruthy();
    }
  });

  it('ne déclare aucun libellé orphelin', () => {
    const known = new Set<string>(ALL_PERMISSIONS);
    const orphans = Object.keys(PERMISSION_LABELS).filter((p) => !known.has(p));
    expect(orphans).toEqual([]);
  });

  it('classe chaque permission dans un groupe', () => {
    const grouped = groupedPermissions().flatMap((g) => g.permissions);
    expect([...grouped].sort()).toEqual([...ALL_PERMISSIONS].sort());
  });
});
