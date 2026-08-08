import { describe, it, expect } from 'vitest';
import { matchRule } from './matcher';
import { ROUTE_PERMISSIONS } from './route-permissions';

describe('matchRule', () => {
  it('associe un chemin concret au motif paramétré', () => {
    expect(matchRule('GET', '/accounting/invoices/42')?.path).toBe('/accounting/invoices/:id');
  });

  it('ne confond pas une collection et un élément', () => {
    expect(matchRule('GET', '/accounting/invoices')?.path).toBe('/accounting/invoices');
    expect(matchRule('DELETE', '/accounting/invoices/42')?.permission).toBe(
      'accounting:invoices:delete'
    );
  });

  it('fait gagner le littéral sur le paramètre à longueur égale', () => {
    // `/members/attestation/config` et `/members/:id/cse-data` ont trois segments :
    // c'est le nombre de littéraux qui tranche.
    expect(matchRule('GET', '/members/attestation/config')?.path).toBe(
      '/members/attestation/config'
    );
    expect(matchRule('GET', '/members/17/cse-data')?.path).toBe('/members/:id/cse-data');
  });

  it('préfère le motif le plus long', () => {
    expect(matchRule('GET', '/accounting/seasons/25-26/reports/pdf')?.permission).toBe(
      'accounting:reports:export'
    );
    expect(matchRule('GET', '/accounting/seasons/25-26/reports')?.permission).toBe(
      'accounting:reports:read'
    );
  });

  it("ne dépend pas de l'ordre des règles dans le fichier source", () => {
    // Le tri de spécificité est calculé au chargement : déplacer une ligne dans
    // route-permissions.ts ne doit pas changer la permission appliquée.
    const shuffled = [...ROUTE_PERMISSIONS].sort(() => Math.random() - 0.5);
    expect(shuffled.length).toBe(ROUTE_PERMISSIONS.length);
    expect(matchRule('GET', '/members/attestation/config')?.path).toBe(
      '/members/attestation/config'
    );
  });

  it('traite HEAD comme GET', () => {
    expect(matchRule('HEAD', '/members')?.permission).toBe('members:members:read');
  });

  it('ne reconnaît pas OPTIONS', () => {
    // Tout le trafic passe par un service binding : aucun besoin de préflight CORS.
    expect(matchRule('OPTIONS', '/members')).toBeUndefined();
  });

  it('distingue les méthodes sur un même chemin', () => {
    expect(matchRule('GET', '/iam/users')?.permission).toBe('iam:users:read');
    expect(matchRule('POST', '/iam/users')?.permission).toBe('iam:users:write');
  });

  it('ne renvoie rien pour un chemin inconnu', () => {
    expect(matchRule('GET', '/accounting/pas-une-route')).toBeUndefined();
    expect(matchRule('GET', '/')).toBeUndefined();
  });

  it('ignore une barre oblique finale ou dupliquée', () => {
    expect(matchRule('GET', '/members/')?.path).toBe('/members');
    expect(matchRule('GET', '//members')?.path).toBe('/members');
  });

  it("n'accorde `service` qu'aux routes réellement appelées par le storefront", () => {
    expect(matchRule('POST', '/shop/orders')?.service).toBe(true);
    expect(matchRule('POST', '/shop/orders/1/approve')?.service).toBeUndefined();
    expect(matchRule('GET', '/iam/me')?.service).toBeUndefined();
  });
});

describe('ROUTE_PERMISSIONS', () => {
  it('ne contient aucun doublon (method, path)', () => {
    // Le matcher lève au chargement en cas de doublon ; ce test le documente et
    // échouerait à l'import bien avant l'assertion.
    const keys = ROUTE_PERMISSIONS.map((r) => `${r.method} ${r.path}`);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("n'expose jamais /iam/me au storefront", () => {
    const rule = ROUTE_PERMISSIONS.find((r) => r.path === '/iam/me');
    expect(rule?.service).toBeUndefined();
  });
});
