import { describe, it, expect } from 'vitest';
import { PAGES_AVEC_ECRITURE, accepteEcriture } from './page-writes';

/**
 * Garde-fou bidirectionnel sur les écritures visant une page.
 *
 * Il ferme une panne silencieuse : Astro répond à un `POST` visant une page **sans
 * gestionnaire** en rendant son HTML avec un 200. Le composant qui l'a postée croit donc
 * avoir enregistré, affiche un succès, et rien n'a bougé.
 *
 * Les deux sens comptent. Une page qui déclare un gestionnaire sans figurer dans la liste
 * serait refusée en 405 alors qu'elle fonctionne ; une page qui y figure sans en déclarer
 * un laisserait le silence revenir.
 */

/*
  Les pages sont lues par le globbing de Vite, et non par le système de fichiers : les
  tests tournent dans le pool `workers`, qui n'en a pas d'utilisable.
*/
const SOURCES = import.meta.glob('../pages/admin/**/*.astro', {
  query: '?raw',
  import: 'default',
  eager: true
}) as Record<string, string>;

/** La route servie par un fichier de page, telle que le middleware la verra. */
function routeDe(chemin: string): string {
  return chemin
    .replace('../pages', '')
    .replace(/\.astro$/, '')
    .replace(/\/index$/, '');
}

const declarantUnPost = Object.entries(SOURCES)
  .filter(([, source]) => source.includes("Astro.request.method === 'POST'"))
  .map(([chemin]) => routeDe(chemin))
  .sort();

describe('pages acceptant une écriture', () => {
  it('la liste correspond exactement aux gestionnaires déclarés', () => {
    /*
      En cas d'échec : soit une page a perdu son gestionnaire au profit d'un relais — la
      retirer de `PAGES_AVEC_ECRITURE` —, soit une page en a gagné un — l'y ajouter, en se
      demandant d'abord si un relais ne serait pas préférable.
    */
    expect(declarantUnPost).toEqual([...PAGES_AVEC_ECRITURE].sort());
  });

  it('laisse passer les lectures partout', () => {
    for (const methode of ['GET', 'HEAD', 'OPTIONS', 'get']) {
      expect(accepteEcriture('/admin/accounting', methode), methode).toBe(true);
    }
  });

  it('refuse une écriture vers une page convertie', () => {
    // Le cas vécu : le budget prévisionnel postait vers sa page, qui répondait 200 en
    // rendant son HTML.
    expect(accepteEcriture('/admin/accounting/reports/forecast', 'POST')).toBe(false);
    expect(accepteEcriture('/admin/website/menus', 'POST')).toBe(false);
    expect(accepteEcriture('/admin/teams', 'POST')).toBe(false);
    // Converties dans la foulée : la boutique et les adhérents.
    expect(accepteEcriture('/admin/shop/orders', 'POST')).toBe(false);
    expect(accepteEcriture('/admin/members', 'POST')).toBe(false);
  });

  it('laisse écrire les pages qui le déclarent encore', () => {
    expect(accepteEcriture('/admin/iam', 'POST')).toBe(true);
    expect(accepteEcriture('/admin/settings/seasons', 'POST')).toBe(true);
  });

  it('ignore une barre oblique finale', () => {
    // `/admin/expenses/` et `/admin/expenses` sont la même page.
    expect(accepteEcriture('/admin/expenses/', 'POST')).toBe(true);
  });

  it('refuse aussi les autres méthodes modifiantes', () => {
    for (const methode of ['PUT', 'PATCH', 'DELETE']) {
      expect(accepteEcriture('/admin/accounting', methode), methode).toBe(false);
    }
  });
});
