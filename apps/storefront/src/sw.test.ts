import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

/*
  Le service worker n'a pas de harnais d'exécution ; ce test tient les deux lignes sans
  lesquelles la mise à jour proposée par la bannière ne se termine jamais. Le bouton
  « Recharger » envoie SKIP_WAITING puis attend que le nouveau SW contrôle la page :
  il faut donc répondre au message ET réclamer les pages ouvertes.
*/
const source = readFileSync(resolve(__dirname, 'sw.ts'), 'utf8');

describe('service worker du storefront', () => {
  it('passe la main au nouveau SW quand la bannière le demande', () => {
    expect(source).toMatch(/type === 'SKIP_WAITING'[\s\S]*self\.skipWaiting\(\)/);
  });

  it('réclame les pages ouvertes, sans quoi « Recharger » ne recharge jamais', () => {
    expect(source).toMatch(/^clientsClaim\(\);/m);
  });

  it("ne sert aucune coquille HTML en cache : l'app est en SSR authentifié", () => {
    expect(source).not.toMatch(/NavigationRoute|createHandlerBoundToURL/);
  });
});
