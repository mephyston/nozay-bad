import { describe, it, expect } from 'vitest';
import { app } from '../index';
import { ROUTE_PERMISSIONS } from './route-permissions';
import { matchRule } from './matcher';

/**
 * Garantie structurelle du modèle fermé par défaut.
 *
 * Hono ré-enregistre les sous-routes préfixées sur l'application parente : `app.routes`
 * contient donc tous les chemins qualifiés de l'API. On peut ainsi vérifier dans les
 * deux sens que la table d'autorisation et les routes réellement montées coïncident.
 *
 * Sans ces deux tests, une nouvelle route arriverait sans permission (et serait
 * refusée en production, ce qui se verrait tard) et une route renommée laisserait une
 * règle morte, qui donnerait à la relecture une fausse impression de couverture.
 */
describe('couverture de ROUTE_PERMISSIONS', () => {
  const registered = app.routes
    .filter((r) => r.method !== 'ALL')
    .map((r) => ({ method: r.method, path: r.path }))
    // `/health` répond avant l'autorisation (sonde de disponibilité).
    .filter((r) => r.path !== '/health');

  const unique = [...new Map(registered.map((r) => [`${r.method} ${r.path}`, r])).values()];

  it('couvre toutes les routes montées', () => {
    const missing = unique
      .filter((r) => !matchRuleExact(r.method, r.path))
      .map((r) => `${r.method} ${r.path}`);
    expect(missing, `routes sans règle d'autorisation :\n${missing.join('\n')}`).toEqual([]);
  });

  it('ne contient aucune règle orpheline', () => {
    const mounted = new Set(unique.map((r) => `${r.method} ${r.path}`));
    const orphans = ROUTE_PERMISSIONS.map((r) => `${r.method} ${r.path}`).filter(
      (k) => !mounted.has(k)
    );
    expect(orphans, `règles ne correspondant à aucune route :\n${orphans.join('\n')}`).toEqual([]);
  });

  it('déclare au moins une règle par domaine monté', () => {
    for (const prefix of ['/members', '/accounting', '/expenses', '/shop', '/iam', '/notifications', '/announcements', '/dashboard', '/ai']) {
      expect(
        ROUTE_PERMISSIONS.some((r) => r.path.startsWith(prefix)),
        `aucune règle pour ${prefix}`
      ).toBe(true);
    }
  });
});

/**
 * Correspondance exacte au motif : `matchRule` accepte un chemin concret, on lui
 * passe ici un motif, dont les segments `:param` doivent retomber sur eux-mêmes.
 */
function matchRuleExact(method: string, path: string): boolean {
  const rule = matchRule(method, path);
  return rule?.path === path;
}
