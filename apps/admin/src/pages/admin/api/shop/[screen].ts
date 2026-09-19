import { can } from '../../../../lib/guard';
import { creerRelais, identifiant, type Ecran } from '../../../../lib/relais';
import { currentSeasonCode, sortSeasons } from '../../../../lib/seasons';

/**
 * Les écrans du domaine « boutique ».
 *
 * Le catalogue de l'espace adhérent n'y figure pas : il vit dans le storefront, écrit vers
 * sa propre page, et n'a rien à faire dans un relais d'administration.
 */

/** Transition d'une commande → segment d'URL de l'API. */
const TRANSITIONS = ['validate', 'pay', 'reject', 'cancel', 'unpay'] as const;

export const ECRANS: Record<string, Ecran> = {
  orders: {
    feature: 'shop',
    permission: 'shop:orders:read',
    charger: async (lire, locals, params) => {
      /*
        Le référentiel part le premier : sans saison dans l'URL, l'écran s'ouvrait
        invariablement sur « 25-26 » codé en dur, et non sur l'active de la configuration.
        Le savoir coûte cette lecture avant les trois autres — celles-ci en dépendent.
      */
      const seasons: any[] = sortSeasons((await lire('/accounting/seasons')) ?? []);
      const season = params.get('season') || currentSeasonCode(seasons) || '25-26';
      const s = encodeURIComponent(season);
      const [commandes, produits, adherents, moyens] = await Promise.all([
        lire(`/shop/orders?season=${s}`),
        // Seuls les produits encore proposés : on ne crée pas une commande sur un article
        // retiré du catalogue.
        lire('/shop/products?active=true'),
        lire(`/members?limit=1000&season=${s}`),
        // Les moyens de paiement que le bureau peut saisir, depuis la configuration du club.
        lire('/accounting/payment-methods?offered=admin')
      ]);

      const courante = seasons.find((x: any) => x.code === season || String(x.id) === season);

      return {
        seasons,
        orders: commandes ?? [],
        products: produits ?? [],
        members: adherents ?? [],
        paymentMethods: (moyens ?? []).map((m: any) => ({ value: m.code, label: m.label, kind: m.kind })),
        season,
        // Le nom sert au sous-titre, l'état de clôture au bandeau « lecture seule ».
        seasonName: courante?.name ? String(courante.name).replace('Saison ', '') : season,
        isClosed: Boolean(courante?.closed),
        canApprove: can(locals, 'shop:orders:approve'),
        canWrite: can(locals, 'shop:orders:write')
      };
    },
    ecritures: {
      ...Object.fromEntries(
        TRANSITIONS.map((action) => [
          action,
          {
            permission: 'shop:orders:approve' as const,
            route: (data: any) => ({
              chemin: `/shop/orders/${identifiant(data.id, 'de commande')}/${action}`,
              method: 'POST',
              // `paidAt` n'est porté que par l'encaissement ; les autres l'ignorent.
              body: data.paidAt ? { paidAt: data.paidAt } : {}
            })
          }
        ])
      ),
      /*
        La création portait jusqu'ici **aucun** champ `action` : la page la reconnaissait à
        sa charge utile — la présence d'un produit et d'une quantité — et la gardait
        séparément. Un implicite qui se serait défait à la première évolution du
        formulaire. Elle se nomme désormais, comme les autres.
      */
      'create-order': {
        permission: 'shop:orders:write',
        route: (data) => ({ chemin: '/shop/orders', method: 'POST', body: data })
      },
      update: {
        permission: 'shop:orders:write',
        route: (data) => ({
          chemin: `/shop/orders/${identifiant(data.id, 'de commande')}`,
          method: 'PUT',
          body: data
        })
      }
    }
  },

  /**
   * Les catégories de produits, et leur correspondance comptable.
   *
   * Rangées sous « Configuration » dans le menu, mais gardées par `shop:categories:write` :
   * c'est la permission qui décide du domaine. Les catégories comptables sont lues avec,
   * puisque c'est à elles qu'on rattache chaque catégorie de la boutique.
   */
  categories: {
    feature: 'shop',
    permission: 'shop:products:read',
    charger: async (lire) => {
      const [comptables, produits] = await Promise.all([
        lire('/accounting/categories'),
        lire('/shop/product-categories')
      ]);
      return { categories: comptables ?? [], productCategories: produits ?? [] };
    },
    ecritures: {
      create_product_category: {
        permission: 'shop:categories:write',
        route: (data) => ({
          chemin: '/shop/product-categories',
          method: 'POST',
          body: { label: data.label, accountingCategoryId: data.accountingCategoryId, active: data.active }
        })
      },
      update_product_category: {
        permission: 'shop:categories:write',
        route: (data) => ({
          chemin: `/shop/product-categories/${identifiant(data.id, 'de catégorie de produit')}`,
          method: 'PUT',
          body: data.updates
        })
      },
      delete_product_category: {
        permission: 'shop:categories:write',
        route: (data) => ({
          chemin: `/shop/product-categories/${identifiant(data.id, 'de catégorie de produit')}`,
          method: 'DELETE'
        })
      }
    }
  },

  products: {
    feature: 'shop',
    permission: 'shop:products:read',
    charger: async (lire, locals) => {
      const [products, categories] = await Promise.all([lire('/shop/products'), lire('/shop/product-categories')]);
      return {
        products: products ?? [],
        // Les catégories du club, actives : plus de liste écrite dans le formulaire.
        productCategories: (categories ?? []).filter((c: any) => c.active !== false),
        // Les images sont servies par le site public, jamais par l'administration.
        mediaOrigin: ORIGINE_MEDIAS,
        canWrite: can(locals, 'shop:products:write')
      };
    },
    /*
      Le corps est transmis tel quel, l'API le valide : le relais n'a pas à connaître la
      liste des champs d'un produit, et une déclinaison en envoie d'autres qu'un parent.
    */
    ecritures: {
      create: {
        permission: 'shop:products:write',
        route: (data) => ({ chemin: '/shop/products', method: 'POST', body: corps(data) })
      },
      update: {
        permission: 'shop:products:write',
        route: (data) => ({
          chemin: `/shop/products/${identifiant(data.id, 'de produit')}`,
          method: 'PUT',
          body: corps(data)
        })
      },
      delete: {
        permission: 'shop:products:write',
        route: (data) => ({ chemin: `/shop/products/${identifiant(data.id, 'de produit')}`, method: 'DELETE' })
      },
      remove_image: {
        permission: 'shop:products:write',
        route: (data) => ({ chemin: `/shop/products/${identifiant(data.id, 'de produit')}/image`, method: 'DELETE' })
      }
    },
    /** L'image d'un produit : `id` dans le formulaire, à côté du fichier. */
    depot: {
      permission: 'shop:products:write',
      chemin: (form) => `/shop/products/${identifiant(form.get('id'), 'de produit')}/image`
    }
  }
};

/*
  L'origine du site public, qui sert les images : inlinée au build, comme dans
  `media-url.ts` (voir la note qui y explique la forme d'accès).
*/
const ORIGINE_MEDIAS = (import.meta.env.PUBLIC_WEBSITE_URL as string | undefined) ?? '';

/** Le corps d'un produit, sans l'action ni l'identifiant qui vivent dans l'URL. */
function corps(data: any) {
  const { action: _action, id: _id, ...body } = data;
  return body;
}

export const { GET, POST } = creerRelais(ECRANS);
