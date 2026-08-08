import { describe, it, expect } from 'vitest';
import { ROLE_PERMISSIONS, type Permission } from '@nba/iam-ui';
import { can, forbidden, guardAction } from './guard';

const localsFor = (permissions: readonly string[]) =>
  ({ user: { email: 'x@nozaybad.fr', roles: [], permissions } }) as unknown as App.Locals;

const tresorier = localsFor(ROLE_PERMISSIONS.tresorier);
const secretaire = localsFor(ROLE_PERMISSIONS.secretaire);
const anonyme = {} as App.Locals;

const ACTIONS: Record<string, Permission> = {
  create: 'accounting:ledger:write',
  delete: 'accounting:ledger:delete'
};

describe('can', () => {
  it('accorde une permission portée par le rôle', () => {
    expect(can(tresorier, 'accounting:ledger:write')).toBe(true);
  });

  it("refuse une permission que le rôle n'a pas", () => {
    expect(can(secretaire, 'accounting:ledger:write')).toBe(false);
  });

  it('refuse tout en l’absence d’utilisateur', () => {
    expect(can(anonyme, 'dashboard:overview:read')).toBe(false);
  });
});

describe('forbidden', () => {
  it('répond 403', async () => {
    const res = forbidden();
    expect(res.status).toBe(403);
    expect(await res.text()).toBe('Accès refusé');
  });
});

describe('guardAction', () => {
  it('laisse passer une action autorisée', () => {
    expect(guardAction(tresorier, 'create', ACTIONS)).toBeNull();
  });

  it('refuse une action non autorisée', () => {
    expect(guardAction(secretaire, 'create', ACTIONS)?.status).toBe(403);
  });

  it('refuse une action absente de la table', () => {
    // Un nom d'action inventé par le client ne doit jamais atteindre le gestionnaire.
    expect(guardAction(tresorier, 'drop_database', ACTIONS)?.status).toBe(403);
  });

  it('refuse une action absente ou mal typée', () => {
    expect(guardAction(tresorier, undefined, ACTIONS)?.status).toBe(403);
    expect(guardAction(tresorier, 42, ACTIONS)?.status).toBe(403);
    expect(guardAction(tresorier, { toString: () => 'create' }, ACTIONS)?.status).toBe(403);
  });

  it("ne se laisse pas berner par une propriété héritée d'Object", () => {
    // `'constructor' in actions` est vrai par héritage : sans garde, l'action
    // « constructor » passerait la vérification d'existence.
    expect(guardAction(tresorier, 'constructor', ACTIONS)?.status).toBe(403);
    expect(guardAction(tresorier, 'toString', ACTIONS)?.status).toBe(403);
  });
});
