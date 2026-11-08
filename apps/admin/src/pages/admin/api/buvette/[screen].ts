import { can } from '../../../../lib/guard';
import { creerRelais, identifiant, type Ecran } from '../../../../lib/relais';

/** Le catalogue de la buvette. La caisse et l'app des clients ont leurs propres Workers. */

function article(data: any) {
  return {
    name: data.name,
    priceCents: data.priceCents,
    accountingCategoryId: data.accountingCategoryId,
    active: data.active,
    sortOrder: data.sortOrder,
    icon: data.icon ?? null
  };
}

export const ECRANS: Record<string, Ecran> = {
  'paper-cards': {
    feature: 'buvette',
    permission: 'buvette:cards:write',
    charger: async () => ({}),
    ecritures: {
      generate: {
        permission: 'buvette:cards:write',
        route: (data) => ({ chemin: '/buvette/paper-cards', method: 'POST', body: { faceValueCents: data.faceValueCents, quantity: data.quantity } })
      }
    }
  },
  session: {
    feature: 'buvette',
    permission: 'buvette:sessions:read',
    charger: async (lire, locals) => ({
      current: (await lire('/buvette/sessions/current')) ?? null,
      cardsDebtCents: (await lire('/buvette/cards/debt'))?.cardsDebtCents ?? 0,
      canOpen: can(locals, 'buvette:sessions:write'),
      canClose: can(locals, 'buvette:sessions:close'),
      canAbandon: can(locals, 'buvette:sales:write')
    }),
    ecritures: {
      open_session: {
        permission: 'buvette:sessions:write',
        route: (data) => ({ chemin: '/buvette/sessions', method: 'POST', body: { openingFloatCents: data.openingFloatCents } })
      },
      close_session: {
        permission: 'buvette:sessions:close',
        route: (data) => ({
          chemin: `/buvette/sessions/${identifiant(data.id, 'de session')}/close`,
          method: 'POST',
          body: { countedCashCents: data.countedCashCents }
        })
      },
      abandon_sale: {
        permission: 'buvette:sales:write',
        route: (data) => ({ chemin: `/buvette/sales/${identifiant(data.id, 'de vente')}/abandon`, method: 'POST', body: {} })
      }
    }
  },
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
