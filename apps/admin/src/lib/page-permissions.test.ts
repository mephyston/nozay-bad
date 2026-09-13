import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { PAGE_PERMISSIONS, PAGE_FEATURES, matchPagePattern, isPageRoute } from './page-permissions';
import { NAV_GROUPS } from './nav';
import { FEATURE_PREREQUISITES } from '@nba/club-ui';

const PAGES_DIR = path.resolve(__dirname, '../pages');

/** Motifs de route Astro déduits de l'arborescence des pages. */
function listRoutePatterns(dir: string, prefix = ''): string[] {
  const routes: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      routes.push(...listRoutePatterns(full, `${prefix}/${entry.name}`));
      continue;
    }
    if (!entry.name.endsWith('.astro')) continue;
    const base = entry.name.replace(/\.astro$/, '');
    routes.push(base === 'index' ? prefix || '/' : `${prefix}/${base}`);
  }
  return routes;
}

const routePatterns = listRoutePatterns(PAGES_DIR).filter(isPageRoute);

describe('couverture de PAGE_PERMISSIONS', () => {
  it('déclare une permission pour chaque page', () => {
    // Miroir du test de couverture de l'API : une page ajoutée sans entrée serait
    // refusée en production, ce qui se verrait tard. Ici, elle échoue à la revue.
    const missing = routePatterns.filter((r) => PAGE_PERMISSIONS[r] === undefined);
    expect(missing, `pages sans permission déclarée :\n${missing.join('\n')}`).toEqual([]);
  });

  it('ne déclare aucune page qui n’existe pas', () => {
    const known = new Set(routePatterns);
    const orphans = Object.keys(PAGE_PERMISSIONS).filter((p) => !known.has(p));
    expect(orphans, `entrées orphelines :\n${orphans.join('\n')}`).toEqual([]);
  });
});

describe('couverture de PAGE_FEATURES', () => {
  it('ne déclare que des motifs connus de PAGE_PERMISSIONS', () => {
    const orphans = Object.keys(PAGE_FEATURES).filter((p) => PAGE_PERMISSIONS[p] === undefined);
    expect(orphans, `motifs orphelins :\n${orphans.join('\n')}`).toEqual([]);
  });

  it('porte, pour chaque entrée du menu qui dépend d’une fonctionnalité, la même fonctionnalité', () => {
    // Le menu cache l'entrée, la page répond introuvable : les deux doivent lire la
    // même clé, sinon une entrée visible mènerait à une page qui n'existe pas — ou
    // l'inverse, une page ouverte que le menu n'annonce pas.
    const mismatches: string[] = [];
    for (const group of NAV_GROUPS) {
      for (const item of group.items) {
        const expected = item.feature ?? group.feature;
        if (!expected) continue;
        const pattern = matchPagePattern(item.href);
        const declared = pattern ? PAGE_FEATURES[pattern] : undefined;
        // Une page paramétrée sert plusieurs entrées (« Caisse » et « Badnet » sur
        // `/accounting/accounts/[code]`) : elle porte alors leur préalable commun.
        const compatible =
          declared === expected || (declared !== undefined && (FEATURE_PREREQUISITES[expected] ?? []).includes(declared));
        if (!compatible) mismatches.push(`${item.href} : menu ${expected}, page ${declared ?? 'aucune'}`);
      }
    }
    expect(mismatches).toEqual([]);
  });
});

describe('matchPagePattern', () => {
  it('ramène un chemin concret à son motif', () => {
    expect(matchPagePattern('/admin/members/12345678')).toBe('/admin/members/[licence]');
    expect(matchPagePattern('/admin/accounting/reports/bilan')).toBe('/admin/accounting/reports/[report]');
  });

  it('préfère la page littérale au motif paramétré', () => {
    expect(matchPagePattern('/admin/members/import')).toBe('/admin/members/import');
  });

  it('ignore une barre oblique finale', () => {
    expect(matchPagePattern('/admin/members/')).toBe('/admin/members');
    expect(matchPagePattern('/')).toBe('/');
  });

  it('ne reconnaît pas un chemin inconnu, ce qui vaut refus', () => {
    expect(matchPagePattern('/admin/inexistant')).toBeUndefined();
    expect(matchPagePattern('/admin/accounting/inexistant/profond')).toBeUndefined();
  });
});

describe('isPageRoute', () => {
  it('exclut les points d’entrée API, qui relaient vers l’API', () => {
    expect(isPageRoute('/api/accounting/invoices')).toBe(false);
    expect(isPageRoute('/admin/api/users')).toBe(false);
  });

  it('exclut les ressources et les routes internes d’Astro', () => {
    expect(isPageRoute('/_astro/index.js')).toBe(false);
    expect(isPageRoute('/favicon.ico')).toBe(false);
    expect(isPageRoute('/manifest.webmanifest')).toBe(false);
  });

  it('retient les pages', () => {
    expect(isPageRoute('/')).toBe(true);
    expect(isPageRoute('/admin/members')).toBe(true);
  });
});
