import { describe, it, expect, beforeEach, vi } from 'vitest';

/**
 * Le relais du domaine « interclubs ».
 *
 * Deux choses s'y jouent qui ne se voient pas à l'œil : la **résolution de la saison**,
 * dont dépend tout ce qu'affichent ces écrans, et la **séparation des deux panneaux de
 * réglages** — celui des règlements ne doit pas pouvoir toucher à la date de référence
 * des classements, alors qu'ils publient la même action.
 */

let appels: { url: string; init?: RequestInit }[] = [];
let saisons = [{ code: '25-26', active: 1 }, { code: '24-25', active: 0 }];

vi.mock('../../../../lib/api', () => ({
  createAdminApiClient: () => ({
    fetch: (url: string, init?: RequestInit) => {
      appels.push({ url, init });
      const chemin = url.replace('http://localhost', '');
      // La forme compte : les chargeurs enchaînent `.map()` et `.some()` sur ce qu'ils
      // reçoivent, et un mock uniforme validerait du code qui casse en production.
      const corps = chemin.startsWith('/teams/days')
        ? { days: [{ number: 3 }, { number: 4 }] }
        : chemin.startsWith('/teams?')
          ? { teams: [] }
          : chemin.startsWith('/teams/championship-settings')
            ? { items: [] }
            : [];
      return Promise.resolve(
        new Response(JSON.stringify({ success: true, data: corps }), { status: 200 })
      );
    }
  })
}));

vi.mock('../../../../lib/seasons', () => ({
  fetchSeasons: () => Promise.resolve({ seasons: saisons, errorMsg: null }),
  currentSeasonCode: (liste: any[]) => liste.find((s) => s.active)?.code ?? ''
}));

const { GET, POST, ECRANS } = await import('./[screen]');

const TOUS_LES_DROITS = [
  'teams:teams:read', 'teams:teams:write', 'teams:teams:delete',
  'teams:rankings:read', 'teams:rankings:write', 'teams:rankings:import',
  'teams:lineups:read', 'teams:lineups:write'
];
const locals = (permissions: string[]) => ({ user: { email: 'x@nozaybad.fr', permissions } });

const lire = (screen: string, recherche = '', permissions = TOUS_LES_DROITS) =>
  GET({
    params: { screen },
    locals: locals(permissions),
    request: new Request(`https://admin.nozaybad.fr/admin/api/teams/${screen}${recherche}`)
  } as never);

const ecrire = (screen: string, body: unknown, permissions = TOUS_LES_DROITS) =>
  POST({
    params: { screen },
    locals: locals(permissions),
    request: new Request('https://admin.nozaybad.fr/admin/api/teams/x', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    })
  } as never);

const donnees = async (res: Response) => ((await res.json()) as any).data;

beforeEach(() => {
  appels = [];
  saisons = [{ code: '25-26', active: 1 }, { code: '24-25', active: 0 }];
});

describe('relais interclubs — les gardes', () => {
  it('garde chaque écran et chaque écriture par une permission', () => {
    for (const [nom, ecran] of Object.entries(ECRANS)) {
      expect(ecran.permission, `écran ${nom}`).toBeTruthy();
      for (const [action, ecriture] of Object.entries(ecran.ecritures ?? {})) {
        expect(ecriture.permission, `${nom}/${action}`).toBeTruthy();
      }
    }
  });

  it("n'accorde pas la suppression à qui sait seulement écrire", async () => {
    const res = await ecrire('teams', { action: 'delete-team', teamId: 2 },
      TOUS_LES_DROITS.filter((p) => p !== 'teams:teams:delete'));
    expect(res.status).toBe(403);
    expect(appels).toHaveLength(0);
  });

  it('valide les identifiants avant de les mettre dans un chemin', async () => {
    for (const corps of [
      { action: 'delete-team', teamId: 'abc' },
      { action: 'save-team-roster', teamId: 0, licences: [] },
      { action: 'notify-captain', teamId: 4, dayNumber: 'x' }
    ]) {
      appels = [];
      const ecran = corps.action === 'notify-captain' ? 'journees' : 'teams';
      expect((await ecrire(ecran, corps)).status, JSON.stringify(corps)).toBe(400);
      expect(appels, JSON.stringify(corps)).toHaveLength(0);
    }
  });
});

describe('relais interclubs — la saison', () => {
  it("prend celle de l'URL quand elle est donnée", async () => {
    const d = await donnees(await lire('teams', '?season=24-25'));
    expect(d.seasonCode).toBe('24-25');
    expect(appels.some((a) => a.url.includes('seasonCode=24-25'))).toBe(true);
  });

  it('retombe sur celle qui court quand l’URL n’en fixe aucune', async () => {
    const d = await donnees(await lire('teams'));
    expect(d.seasonCode).toBe('25-26');
  });

  it('rend la liste des saisons, dont le sélecteur a besoin', async () => {
    // Sans elle, le sélecteur afficherait « aucune » sur une page pourtant remplie.
    const d = await donnees(await lire('classements'));
    expect(d.seasons).toHaveLength(2);
  });

  it("ne lit rien et n'échoue pas quand aucune saison n'est ouverte", async () => {
    saisons = [];
    const d = await donnees(await lire('teams'));
    expect(d.seasonCode).toBe('');
    expect(d.teams).toEqual([]);
    expect(appels.some((a) => a.url.includes('/teams?'))).toBe(false);
  });

  it('refuse une écriture sans saison, plutôt que d’en inventer une', async () => {
    /*
      Créer une équipe en saison `''` la rend invisible dans la liste, et surtout la place
      hors de la contrainte d'unicité (saison, championnat, numéro) qui porte la hiérarchie
      du club.
    */
    const res = await ecrire('teams', { action: 'save-team', number: 1 });
    expect(res.status).toBe(400);
    expect(appels).toHaveLength(0);
  });
});

describe('relais interclubs — le championnat et la journée', () => {
  it('ramène un championnat inconnu sur la valeur par défaut', async () => {
    const d = await donnees(await lire('teams', '?championship=../members'));
    expect(d.daysChampionship).toBe('icd_mixte');
    expect(appels.every((a) => !a.url.includes('../members'))).toBe(true);
  });

  it('retombe sur la première journée quand celle demandée n’existe pas', async () => {
    // Le mock ne connaît que les journées 3 et 4 : afficher un tableau vide sans rien
    // expliquer serait pire que de montrer la première.
    const d = await donnees(await lire('journees', '?day=9'));
    expect(d.dayNumber).toBe(3);
    expect(appels.some((a) => a.url.includes('day=3'))).toBe(true);
  });

  it('respecte une journée qui existe', async () => {
    const d = await donnees(await lire('journees', '?day=4'));
    expect(d.dayNumber).toBe(4);
  });
});

describe('relais interclubs — les deux panneaux de réglages', () => {
  /*
   * Les deux écrans publient `save-championship-settings` dans la même table. Celui des
   * règlements ne touche qu'au lien ; laisser passer `referenceEloDate` depuis lui
   * permettrait d'écraser la date de référence des classements depuis un écran qui n'est
   * pas censé la connaître.
   */
  const corps = {
    action: 'save-championship-settings',
    seasonCode: '25-26',
    championship: 'icd_mixte',
    rulesUrl: 'https://exemple.fr/reglement.pdf',
    referenceEloDate: '2026-01-15'
  };

  it('laisse les classements régler la date de référence', async () => {
    await ecrire('classements', corps);
    expect(JSON.parse(String(appels[0].init?.body))).toHaveProperty('referenceEloDate', '2026-01-15');
  });

  it('ne laisse pas les règlements y toucher', async () => {
    await ecrire('reglements', corps);
    const envoye = JSON.parse(String(appels[0].init?.body));
    expect(envoye).not.toHaveProperty('referenceEloDate');
    expect(envoye).toHaveProperty('rulesUrl', 'https://exemple.fr/reglement.pdf');
  });

  it('ne relaie que les disciplines réellement corrigées', async () => {
    /*
      Le handler fait des mises à jour partielles, et une clé à `null` y signifie « non
      compétiteur » : recopier les six disciplines en dur effacerait celles qu'on ne
      touchait pas.
    */
    await ecrire('classements', {
      action: 'save-ranking',
      licence: '01234567',
      eloDate: '2026-01-15',
      singles: 900,
      cpphMixed: null
    });
    expect(appels[0].url).toBe('http://localhost/teams/rankings/01234567');
    expect(JSON.parse(String(appels[0].init?.body))).toEqual({
      eloDate: '2026-01-15',
      singles: 900,
      cpphMixed: null
    });
  });

  it('refuse une correction sans licence', async () => {
    const res = await ecrire('classements', { action: 'save-ranking', eloDate: '2026-01-15' });
    expect(res.status).toBe(400);
    expect(appels).toHaveLength(0);
  });
});
