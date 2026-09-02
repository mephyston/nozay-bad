import { describe, it, expect } from 'vitest';
import { resolveAppVersion } from './resolve-app-version.mjs';

/*
  Ce que ces tests tiennent, c'est un écran qui ne ment pas : il dit quelle version
  tourne à l'endroit qu'on regarde, et non ce que le dépôt a publié en dernier.

  Le cas qui a motivé le correctif est celui de la préproduction sans release — un
  `chore:` livré le 2 septembre 2026, dont le splash annonçait « v0.0.0-d0438f6 » alors
  que la 2.2.2 tournait.
*/
describe('resolveAppVersion', () => {
  const SHA = 'd0438f6cc1d9dcc8b18c8b188de271be16c41f04';

  it('qualifie la build en préproduction, même quand une version vient d’être publiée', () => {
    expect(resolveAppVersion({ released: '2.2.3', sha: SHA, env: 'staging' })).toBe('2.2.3+d0438f6');
  });

  it('rend le numéro nu en production, sur un commit taggé', () => {
    expect(resolveAppVersion({ exactTag: 'v2.2.2', sha: SHA, env: 'production' })).toBe('2.2.2');
  });

  it('retombe sur le dernier tag atteignable quand le push ne coupe rien', () => {
    // Le cas du 2 septembre : commit `chore:`, aucune release, la 2.2.2 tourne.
    expect(resolveAppVersion({ nearestTag: 'v2.2.2', sha: SHA, env: 'staging' })).toBe('2.2.2+d0438f6');
  });

  it('n’affiche jamais un SHA nu en production, même sur un commit non taggé', () => {
    // C'est ce que `git describe --exact-match` produisait : 40 caractères dans le badge.
    const version = resolveAppVersion({ nearestTag: 'v2.2.2', sha: SHA, env: 'production' });
    expect(version).toBe('2.2.2+d0438f6');
    expect(version).not.toContain(SHA);
  });

  it('tient un dépôt sans aucun tag', () => {
    expect(resolveAppVersion({ sha: SHA, env: 'staging' })).toBe('0.0.0+d0438f6');
  });

  it('ne double jamais le « v », d’où qu’il vienne', () => {
    // semantic-release rend « 2.2.3 », `git describe` rend « v2.2.2 » : les deux formes
    // se croisent ici, et c'est le « vv1.1.1 » affiché en production qui l'a appris.
    for (const version of [
      resolveAppVersion({ released: 'v2.2.3', sha: SHA, env: 'production' }),
      resolveAppVersion({ exactTag: 'V2.2.2', sha: SHA, env: 'production' }),
      resolveAppVersion({ nearestTag: 'v2.2.2', sha: SHA, env: 'staging' })
    ]) {
      expect(version.startsWith('v')).toBe(false);
    }
  });

  it('préfère la release fraîche au tag déjà posé', () => {
    expect(
      resolveAppVersion({ released: '2.2.3', exactTag: 'v2.2.2', sha: SHA, env: 'production' })
    ).toBe('2.2.3');
  });

  it('rend le numéro seul plutôt qu’une métadonnée vide, sans SHA', () => {
    expect(resolveAppVersion({ nearestTag: 'v2.2.2', env: 'staging' })).toBe('2.2.2');
    expect(resolveAppVersion({ released: '2.2.3', env: 'staging' })).toBe('2.2.3');
  });
});
