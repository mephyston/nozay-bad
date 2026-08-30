import type { APIRoute } from 'astro';
import type { Permission } from '@nba/iam-ui';
import { can } from '../../../../lib/guard';
import { createAdminApiClient } from '../../../../lib/api';

/**
 * Le relais des écrans du CMS.
 *
 * Un seul point d'entrée pour toute la rubrique plutôt qu'un fichier par écran : la
 * table ci-dessous est alors **la** surface d'audit — un endroit unique où lire ce que
 * l'administration expose au navigateur, et quelle permission garde chaque écran. Onze
 * gardes disséminées se relisent mal ; celle-ci se relit d'un coup d'œil.
 *
 * Le worker reste le relais qu'il était : il détient `INTERNAL_API_KEY`, affirme
 * l'identité tirée du jeton Cloudflare Access, et ne rend plus de HTML. Ce qu'il expose
 * ici, ce sont les mêmes lectures qu'il faisait en frontmatter — ni plus, ni moins.
 *
 * Les routes sous `/admin/api/` échappent à `PAGE_PERMISSIONS` (cf. `isPageRoute`) :
 * chaque écran répond donc de sa propre garde, et `[screen].test.ts` vérifie qu'aucun
 * n'en manque.
 */

type Lecteur = (chemin: string) => Promise<any>;

interface Ecran {
  /** Droit exigé pour *lire* l'écran ; les écritures gardent le leur, côté page. */
  permission: Permission;
  charger: (lire: Lecteur, locals: App.Locals) => Promise<Record<string, unknown>>;
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
    }
  },

  footer: {
    permission: 'cms:pages:read',
    charger: async (lire, locals) => ({
      settings: (await lire('/cms/settings')) ?? {},
      canWrite: can(locals, 'cms:pages:write')
    })
  },

  pages: {
    permission: 'cms:pages:read',
    charger: async (lire, locals) => ({
      pages: (await lire('/cms/pages')) ?? [],
      canWrite: can(locals, 'cms:pages:write'),
      canDelete: can(locals, 'cms:pages:delete')
    })
  },

  redirects: {
    permission: 'cms:nav:read',
    charger: async (lire, locals) => ({
      redirects: (await lire('/cms/redirects/all')) ?? [],
      canWrite: can(locals, 'cms:nav:write')
    })
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
    }
  },

  media: {
    permission: 'cms:media:read',
    charger: async (lire, locals) => ({
      media: (await lire('/cms/media')) ?? [],
      canWrite: can(locals, 'cms:media:write'),
      canDelete: can(locals, 'cms:media:delete')
    })
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
