import type { APIRoute } from 'astro';
import type { Permission } from '@nba/iam-ui';
import { can } from '../../../../lib/guard';
import { createAdminApiClient } from '../../../../lib/api';

/**
 * Le relais des écrans du CMS.
 *
 * Un seul point d'entrée pour toute la rubrique plutôt qu'un fichier par écran : la
 * table ci-dessous est alors **la** surface d'audit — un endroit unique où lire ce que
 * l'administration expose au navigateur, quelle permission garde chaque écran en
 * lecture, et quelle permission garde chacune de ses écritures. Onze gardes disséminées
 * se relisent mal ; celle-ci se relit d'un coup d'œil.
 *
 * Le worker reste le relais qu'il était : il détient `INTERNAL_API_KEY`, affirme
 * l'identité tirée du jeton Cloudflare Access, et ne rend plus de HTML. Ce qu'il expose
 * ici, ce sont les mêmes lectures et les mêmes écritures qu'il servait depuis les pages
 * — ni plus, ni moins.
 *
 * Les routes sous `/admin/api/` échappent à `PAGE_PERMISSIONS` (cf. `isPageRoute`) :
 * chaque écran répond donc de sa propre garde, et `[screen].test.ts` vérifie qu'aucun
 * n'en manque, ni en lecture ni en écriture.
 *
 * ## Pourquoi les écritures ont quitté les pages
 *
 * Elles vivaient dans le `POST` de chaque page, et les composants publiaient vers l'URL
 * courante — `fetch('')`. Cela tenait tant qu'un composant n'était utilisé que par sa
 * propre page. Ce n'était déjà plus vrai du dépôt de fichier : le sélecteur de médias
 * s'ouvre depuis les actualités et depuis l'éditeur de pages, si bien que **trois**
 * écrans avaient dû apprendre à lire un `multipart/form-data` pour que le même bouton
 * fonctionne partout. En nommant la destination, le dépôt s'adresse à la médiathèque
 * depuis n'importe quel hôte, et ce couplage disparaît.
 */

type Lecteur = (chemin: string) => Promise<any>;

/** Appel à faire à l'API interne pour honorer une écriture. */
interface Appel {
  chemin: string;
  method: string;
  body?: unknown;
}

/**
 * Entrée du client jugée irrecevable.
 *
 * Distinct d'un refus de permission : l'utilisateur a le droit d'écrire, c'est la
 * requête qui est mal formée. Répondre 400, et non 403.
 */
class Refus extends Error {}

interface Ecriture {
  permission: Permission;
  /** Construit l'appel API ; lève `Refus` pour rejeter une entrée mal formée. */
  route: (data: any) => Appel;
}

interface Ecran {
  /** Droit exigé pour lire l'écran. */
  permission: Permission;
  charger: (lire: Lecteur, locals: App.Locals) => Promise<Record<string, unknown>>;
  /** Écritures acceptées, par nom d'action. Une action absente d'ici est refusée. */
  ecritures?: Record<string, Ecriture>;
  /** Dépôt de fichier, qui arrive en multipart et n'a donc pas de nom d'action. */
  depot?: { permission: Permission; chemin: string };
}

export const ECRANS: Record<string, Ecran> = {
  menus: {
    permission: 'cms:pages:read',
    charger: async (lire, locals) => {
      const [header, footer, legal, pages] = await Promise.all([
        lire('/cms/nav?location=header'),
        lire('/cms/nav?location=footer'),
        lire('/cms/nav?location=legal'),
        lire('/cms/pages')
      ]);
      return {
        header: header ?? [],
        footer: footer ?? [],
        legal: legal ?? [],
        pages: pages ?? [],
        canWrite: can(locals, 'cms:pages:write')
      };
    },
    ecritures: {
      /*
       * Les menus s'écrivent par un pont générique — créer, modifier, supprimer et
       * réordonner visent la même famille de chemins. Le chemin est donc validé contre
       * une liste fermée : le relayer tel quel ferait de cet écran un proxy ouvert vers
       * toute l'API interne.
       */
      proxy: {
        permission: 'cms:pages:write',
        route: (data) => {
          const autorise = /^\/cms\/nav(\/reorder|\/\d+)?$/;
          if (typeof data.path !== 'string' || !autorise.test(data.path)) {
            throw new Refus('Chemin non autorisé.');
          }
          if (!['POST', 'PUT', 'DELETE'].includes(data.method)) {
            throw new Refus('Méthode non autorisée.');
          }
          return { chemin: data.path, method: data.method, body: data.payload };
        }
      }
    }
  },

  footer: {
    permission: 'cms:pages:read',
    charger: async (lire, locals) => ({
      settings: (await lire('/cms/settings')) ?? {},
      canWrite: can(locals, 'cms:pages:write')
    }),
    ecritures: {
      save: {
        permission: 'cms:pages:write',
        route: (data) => ({
          chemin: '/cms/settings',
          method: 'PUT',
          body: {
            footerDescription: String(data.footerDescription ?? ''),
            footerAddress: String(data.footerAddress ?? ''),
            instagramUrl: String(data.instagramUrl ?? ''),
            facebookUrl: String(data.facebookUrl ?? '')
          }
        })
      }
    }
  },

  pages: {
    permission: 'cms:pages:read',
    charger: async (lire, locals) => ({
      pages: (await lire('/cms/pages')) ?? [],
      canWrite: can(locals, 'cms:pages:write'),
      canDelete: can(locals, 'cms:pages:delete')
    }),
    ecritures: {
      create: {
        permission: 'cms:pages:write',
        route: (data) => ({ chemin: '/cms/pages', method: 'POST', body: { title: data.title } })
      },
      delete: {
        permission: 'cms:pages:delete',
        route: (data) => ({ chemin: `/cms/pages/${data.id}`, method: 'DELETE' })
      }
    }
  },

  redirects: {
    permission: 'cms:nav:read',
    charger: async (lire, locals) => ({
      redirects: (await lire('/cms/redirects/all')) ?? [],
      canWrite: can(locals, 'cms:nav:write')
    }),
    ecritures: {
      create: {
        permission: 'cms:nav:write',
        route: (data) => ({
          chemin: '/cms/redirects',
          method: 'POST',
          body: { fromPath: data.fromPath, toPath: data.toPath, note: data.note }
        })
      },
      update: {
        permission: 'cms:nav:write',
        route: (data) => ({
          chemin: `/cms/redirects/${data.id}`,
          method: 'PUT',
          body: { toPath: data.toPath, note: data.note }
        })
      },
      delete: {
        permission: 'cms:nav:write',
        route: (data) => ({ chemin: `/cms/redirects/${data.id}`, method: 'DELETE' })
      }
    }
  },

  posts: {
    permission: 'cms:posts:read',
    charger: async (lire, locals) => {
      /*
        La médiathèque, les catégories et les cibles de liens alimentent le formulaire —
        couverture, insertion de fichier, rattachement, lien interne. Chargées avec la
        liste et non à l'ouverture du panneau : le formulaire s'ouvre alors sans attente,
        et l'échec de l'une n'empêche pas d'écrire.
      */
      const [reponse, media, categories, pages, events] = await Promise.all([
        lire('/cms/posts?limit=100'),
        lire('/cms/media?limit=200'),
        lire('/cms/post-categories'),
        lire('/cms/pages'),
        // Seulement les rendez-vous à venir : rattacher une actualité au stage de l'an
        // dernier n'a pas de sens, et la liste déroulante reste lisible.
        lire('/events?limit=50')
      ]);

      const articles = reponse?.posts ?? [];
      const cible = (row: any, kind: 'page' | 'post') => ({
        path: row.path,
        title: row.title,
        kind,
        status: row.status
      });

      return {
        posts: articles,
        media: media ?? [],
        categories: categories ?? [],
        events: events ?? [],
        // Les pages d'abord : ce sont les destinations les plus courantes d'un lien.
        targets: [
          ...(pages ?? []).map((row: any) => cible(row, 'page')),
          ...articles.map((row: any) => cible(row, 'post'))
        ],
        canWrite: can(locals, 'cms:posts:write'),
        canDelete: can(locals, 'cms:posts:delete'),
        canUploadMedia: can(locals, 'cms:media:write'),
        canNotify: can(locals, 'notifications:messages:send')
      };
    },
    ecritures: {
      create: {
        permission: 'cms:posts:write',
        route: (data) => ({
          chemin: '/cms/posts',
          method: 'POST',
          body: {
            title: data.title,
            excerpt: data.excerpt || undefined,
            bodyHtml: data.bodyHtml,
            coverMediaId: data.coverMediaId,
            categoryIds: data.categoryIds,
            visibility: data.visibility,
            // Même règle que `coverMediaId` : le formulaire envoie toujours la valeur,
            // `null` détachant l'événement.
            eventId: data.eventId,
            // Date de publication saisie à la main. Le formulaire l'omet à la création
            // quand elle est vide — c'est l'absence qui fait naître un brouillon — et
            // l'envoie toujours en modification, `null` la retirant.
            publishedAt: data.publishedAt
          }
        })
      },
      update: {
        permission: 'cms:posts:write',
        // `excerpt` vidé doit effacer le chapô : on envoie `null`, pas `undefined`,
        // que le validateur traiterait comme « champ absent, ne rien changer ».
        //
        // Même raison pour `coverMediaId`, que le formulaire envoie toujours : `null`
        // quand la couverture a été retirée, un identifiant sinon. Ces deux champs, avec
        // `categoryIds`, étaient jusqu'ici **absents du corps transmis** — le formulaire
        // les envoyait, ce pont les jetait, et ni la couverture ni les rubriques
        // n'étaient jamais enregistrées.
        route: (data) => ({
          chemin: `/cms/posts/${data.id}`,
          method: 'PUT',
          body: {
            title: data.title,
            excerpt: data.excerpt || null,
            bodyHtml: data.bodyHtml,
            coverMediaId: data.coverMediaId,
            categoryIds: data.categoryIds,
            visibility: data.visibility,
            eventId: data.eventId,
            publishedAt: data.publishedAt
          }
        })
      },
      publish: {
        permission: 'cms:posts:write',
        route: (data) => ({
          chemin: `/cms/posts/${data.id}/publish`,
          method: 'POST',
          body: { published: data.published }
        })
      },
      delete: {
        permission: 'cms:posts:delete',
        route: (data) => ({ chemin: `/cms/posts/${data.id}`, method: 'DELETE' })
      },
      // Faire sonner les téléphones du club relève du même droit que l'envoi depuis
      // l'écran Notifications, et non de la rédaction.
      notify: {
        permission: 'notifications:messages:send',
        route: (data) => ({ chemin: `/cms/posts/${data.id}/notify`, method: 'POST' })
      }
    }
  },

  media: {
    permission: 'cms:media:read',
    charger: async (lire, locals) => ({
      media: (await lire('/cms/media')) ?? [],
      canWrite: can(locals, 'cms:media:write'),
      canDelete: can(locals, 'cms:media:delete')
    }),
    // Déposer et supprimer sont deux droits distincts : retirer un média peut vider
    // l'illustration d'une page en ligne, là où en ajouter un est sans conséquence.
    depot: { permission: 'cms:media:write', chemin: '/cms/media' },
    ecritures: {
      // Renommer, c'est décrire le fichier déposé : même droit que le dépôt.
      update: {
        permission: 'cms:media:write',
        route: (data) => ({
          chemin: `/cms/media/${data.id}`,
          method: 'PUT',
          body: { alt: data.alt ?? '' }
        })
      },
      delete: {
        permission: 'cms:media:delete',
        route: (data) => ({ chemin: `/cms/media/${data.id}`, method: 'DELETE' })
      }
    }
  }
};

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });

export const GET: APIRoute = async ({ params, locals }) => {
  const ecran = ECRANS[params.screen ?? ''];
  // Un écran inconnu n'existe pas : ni indice sur ce que le relais sert, ni chemin
  // détourné vers une lecture non déclarée.
  if (!ecran) return json({ success: false, error: 'Écran inconnu' }, 404);
  if (!can(locals, ecran.permission)) return json({ success: false, error: 'Accès refusé' }, 403);

  const api = createAdminApiClient(locals);
  const lire: Lecteur = async (chemin) => {
    const res = await api.fetch(`http://localhost${chemin}`);
    if (!res.ok) return null;
    return ((await res.json()) as { data?: unknown }).data ?? null;
  };

  try {
    return json({ success: true, data: await ecran.charger(lire, locals) });
  } catch (e) {
    return json(
      { success: false, error: `Appel API échoué : ${e instanceof Error ? e.message : String(e)}` },
      502
    );
  }
};

/**
 * La réponse de l'API est rendue telle quelle.
 *
 * Les composants lisent `data` en cas de succès et `error` en cas d'échec : c'est
 * l'enveloppe de l'API, et la réécrire ici obligerait à la maintenir en double.
 */
async function relayer(res: Response): Promise<Response> {
  if (!res.ok) {
    return new Response(await res.text(), {
      status: res.status,
      headers: { 'Content-Type': res.headers.get('Content-Type') ?? 'application/json' }
    });
  }
  return new Response(JSON.stringify(await res.json()), {
    headers: { 'Content-Type': 'application/json' }
  });
}

export const POST: APIRoute = async ({ params, request, locals }) => {
  const ecran = ECRANS[params.screen ?? ''];
  if (!ecran) return json({ error: 'Écran inconnu' }, 404);

  const api = createAdminApiClient(locals);

  // Un dépôt de fichier arrive en multipart, là où toutes les autres écritures parlent
  // JSON — il n'a donc pas de nom d'action à garder, mais son propre droit.
  if ((request.headers.get('content-type') ?? '').includes('multipart/form-data')) {
    if (!ecran.depot) return json({ error: 'Cet écran ne reçoit pas de fichier.' }, 400);
    if (!can(locals, ecran.depot.permission)) return json({ error: 'Accès refusé' }, 403);
    return relayer(
      await api.fetch(`http://localhost${ecran.depot.chemin}`, {
        method: 'POST',
        body: await request.formData()
      })
    );
  }

  const data = (await request.json()) as any;
  const ecritures = ecran.ecritures ?? {};

  /*
   * `Object.hasOwn` et non `in` : `'constructor' in ecritures` est vrai par héritage, et
   * laisserait un nom d'action emprunté au prototype franchir cette vérification.
   */
  if (typeof data?.action !== 'string' || !Object.hasOwn(ecritures, data.action)) {
    return json({ error: 'Action inconnue' }, 403);
  }

  const ecriture = ecritures[data.action];
  if (!can(locals, ecriture.permission)) return json({ error: 'Accès refusé' }, 403);

  let appel: Appel;
  try {
    appel = ecriture.route(data);
  } catch (e) {
    if (e instanceof Refus) return json({ error: e.message }, 400);
    throw e;
  }

  return relayer(
    await api.fetch(`http://localhost${appel.chemin}`, {
      method: appel.method,
      headers: { 'Content-Type': 'application/json' },
      ...(appel.body ? { body: JSON.stringify(appel.body) } : {})
    })
  );
};
