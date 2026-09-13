import { describe, it, expect } from 'vitest';
import { GET } from './me';

/**
 * L'identité que l'habillage va chercher lui-même.
 *
 * Elle arrivait en props, du serveur. Cette route est le préalable au `prerender` : une
 * page figée n'a pas de serveur pour les donner, et sans elle la barre latérale
 * s'afficherait sans entrées.
 */
/*
  `APIRoute` déclare `Response | Promise<Response>` ; celle-ci répond de façon synchrone,
  et la lire ainsi évite d'attendre là où il n'y a rien à attendre.
*/
const appeler = (locals: Record<string, unknown>) => GET({ locals } as never) as Response;
const corps = async (res: Response) => ((await res.json()) as any).data;

describe('GET /admin/api/me', () => {
  it("rend ce que le middleware a résolu pour l'appelant", async () => {
    const d = await corps(
      appeler({
        user: { email: 'moi@nozaybad.fr', name: 'Moi', permissions: ['dashboard:overview:read'] },
        realUser: { email: 'moi@nozaybad.fr' }
      })
    );
    expect(d).toEqual({
      email: 'moi@nozaybad.fr',
      name: 'Moi',
      permissions: ['dashboard:overview:read'],
      realEmail: 'moi@nozaybad.fr',
      club: { name: '', shortName: '', brandColor: '', logoUrl: '', features: {}, menuAccounts: [] }
    });
  });

  it('distingue le compte emprunté du compte réel', async () => {
    // C'est la comparaison des deux qui lève le bandeau d'usurpation.
    const d = await corps(
      appeler({
        user: { email: 'cible@nozaybad.fr', permissions: [] },
        realUser: { email: 'admin@nozaybad.fr' }
      })
    );
    expect(d.email).toBe('cible@nozaybad.fr');
    expect(d.realEmail).toBe('admin@nozaybad.fr');
  });

  it("n'exige aucun droit", async () => {
    /*
      Elle ne dit rien de personne d'autre : exiger une permission pour lire sa propre
      identité empêcherait un compte sans aucun droit de voir ne serait-ce que son nom —
      et donc d'afficher le bandeau qui lui permet de sortir d'une usurpation.
    */
    const res = appeler({ user: { email: 'x@nozaybad.fr', permissions: [] }, realUser: null });
    expect(res.status).toBe(200);
    expect((await corps(res)).permissions).toEqual([]);
  });

  it('ne se met jamais en cache', async () => {
    // C'est une donnée par personne : un intermédiaire qui la garderait la servirait à
    // quelqu'un d'autre.
    const res = appeler({ user: { email: 'x@nozaybad.fr', permissions: [] } });
    expect(res.headers.get('Cache-Control')).toBe('private, no-store');
  });

  it('reste lisible quand le middleware n’a rien posé', async () => {
    const d = await corps(appeler({}));
    expect(d).toEqual({
      email: '',
      name: null,
      permissions: [],
      realEmail: '',
      club: { name: '', shortName: '', brandColor: '', logoUrl: '', features: {}, menuAccounts: [] }
    });
  });
});
