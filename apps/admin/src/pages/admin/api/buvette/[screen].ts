import { can } from '../../../../lib/guard';
import { creerRelais, identifiant, type Ecran } from '../../../../lib/relais';

/** Le catalogue de la buvette. La caisse et l'app des clients ont leurs propres Workers. */

function article(data: any) {
  return {
    name: data.name,
    priceCents: data.priceCents,
    accountingCategoryId: data.accountingCategoryId,
    active: data.active,
    sortOrder: data.sortOrder
  };
}

export const ECRANS: Record<string, Ecran> = {
  catalog: {
    feature: 'buvette',
    permission: 'buvette:items:read',
    charger: async (lire, locals) => {
      const [items, categories, settings] = await Promise.all([
        lire('/buvette/items'),
        lire('/accounting/categories'),
        lire('/buvette/settings')
      ]);
      return {
        items: items ?? [],
        categories: categories ?? [],
        settings: settings ?? {},
        canWrite: can(locals, 'buvette:items:write')
      };
    },
    ecritures: {
      create_item: {
        permission: 'buvette:items:write',
        route: (data) => ({ chemin: '/buvette/items', method: 'POST', body: article(data) })
      },
      update_item: {
        permission: 'buvette:items:write',
        route: (data) => ({
          chemin: `/buvette/items/${identifiant(data.id, "d'article")}`,
          method: 'PUT',
          body: article(data)
        })
      },
      save_settings: {
        permission: 'buvette:settings:write',
        route: (data) => ({
          chemin: '/buvette/settings',
          method: 'PUT',
          body: {
            maxBalanceCents: data.maxBalanceCents,
            cashPaymentMethodId: data.cashPaymentMethodId,
            prepaidPaymentMethodId: data.prepaidPaymentMethodId,
            cardPaymentMethodId: data.cardPaymentMethodId,
            gapCategoryId: data.gapCategoryId
          }
        })
      }
    }
  }
};

export const { GET, POST } = creerRelais(ECRANS);
