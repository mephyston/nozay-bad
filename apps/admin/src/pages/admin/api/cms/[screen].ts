import { can } from '../../../../lib/guard';
import { resolveEnv } from '../../../../lib/api';
import { createPreviewToken } from '@nba/preview';
import { creerRelais, identifiant, Refus, type Ecran } from '../../../../lib/relais';

/**
 * Les écrans du CMS, et ce que chacun expose.
 *
 * La mécanique — refus, validation, passe-plat de la réponse — vit dans
 * `lib/relais.ts` ; ce fichier ne déclare que la rubrique. La table ci-dessous est donc
 * **la** surface d'audit du CMS : un endroit unique où lire ce que l'administration
 * expose au navigateur, et quelle permission garde chaque lecture, chaque écriture et
 * chaque dépôt. `[screen].test.ts` vérifie qu'aucun n'en manque.
 *
 * ## Pourquoi les écritures ont quitté les pages
 *
 * Elles vivaient dans le `POST` de chaque page, et les composants publiaient vers l'URL
 * courante — `fetch('')`. Cela tenait tant qu'un composant n'était utilisé que par sa
 * propre page. Ce n'était déjà plus vrai du dépôt de fichier : le sélecteur de médias
 * s'ouvre depuis la médiathèque, depuis les actualités et depuis l'éditeur de pages, si
 * bien que **trois** écrans avaient dû apprendre à lire un `multipart/form-data` pour que
 * le même bouton fonctionne partout. En nommant la destination, le dépôt s'adresse à la
 * médiathèque depuis n'importe quel hôte, et ce couplage disparaît.
 */

export const ECRANS: Record<string, Ecran> = {
  menus: {
    feature: 'website',
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
    feature: 'website',
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
    feature: 'website',
    permission: 'cms:pages:read',
    charger: async (lire, locals) => ({
      pages: (await lire('/cms/pages')) ?? [],
      canWrite: can(locals, 'cms:pages:write'),
      canDelete: can(locals, 'cms:pages:delete')
    }),
    ecritures: {
      create: {
        permission: 'cms:pages:write',
        /*
          Le relais ne transmettait que le titre, alors que l'API accepte depuis
          toujours l'adresse, le rôle et les champs pour les moteurs : on créait donc
          une page sans pouvoir lui donner son adresse, puis on rouvrait ses réglages
          pour le faire. Les facultatifs ne partent que renseignés — absente, l'adresse
          se déduit du titre côté serveur.
        */
        route: (data) => {
          const roles = ['default', 'home', 'landing'];
          if (data.template != null && !roles.includes(String(data.template))) {
            throw new Refus('Rôle de page inconnu.');
          }
          return {
            chemin: '/cms/pages',
            method: 'POST',
            body: {
              title: String(data.title ?? ''),
              ...(data.slug ? { slug: String(data.slug) } : {}),
              ...(data.template ? { template: String(data.template) } : {}),
              ...(data.seoTitle ? { seoTitle: String(data.seoTitle) } : {}),
              ...(data.seoDescription ? { seoDescription: String(data.seoDescription) } : {})
            }
          };
        }
      },
      delete: {
        permission: 'cms:pages:delete',
        route: (data) => ({ chemin: `/cms/pages/${data.id}`, method: 'DELETE' })
      }
    }
  },

  /**
   * L'éditeur d'une page, le seul écran de la rubrique qui porte sur un objet précis :
   * son identifiant arrive en paramètre de requête plutôt que dans le nom de l'écran.
   *
   * C'est aussi le seul qui **signe** quelque chose. Le lien d'aperçu porte un jeton que
   * le site public vérifie, les deux workers partageant `PREVIEW_TOKEN_SECRET` — ce
   * secret ne doit jamais atteindre le navigateur, et c'est une raison de plus pour que
   * cette préparation reste ici plutôt que dans l'îlot.
   */
  page: {
    feature: 'website',
    permission: 'cms:pages:read',
    charger: async (lire, locals, params) => {
      const id = identifiant(params.get('id'), 'de page');

      const fiche = await lire(`/cms/pages/${id}`);
      const page = fiche?.page ?? null;
      const blocks = fiche?.blocks ?? [];

      /*
        Ressources des éditeurs de blocs : la médiathèque (bannière, documents), les
        cibles internes possibles et les catégories d'actualités. L'échec de l'une
        n'empêche pas d'éditer la page — les champs concernés retombent simplement sur
        une saisie libre.
      */
      const [revisions, media, pages, reponsePosts, categories] = await Promise.all([
        lire(`/cms/pages/${id}/revisions`),
        lire('/cms/media?limit=200'),
        lire('/cms/pages'),
        lire('/cms/posts?limit=100'),
        lire('/cms/post-categories')
      ]);

      // Les redirections ne se cherchent qu'une fois la page connue : elles portent sur
      // son chemin de destination.
      const redirects = page?.path
        ? (await lire(`/cms/redirects?toPath=${encodeURIComponent(page.path)}`)) ?? []
        : [];

      const cible = (row: any, kind: 'page' | 'post') => ({
        path: row.path,
        title: row.title,
        kind,
        status: row.status
      });

      /*
        Sans secret configuré, le lien pointe la page sans jeton — un brouillon y reste
        donc invisible, ce qui est le comportement sûr.

        Mais il faut le **dire** : le lien avait exactement la même allure signé ou non,
        et sur un brouillon il menait à un 404 sans que rien n'explique pourquoi. D'où
        `previewSigne`, que l'éditeur emploie pour ne pas proposer un aperçu qui ne peut
        pas fonctionner.
      */
      const base = (import.meta.env.PUBLIC_WEBSITE_URL as string | undefined) ?? '';
      const secret = (resolveEnv(locals) as { PREVIEW_TOKEN_SECRET?: string }).PREVIEW_TOKEN_SECRET;
      let previewUrl = '';
      if (page && base) {
        previewUrl = secret
          ? `${base}${page.path}?preview=${encodeURIComponent(await createPreviewToken(page.path, secret))}`
          : `${base}${page.path}`;
      }

      return {
        page,
        blocks,
        revisions: revisions ?? [],
        media: media ?? [],
        categories: categories ?? [],
        redirects,
        previewUrl,
        previewSigne: Boolean(secret),
        targets: [
          ...(pages ?? []).map((row: any) => cible(row, 'page')),
          ...(reponsePosts?.posts ?? []).map((row: any) => cible(row, 'post'))
        ],
        canWrite: can(locals, 'cms:pages:write'),
        canDelete: can(locals, 'cms:pages:delete'),
        canUploadMedia: can(locals, 'cms:media:write')
      };
    },
    ecritures: {
      updateMeta: {
        permission: 'cms:pages:write',
        route: (data) => ({
          chemin: `/cms/pages/${identifiant(data.id, 'de page')}`,
          method: 'PUT',
          body: {
            title: data.title,
            slug: data.slug,
            template: data.template,
            // Une chaîne vide veut dire « pas de valeur » : on la ramène à null pour que
            // le repli en cascade s'applique côté site.
            seoTitle: data.seoTitle?.trim() ? data.seoTitle : null,
            seoDescription: data.seoDescription?.trim() ? data.seoDescription : null
          }
        })
      },
      saveBlocks: {
        permission: 'cms:pages:write',
        route: (data) => ({
          chemin: `/cms/pages/${identifiant(data.id, 'de page')}/blocks`,
          method: 'PUT',
          body: { blocks: data.blocks }
        })
      },
      publish: {
        permission: 'cms:pages:write',
        route: (data) => ({
          chemin: `/cms/pages/${identifiant(data.id, 'de page')}/publish`,
          method: 'POST',
          body: { published: data.published }
        })
      },
      restore: {
        permission: 'cms:pages:write',
        route: (data) => ({
          chemin: `/cms/pages/${identifiant(data.id, 'de page')}/revisions/${identifiant(data.revisionId, 'de révision')}/restore`,
          method: 'POST'
        })
      }
    }
  },

  redirects: {
    feature: 'website',
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
    feature: 'website',
    permission: 'cms:media:read',
    charger: async (lire, locals) => ({
      media: (await lire('/cms/media?limit=200')) ?? [],
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

export const { GET, POST } = creerRelais(ECRANS);
