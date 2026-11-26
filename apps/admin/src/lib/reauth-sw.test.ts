// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

/*
  Le garde du service worker est un script classique (`public/reauth-sw.js`, chargé par
  `importScripts`) : on l'évalue tel quel et on en sort ses deux fonctions.
*/
const source = readFileSync(new URL('../../public/reauth-sw.js', import.meta.url), 'utf8');
const { shouldGuardNavigation, handleGuardedNavigation } = new Function(
  `${source}; return { shouldGuardNavigation, handleGuardedNavigation };`
)() as {
  shouldGuardNavigation: (request: { mode: string; method: string; url: string }, origin: string) => boolean;
  handleGuardedNavigation: (request: unknown, deps: unknown) => Promise<{ kind: string }>;
};

const ORIGIN = 'https://admin.example';
const navigation = (path: string) => ({ mode: 'navigate', method: 'GET', url: `${ORIGIN}${path}` });

function memoryCaches() {
  const store = new Map<string, string>();
  return {
    open: async () => ({
      match: async (key: string) => (store.has(key) ? { text: async () => store.get(key)! } : undefined),
      put: async (key: string, response: Response) => void store.set(key, await response.text())
    })
  };
}

function deps(options: { first: 'page' | 'redirect'; follow: 'ok' | 'cross-origin'; now?: () => number; caches?: ReturnType<typeof memoryCaches> }) {
  return {
    fetch: async (_request: unknown, init?: { redirect?: string }) => {
      if (init?.redirect === 'follow') {
        if (options.follow === 'cross-origin') throw new TypeError('Failed to fetch');
        return { kind: 'followed', type: 'basic' };
      }
      return options.first === 'page' ? { kind: 'page', type: 'basic' } : { kind: 'original-redirect', type: 'opaqueredirect' };
    },
    caches: options.caches ?? memoryCaches(),
    now: options.now ?? (() => 1_000_000),
    origin: ORIGIN,
    redirect: (url: string) => ({ kind: `redirect:${url}` })
  };
}

describe('garde des navigations vers Cloudflare Access', () => {
  it("ne garde que les navigations de l'admin, hors reconnexion et pages d'Access", () => {
    expect(shouldGuardNavigation(navigation('/admin/membres'), ORIGIN)).toBe(true);
    expect(shouldGuardNavigation(navigation('/reconnexion'), ORIGIN)).toBe(false);
    expect(shouldGuardNavigation(navigation('/cdn-cgi/access/logout'), ORIGIN)).toBe(false);
    expect(shouldGuardNavigation({ mode: 'cors', method: 'GET', url: `${ORIGIN}/admin/api/x` }, ORIGIN)).toBe(false);
    expect(shouldGuardNavigation({ mode: 'navigate', method: 'GET', url: 'https://ailleurs.example/' }, ORIGIN)).toBe(false);
  });

  it('rend une page ordinaire telle quelle', async () => {
    expect(await handleGuardedNavigation(navigation('/admin'), deps({ first: 'page', follow: 'ok' }))).toMatchObject({ kind: 'page' });
  });

  it('laisse suivre une redirection interne', async () => {
    expect(await handleGuardedNavigation(navigation('/admin/ancien'), deps({ first: 'redirect', follow: 'ok' }))).toMatchObject({ kind: 'original-redirect' });
  });

  it('envoie sur /reconnexion une redirection vers Access, une fois par deux minutes', async () => {
    const caches = memoryCaches();
    let now = 1_000_000;
    const d = deps({ first: 'redirect', follow: 'cross-origin', caches, now: () => now });
    expect(await handleGuardedNavigation(navigation('/admin'), d)).toEqual({ kind: `redirect:${ORIGIN}/reconnexion?depuis=sw` });
    // Revenue de /reconnexion, la connexion est simplement à refaire : on laisse passer.
    now += 30_000;
    expect(await handleGuardedNavigation(navigation('/admin'), d)).toMatchObject({ kind: 'original-redirect' });
    now += 2 * 60_000;
    expect(await handleGuardedNavigation(navigation('/admin'), d)).toEqual({ kind: `redirect:${ORIGIN}/reconnexion?depuis=sw` });
  });
});
