import { describe, it, expect, beforeEach, vi } from 'vitest';

/**
 * Le relais du domaine « séances ».
 *
 * Deux de ses écrans sont derrière le drapeau `OPEN_PLAY_ENABLED`. La page répond 404
 * quand il est baissé ; si le relais, lui, servait les données, la fonctionnalité serait
 * fermée à l'œil et ouverte à qui sait former une URL. C'est la régression que ce fichier
 * ferme en premier.
 */

let appels: { url: string; init?: RequestInit }[] = [];
let reponse404 = false;

vi.mock('../../../../lib/api', () => ({
  createAdminApiClient: () => ({
    fetch: (url: string, init?: RequestInit) => {
      appels.push({ url, init });
      /*
        La forme compte : les chargeurs enchaînent `.filter()` et `.map()` sur ce qu'ils
        reçoivent. Un mock qui rend la même chose pour tout ferait passer des tests sur du
        code qui casse en production.
      */
      const chemin = url.replace('http://localhost', '');
      if (reponse404 && chemin.startsWith('/schedules/open-play')) {
        return Promise.resolve(new Response('désactivé', { status: 404 }));
      }
      const corps = chemin.startsWith('/schedules/open-play?') ? { sessions: [] } : [];
      return Promise.resolve(
        new Response(JSON.stringify({ success: true, data: corps }), { status: 200 })
      );
    }
  })
}));

// Le référentiel des saisons est lu à part par l'écran des ouvreurs.
vi.mock('../../../../lib/seasons', () => ({
  fetchSeasons: () => Promise.resolve({ seasons: [{ code: '25-26', active: 1 }], errorMsg: null }),
  currentSeasonCode: (seasons: any[]) => seasons[0]?.code ?? ''
}));

const { GET, POST, ECRANS } = await import('./[screen]');

const TOUS_LES_DROITS = [
  'schedules:slots:read', 'schedules:slots:write',
  'schedules:open-play:read', 'schedules:open-play:write',
  'schedules:registrations:read', 'members:members:read'
];

const locals = (permissions: string[]) => ({ user: { email: 'x@nozaybad.fr', permissions } });

const lire = (screen: string, permissions = TOUS_LES_DROITS) =>
  GET({
    params: { screen },
    locals: locals(permissions),
    request: new Request(`https://admin.nozaybad.fr/admin/api/schedules/${screen}`)
  } as never);

const ecrire = (screen: string, body: unknown, permissions = TOUS_LES_DROITS) =>
  POST({
    params: { screen },
    locals: locals(permissions),
    request: new Request('https://admin.nozaybad.fr/admin/api/schedules/x', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    })
  } as never);

beforeEach(() => {
  appels = [];
  reponse404 = false;
});

describe('relais séances — le drapeau de fonctionnalité', () => {
  /*
   * Le drapeau `OPEN_PLAY_ENABLED` ne vit plus côté administration : c'est l'API qui le
   * porte, et elle répond 404 quand il est baissé. Le relais ne le redouble pas — deux
   * verrous pour une décision se seraient périmés au premier oubli — mais il **traduit**
   * ce 404 en message, ce qui est sa part du travail.
   *
   * L'espace adhérent garde le sien : il annonce une fonctionnalité à des adhérents, là
   * où l'administration ne fait que la tenir.
   */
  it("dit que la fonctionnalité est désactivée quand l'API le signale", async () => {
    reponse404 = true;
    const res = await lire('jeu-libre');
    expect(res.status).toBe(200);
    expect(((await res.json()) as any).data.errorMsg).toContain('désactivées sur cet environnement');
  });

  it('laisse passer les créneaux, qui ne dépendaient pas du drapeau', async () => {
    expect((await lire('schedules')).status).toBe(200);
  });
});

describe('relais séances — les gardes', () => {
  it('garde chaque écran et chaque écriture par une permission', () => {
    for (const [nom, ecran] of Object.entries(ECRANS)) {
      expect(ecran.permission, `écran ${nom}`).toBeTruthy();
      for (const [action, ecriture] of Object.entries(ecran.ecritures ?? {})) {
        expect(ecriture.permission, `${nom}/${action}`).toBeTruthy();
      }
    }
  });

  it('exige un droit distinct pour la liste nominative des inscrits', async () => {
    // La séance est une information de club ; savoir qui vient, avec ses invités non
    // licenciés, est une donnée personnelle.
    const sansInscrits = TOUS_LES_DROITS.filter((p) => p !== 'schedules:registrations:read');
    const res = await ecrire('jeu-libre', { action: 'registrations', id: 3 }, sansInscrits);
    expect(res.status).toBe(403);
    expect(appels).toHaveLength(0);
  });

  it('refuse une action inconnue et un écran inconnu', async () => {
    expect((await ecrire('schedules', { action: 'truncate' })).status).toBe(403);
    expect((await lire('inconnu')).status).toBe(404);
    expect(appels).toHaveLength(0);
  });

  it('valide les identifiants avant de les mettre dans un chemin', async () => {
    for (const corps of [
      { action: 'update', id: 'abc' },
      { action: 'delete', id: 0 }
    ]) {
      appels = [];
      expect((await ecrire('schedules', corps)).status, JSON.stringify(corps)).toBe(400);
      expect(appels).toHaveLength(0);
    }
  });
});

describe('relais séances — les lectures', () => {
  it('ne retient que les créneaux de jeu libre comme trame de séance', async () => {
    // Dérouler un créneau d'école de jeunes en séance de jeu libre n'aurait pas de sens.
    const res = await lire('jeu-libre');
    expect(res.status).toBe(200);
    expect(((await res.json()) as any).data.slots).toEqual([]);
  });

  it("ne lit l'annuaire que si le compte en a le droit", async () => {
    // `communication` tient les séances sans porter `members:members:read`.
    await lire('ouvreurs', TOUS_LES_DROITS.filter((p) => p !== 'members:members:read'));
    expect(appels.some((a) => a.url.includes('/members'))).toBe(false);

    appels = [];
    await lire('ouvreurs');
    expect(appels.some((a) => a.url.includes('/members'))).toBe(true);
  });
});
