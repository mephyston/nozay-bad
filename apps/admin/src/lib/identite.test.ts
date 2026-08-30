import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';

/**
 * Le cache d'identité.
 *
 * Sans lui, chaque chargement de page appelait `/admin/api/me` — cent-trois appels
 * mesurés sur une session de navigation. C'est l'invocation la moins chère du système,
 * mais c'en est une par page, et depuis que les écrans sont figés elle pèse dans le
 * compte.
 */

const IDENTITE = {
  email: 'moi@nozaybad.fr',
  name: 'Moi',
  permissions: ['dashboard:overview:read'],
  realEmail: 'moi@nozaybad.fr'
};

let appels = 0;

/** Le module garde un état ; chaque test le recharge pour partir propre. */
async function neuf() {
  vi.resetModules();
  return import('./identite');
}

beforeEach(() => {
  appels = 0;
  localStorage.clear();
  vi.stubGlobal('fetch', () => {
    appels += 1;
    return Promise.resolve(
      new Response(JSON.stringify({ success: true, data: IDENTITE }), { status: 200 })
    );
  });
});

afterEach(() => vi.unstubAllGlobals());

describe('identité mutualisée', () => {
  it("n'appelle qu'une fois, même demandée par plusieurs composants", async () => {
    const { chargerIdentite } = await neuf();
    const [a, b, c] = await Promise.all([chargerIdentite(), chargerIdentite(), chargerIdentite()]);
    expect(appels).toBe(1);
    expect(a).toEqual(IDENTITE);
    expect(b).toEqual(c);
  });

  it("n'appelle pas quand la garde est encore fraîche", async () => {
    // Le cas courant : on navigue, la page se recharge, les droits n'ont pas changé.
    const premier = await neuf();
    await premier.chargerIdentite();
    expect(appels).toBe(1);

    const second = await neuf();
    expect(await second.chargerIdentite()).toEqual(IDENTITE);
    expect(appels, 'la garde fraîche évite le second appel').toBe(1);
  });

  it('rappelle la route quand la garde a vieilli', async () => {
    const premier = await neuf();
    await premier.chargerIdentite();

    // Six minutes plus tard : au-delà de la fenêtre de fraîcheur.
    const vieux = JSON.parse(localStorage.getItem('admin_identite')!);
    vieux.t = Date.now() - 6 * 60 * 1000;
    localStorage.setItem('admin_identite', JSON.stringify(vieux));

    const second = await neuf();
    await second.chargerIdentite();
    expect(appels).toBe(2);
  });

  it("rend le dernier état connu plutôt que rien quand la route échoue", async () => {
    /*
      Perdre son menu parce que le réseau a hoqueté serait pire que de l'afficher un
      instant de trop : l'API reste l'autorité, ici on ne fait qu'afficher.
    */
    const premier = await neuf();
    await premier.chargerIdentite();
    const vieux = JSON.parse(localStorage.getItem('admin_identite')!);
    vieux.t = 0;
    localStorage.setItem('admin_identite', JSON.stringify(vieux));

    vi.stubGlobal('fetch', () => Promise.reject(new Error('réseau')));
    const second = await neuf();
    expect(await second.chargerIdentite()).toEqual(IDENTITE);
  });

  it('accepte une garde écrite avant la fenêtre de fraîcheur', async () => {
    // Forme antérieure, sans horodatage : traitée comme périmée, pas rejetée.
    localStorage.setItem('admin_identite', JSON.stringify(IDENTITE));
    const { derniereIdentite, chargerIdentite } = await neuf();
    expect(derniereIdentite()).toEqual(IDENTITE);
    await chargerIdentite();
    expect(appels, 'périmée, donc rafraîchie').toBe(1);
  });
});
