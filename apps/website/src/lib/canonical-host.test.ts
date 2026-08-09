import { describe, it, expect } from 'vitest';

/**
 * Redirection vers l'hôte canonique.
 *
 * La logique est reproduite ici parce que le middleware Astro n'est pas importable
 * hors de son runtime (`astro:middleware`). Ce qui est verrouillé, c'est la décision :
 * en local, on ne redirige jamais.
 *
 * Le défaut d'origine : la garde reposait sur `APP_ENV`, absent sous `astro dev`, et
 * sur `PUBLIC_APP_ENV`, qui retombe sur « production » quand il n'est pas posé.
 * Résultat, `localhost:4323` était renvoyé vers `nozaybad.fr:4323` — le port était
 * conservé puisque seul le nom d'hôte était réécrit.
 */
function isLocalHost(hostname: string): boolean {
  return (
    hostname === 'localhost' ||
    hostname.endsWith('.localhost') ||
    hostname === '::1' ||
    hostname === '0.0.0.0' ||
    /^127\./.test(hostname)
  );
}

function shouldRedirect(hostname: string, canonical: string | null, appEnv: string | undefined): boolean {
  return Boolean(canonical) && !isLocalHost(hostname) && appEnv !== 'development' && hostname !== canonical;
}

describe('hôte local', () => {
  it.each(['localhost', '127.0.0.1', '127.0.1.1', '::1', '0.0.0.0', 'site.localhost'])(
    'reconnaît %s',
    (host) => expect(isLocalHost(host)).toBe(true)
  );

  it.each(['nozaybad.fr', 'www.nozaybad.fr', 'staging-www.nozaybad.fr', 'localhost.evil.com'])(
    'ne confond pas %s avec un hôte local',
    (host) => expect(isLocalHost(host)).toBe(false)
  );
});

describe('décision de redirection', () => {
  it("ne redirige jamais depuis localhost, même si l'environnement se croit en production", () => {
    // C'est exactement le cas qui cassait : PUBLIC_APP_ENV non posé vaut 'production',
    // donc SITE_URL vaut https://nozaybad.fr.
    expect(shouldRedirect('localhost', 'nozaybad.fr', 'production')).toBe(false);
    expect(shouldRedirect('127.0.0.1', 'nozaybad.fr', undefined)).toBe(false);
  });

  it('redirige toujours www vers l’apex en production', () => {
    expect(shouldRedirect('www.nozaybad.fr', 'nozaybad.fr', 'production')).toBe(true);
  });

  it('ne redirige pas quand on est déjà sur l’hôte canonique', () => {
    expect(shouldRedirect('nozaybad.fr', 'nozaybad.fr', 'production')).toBe(false);
    expect(shouldRedirect('staging-www.nozaybad.fr', 'staging-www.nozaybad.fr', 'staging')).toBe(false);
  });

  it('ne redirige pas sans hôte canonique connu', () => {
    expect(shouldRedirect('exemple.fr', null, 'production')).toBe(false);
  });
});
