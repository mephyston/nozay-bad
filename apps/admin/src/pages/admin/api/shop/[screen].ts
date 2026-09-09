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
      const [commandes, produits, adherents] = await Promise.all([
        lire(`/shop/orders?season=${s}`),
        // Seuls les produits encore proposés : on ne crée pas une commande sur un article
        // retiré du catalogue.
        lire('/shop/products?active=true'),
        lire(`/members?limit=1000&season=${s}`)
      ]);

      const courante = seasons.find((x: any) => x.code === season || String(x.id) === season);

      return {
        seasons,
        orders: commandes ?? [],
        products: produits ?? [],
        members: adherents ?? [],
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
    permission: 'shop:products:read',
    charger: async (lire, locals) => ({
      products: (await lire('/shop/products')) ?? [],
      canWrite: can(locals, 'shop:products:write')
    }),
    ecritures: {
      create: {
        permission: 'shop:products:write',
        route: (data) => ({
          chemin: '/shop/products',
          method: 'POST',
          body: {
            name: data.name,
            productCategoryId: categorie(data.category),
            priceCents: data.priceCents ?? data.price,
            stock: data.stock,
            trackStock: data.trackStock,
            active: data.active
          }
        })
      },
      update: {
        permission: 'shop:products:write',
        route: (data) => ({
          chemin: `/shop/products/${identifiant(data.id, 'de produit')}`,
          method: 'PUT',
          body: {
            name: data.name,
            priceCents: data.priceCents ?? data.price,
            stock: data.stock,
            trackStock: data.trackStock,
            active: data.active
          }
        })
      }
    }
  }
};

/**
 * Catégorie de produit, telle que l'API l'attend.
 *
 * Le formulaire envoie tantôt un identifiant, tantôt un nom hérité de l'ancienne
 * boutique. La correspondance vivait dans la page ; elle est reprise telle quelle plutôt
 * que « nettoyée », le jour où l'on changera ces identifiants n'étant pas celui-ci.
 */
function categorie(valeur: unknown): number {
  if (typeof valeur === 'number') return valeur;
  if (valeur === 'shuttlecock') return 1;
  if (valeur === 'string') return 2;
  return 3;
}

export const { GET, POST } = creerRelais(ECRANS);
