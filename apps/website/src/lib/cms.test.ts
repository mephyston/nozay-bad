import { describe, it, expect, beforeEach } from 'vitest';
import { listNavItems, getSiteSettings, SITE_SETTINGS_FALLBACK, type WebsiteEnv } from './cms';
import { attachRenderContext, createRenderContext, type RenderContext } from './render-context';

/**
 * Ce qui est éprouvé ici n'est pas la lecture — elle n'a rien d'intéressant — mais ce
 * qu'elle dit au cache. Une page servie avec ses valeurs de repli ne doit jamais être
 * rangée : elle figerait une panne d'une seconde pour une heure sur tout le réseau.
 */

/** Environnement portant une API factice et le contexte d'une requête. */
function envWith(
  handler: (path: string) => Promise<Response>,
  context: RenderContext = createRenderContext({ version: 42 })
): { env: WebsiteEnv; context: RenderContext; calls: string[] } {
  const calls: string[] = [];
  const env = {
    INTERNAL_API_KEY: 'test',
    API_SERVICE: {
      fetch: async (input: RequestInfo | URL) => {
        const path = new URL(String(input)).pathname + new URL(String(input)).search;
        calls.push(path);
        return handler(path);
      }
    }
  } as unknown as WebsiteEnv;
  return { env: attachRenderContext(env, context), context, calls };
}

const ok = (data: unknown) =>
  new Response(JSON.stringify({ success: true, data }), {
    headers: { 'Content-Type': 'application/json' }
  });

function fakeCaches() {
  const entries = new Map<string, Response>();
  (globalThis as Record<string, unknown>).caches = {
    default: {
      match: async (key: Request) => entries.get(key.url)?.clone(),
      put: async (key: Request, value: Response) => void entries.set(key.url, value)
    }
  };
  return entries;
}

beforeEach(() => {
  delete (globalThis as Record<string, unknown>).caches;
});

describe('santé du rendu', () => {
  it('marque le rendu comme dégradé quand l’API tombe', async () => {
    const { env, context } = envWith(async () => new Response('boom', { status: 500 }));
    expect(await listNavItems(env, 'footer')).toEqual([]);
    expect(context.degraded, 'la page sans menu ne doit pas être mise en cache').toBe(true);
  });

  it('marque le rendu comme dégradé quand la liaison de service est morte', async () => {
    const { env, context } = envWith(async () => {
      throw new Error('service binding down');
    });
    expect(await getSiteSettings(env)).toEqual(SITE_SETTINGS_FALLBACK);
    expect(context.degraded).toBe(true);
  });

  it('ne dégrade pas un rendu sur une absence', async () => {
    // Un média cité par un bloc et supprimé depuis répond 404. C'est une vérité
    // stable : la page doit être servie sans son image *et* mise en cache.
    const { env, context } = envWith(async () => new Response('nope', { status: 404 }));
    expect(await listNavItems(env, 'header')).toEqual([]);
    expect(context.degraded).toBe(false);
  });

  it('dégrade un rendu sur un refus, qui n’est pas une absence', async () => {
    // Une clé interne mal configurée fait répondre 403 à *toutes* les lectures : sans
    // ce marquage, le site entier se figerait en 404 au bord, où les 404 sont rangées.
    const { env, context } = envWith(async () => new Response('nope', { status: 403 }));
    expect(await listNavItems(env, 'header')).toEqual([]);
    expect(context.degraded).toBe(true);
  });

  it('sert la page malgré tout', async () => {
    // Le repli existe pour que le site tienne debout sans l'API ; le marquage ne doit
    // rien y changer.
    const { env } = envWith(async () => new Response('boom', { status: 503 }));
    expect(await getSiteSettings(env)).toEqual(SITE_SETTINGS_FALLBACK);
  });
});

describe('cache des lectures', () => {
  it('ne relit pas les mêmes menus à chaque page', async () => {
    fakeCaches();
    const { env, calls } = envWith(async () => ok([{ id: 1, label: 'Créneaux' }]));
    await listNavItems(env, 'footer');
    await listNavItems(env, 'footer');
    expect(calls.length, 'le second rendu doit venir du cache').toBe(1);
  });

  it('sépare deux emplacements de menu', async () => {
    fakeCaches();
    const { env, calls } = envWith(async (path) => ok([{ id: 1, label: path }]));
    await listNavItems(env, 'footer');
    await listNavItems(env, 'legal');
    expect(calls.length).toBe(2);
  });

  it('ne range rien pour un rendu sans version', async () => {
    // Aperçu ou préproduction : le middleware n'a pas posé de version, donc rien de ce
    // qui est lu n'a sa place dans un cache partagé.
    fakeCaches();
    const { env, calls } = envWith(async () => ok([]), createRenderContext());
    await listNavItems(env, 'footer');
    await listNavItems(env, 'footer');
    expect(calls.length).toBe(2);
  });

  it('ne range jamais une panne', async () => {
    const entries = fakeCaches();
    const { env } = envWith(async () => new Response('boom', { status: 500 }));
    await listNavItems(env, 'footer');
    expect(entries.size).toBe(0);
  });
});
