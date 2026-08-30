import { describe, it, expect, beforeEach, vi } from 'vitest';

/**
 * Le relais de la rubrique CMS est la seule porte entre le navigateur et l'API interne
 * pour ces six écrans : ce qu'il laisse passer, personne d'autre ne le filtre.
 *
 * Les routes sous `/admin/api/` échappent à `PAGE_PERMISSIONS` — c'est voulu, elles ne
 * sont pas des pages — mais cela veut dire qu'une écriture ajoutée à la table sans
 * permission serait ouverte à tout compte capable d'atteindre l'administration. Le
 * premier test ci-dessous ferme cette porte pour les écrans à venir comme pour ceux-ci.
 */

/** Ce que le relais a demandé à l'API interne pendant le test. */
let appels: { url: string; init?: RequestInit }[] = [];
/** Ce que l'API interne répond ; réglable par test, et fonction du chemin appelé. */
let reponse: (url: string) => Response;

vi.mock('../../../../lib/api', () => ({
  createAdminApiClient: () => ({
    fetch: (url: string, init?: RequestInit) => {
      appels.push({ url, init });
      return Promise.resolve(reponse(url));
    }
  })
}));

const { GET, POST, ECRANS } = await import('./[screen]');

const TOUS_LES_DROITS = [
  'cms:pages:read', 'cms:pages:write', 'cms:pages:delete',
  'cms:posts:read', 'cms:posts:write', 'cms:posts:delete',
  'cms:media:read', 'cms:media:write', 'cms:media:delete',
  'cms:nav:read', 'cms:nav:write',
  'notifications:messages:send'
];

const locals = (permissions: string[]) => ({ user: { email: 'x@nozaybad.fr', permissions } });

const lire = (screen: string, permissions = TOUS_LES_DROITS, recherche = '') =>
  GET({
    params: { screen },
    locals: locals(permissions),
    request: new Request(`https://admin.nozaybad.fr/admin/api/cms/${screen}${recherche}`)
  } as never);

const ecrire = (screen: string, body: unknown, permissions = TOUS_LES_DROITS) =>
  POST({
    params: { screen },
    locals: locals(permissions),
    request: new Request('https://admin.nozaybad.fr/admin/api/cms/x', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    })
  } as never);

/**
 * Réponses de l'API interne, à la forme que le relais attend réellement.
 *
 * Un mock qui rend `{}` pour tout ferait passer des tests sur du code qui casserait en
 * production : les chargeurs enchaînent `.map()` sur ce qu'ils reçoivent, et une forme
 * fausse ne se verrait qu'à l'usage.
 */
function reponseParDefaut(url: string): Response {
  const chemin = url.replace('http://localhost', '');
  const corps =
    /^\/cms\/pages\/\d+$/.test(chemin)
      ? { page: { id: 12, title: 'Accueil', path: '/accueil' }, blocks: [] }
      : chemin.startsWith('/cms/posts')
        ? { posts: [] }
        : chemin === '/cms/settings'
          ? {}
          : [];
  return new Response(JSON.stringify({ success: true, data: corps }), { status: 200 });
}

beforeEach(() => {
  appels = [];
  reponse = reponseParDefaut;
});

describe('relais CMS — la table', () => {
  it('garde chaque écran en lecture et chaque écriture par une permission', () => {
    for (const [nom, ecran] of Object.entries(ECRANS)) {
      expect(ecran.permission, `écran ${nom} : lecture non gardée`).toBeTruthy();
      for (const [action, ecriture] of Object.entries(ecran.ecritures ?? {})) {
        expect(ecriture.permission, `${nom}/${action} : écriture non gardée`).toBeTruthy();
      }
      if (ecran.depot) expect(ecran.depot.permission, `${nom} : dépôt non gardé`).toBeTruthy();
    }
  });

  it('ne déclare de dépôt de fichier que là où on en dépose', () => {
    // Accepter un multipart ailleurs ouvrirait un second chemin vers `/cms/media`, avec
    // le droit de l'écran hôte et non celui de la médiathèque.
    const avecDepot = Object.entries(ECRANS).filter(([, e]) => e.depot).map(([nom]) => nom);
    expect(avecDepot).toEqual(['media']);
  });
});

describe('relais CMS — lecture', () => {
  it("répond 404 à un écran qui n'existe pas", async () => {
    const res = await lire('inconnu');
    expect(res.status).toBe(404);
    expect(appels).toHaveLength(0);
  });

  it('refuse la lecture au compte qui n’a pas le droit', async () => {
    const res = await lire('posts', ['cms:pages:read']);
    expect(res.status).toBe(403);
    // Le refus précède l'appel : rien n'est lu avant d'avoir vérifié le droit.
    expect(appels).toHaveLength(0);
  });
});

describe('relais CMS — écriture', () => {
  it("refuse une action absente de la table sans appeler l'API", async () => {
    const res = await ecrire('pages', { action: 'drop', id: 1 });
    expect(res.status).toBe(403);
    expect(appels).toHaveLength(0);
  });

  it('refuse une action empruntée au prototype', async () => {
    // `'constructor' in ecritures` est vrai par héritage : la table se lit avec
    // `Object.hasOwn`, sans quoi ce nom franchirait la garde.
    const res = await ecrire('pages', { action: 'constructor' });
    expect(res.status).toBe(403);
    expect(appels).toHaveLength(0);
  });

  it('exige le droit propre à l’action, et non celui de l’écran', async () => {
    // Lire et écrire les pages ne suffit pas à en supprimer une.
    const res = await ecrire('pages', { action: 'delete', id: 3 }, ['cms:pages:read', 'cms:pages:write']);
    expect(res.status).toBe(403);
    expect(appels).toHaveLength(0);
  });

  it('transmet l’écriture autorisée à l’API interne', async () => {
    const res = await ecrire('redirects', { action: 'create', fromPath: '/a', toPath: '/b', note: null });
    expect(res.status).toBe(200);
    expect(appels).toHaveLength(1);
    expect(appels[0].url).toBe('http://localhost/cms/redirects');
    expect(appels[0].init?.method).toBe('POST');
    expect(JSON.parse(String(appels[0].init?.body))).toEqual({ fromPath: '/a', toPath: '/b', note: null });
  });

  it('rend l’échec de l’API tel quel, statut compris', async () => {
    // Les composants lisent `error` dans le corps pour l'afficher : réécrire l'enveloppe
    // ici obligerait à la maintenir en double.
    reponse = () => new Response(JSON.stringify({ error: 'Titre déjà pris.' }), { status: 409 });
    const res = await ecrire('pages', { action: 'create', title: 'Accueil' });
    expect(res.status).toBe(409);
    expect(((await res.json()) as { error: string }).error).toBe('Titre déjà pris.');
  });
});

describe('relais CMS — le pont générique des menus', () => {
  /*
   * Les menus s'écrivent par un pont qui relaie un chemin fourni par le client : c'est
   * la seule écriture de la rubrique dont la destination n'est pas fixée par le serveur.
   * Sans liste fermée, cet écran serait un proxy ouvert vers toute l'API interne — un
   * `path` de `/members` suffirait à lire ou modifier l'annuaire avec la clé du worker.
   */
  it('accepte les chemins de la navigation', async () => {
    for (const path of ['/cms/nav', '/cms/nav/12', '/cms/nav/reorder']) {
      appels = [];
      const res = await ecrire('menus', { action: 'proxy', path, method: 'POST', payload: {} });
      expect(res.status, path).toBe(200);
      expect(appels[0].url).toBe(`http://localhost${path}`);
    }
  });

  it('refuse un chemin étranger à la navigation', async () => {
    for (const path of ['/members', '/cms/nav/../members', '/cms/navette', '/cms/nav/12/../../members']) {
      appels = [];
      const res = await ecrire('menus', { action: 'proxy', path, method: 'POST', payload: {} });
      expect(res.status, path).toBe(400);
      expect(appels, path).toHaveLength(0);
    }
  });

  it('refuse une méthode hors de la liste', async () => {
    const res = await ecrire('menus', { action: 'proxy', path: '/cms/nav', method: 'GET' });
    expect(res.status).toBe(400);
    expect(appels).toHaveLength(0);
  });
});

describe('relais CMS — dépôt de fichier', () => {
  function deposer(screen: string, permissions = TOUS_LES_DROITS) {
    const form = new FormData();
    form.append('alt', 'une photo');
    return POST({
      params: { screen },
      locals: locals(permissions),
      request: new Request('https://admin.nozaybad.fr/admin/api/cms/x', { method: 'POST', body: form })
    } as never);
  }

  it('porte le dépôt vers la médiathèque', async () => {
    const res = await deposer('media');
    expect(res.status).toBe(200);
    expect(appels[0].url).toBe('http://localhost/cms/media');
  });

  it('exige le droit de déposer', async () => {
    const res = await deposer('media', ['cms:media:read', 'cms:media:delete']);
    expect(res.status).toBe(403);
    expect(appels).toHaveLength(0);
  });

  it('refuse un fichier à un écran qui n’en reçoit pas', async () => {
    const res = await deposer('posts');
    expect(res.status).toBe(400);
    expect(appels).toHaveLength(0);
  });
});

describe("relais CMS — l'écran paramétré", () => {
  /*
   * L'éditeur d'une page est le seul écran qui porte sur un objet précis : son
   * identifiant vient du client, en lecture comme en écriture, et rejoint directement un
   * chemin d'API. Interpolé sans contrôle, il ferait de chaque écriture un chemin
   * arbitraire — d'où une validation, et ces tests pour la tenir.
   */
  it('charge la page demandée', async () => {
    const res = await lire('page', TOUS_LES_DROITS, '?id=12');
    expect(res.status).toBe(200);
    expect(appels.map((a) => a.url)).toContain('http://localhost/cms/pages/12');
  });

  it("refuse une lecture sans identifiant, sans appeler l'API", async () => {
    const res = await lire('page');
    expect(res.status).toBe(400);
    expect(appels).toHaveLength(0);
  });

  it('refuse un identifiant qui n’en est pas un', async () => {
    for (const valeur of ['0', '-3', 'abc', '1.5', '../members', '1e999']) {
      appels = [];
      const res = await lire('page', TOUS_LES_DROITS, `?id=${encodeURIComponent(valeur)}`);
      expect(res.status, valeur).toBe(400);
      expect(appels, valeur).toHaveLength(0);
    }
  });

  it('exige un identifiant valable à l’écriture aussi', async () => {
    for (const corps of [
      { action: 'saveBlocks', id: 'abc', blocks: [] },
      { action: 'publish', published: true },
      { action: 'updateMeta', id: 0, title: 'x' }
    ]) {
      appels = [];
      const res = await ecrire('page', corps);
      expect(res.status, JSON.stringify(corps)).toBe(400);
      expect(appels, JSON.stringify(corps)).toHaveLength(0);
    }
  });

  it('valide aussi le numéro de version restaurée', async () => {
    // Deux identifiants dans le même chemin : le second se contrôle comme le premier.
    const res = await ecrire('page', { action: 'restore', id: 4, revisionId: 'x' });
    expect(res.status).toBe(400);
    expect(appels).toHaveLength(0);
  });

  it('transmet une restauration valable', async () => {
    const res = await ecrire('page', { action: 'restore', id: 4, revisionId: 9 });
    expect(res.status).toBe(200);
    expect(appels[0].url).toBe('http://localhost/cms/pages/4/revisions/9/restore');
  });
});
