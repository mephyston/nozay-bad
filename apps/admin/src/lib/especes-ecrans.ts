import { can } from './guard';
import { identifiant, Refus, type Ecran } from './relais';
import { currentSeasonCode, sortSeasons } from './seasons';

/**
 * Les écrans de l'encaissement d'espèces (RF-ACC-003), servis par le relais de la
 * comptabilité sous `/admin/api/accounting/<écran>`.
 *
 * `especes` charge le bureau de l'encaisseur et, pour le trésorier, les espèces en
 * circulation. `cash-receipt` et `cash-handover` ne lisent qu'un reçu ou une remise : ce
 * sont eux que l'écran interroge toutes les deux secondes en attendant une signature, sans
 * relire l'annuaire à chaque fois.
 */
const ENCAISSER = 'accounting:cash-receipts:write' as const;
const RECEVOIR = 'accounting:cash-handovers:approve' as const;

const montant = (valeur: unknown): number => {
  const n = Number(valeur);
  if (!Number.isSafeInteger(n) || n < 0) throw new Refus('Montant invalide.');
  return n;
};

export const ECRANS_ESPECES: Record<string, Ecran> = {
  especes: {
    permission: ENCAISSER,
    feature: 'cash_receipts',
    charger: async (lire, locals) => {
      const seasons: any[] = sortSeasons((await lire('/accounting/seasons')) ?? []);
      const season = currentSeasonCode(seasons);
      const peutRecevoir = can(locals, RECEVOIR);
      const [detenus, adherents, categories, circulation] = await Promise.all([
        lire('/accounting/cash-receipts'),
        season ? lire(`/members?limit=1000&season=${encodeURIComponent(season)}`) : null,
        lire('/accounting/categories'),
        peutRecevoir ? lire('/accounting/cash-in-hand') : null
      ]);
      return {
        // Le nom imprimé sur le reçu : celui du compte connecté, sinon son adresse.
        collectorName: locals.user?.name || locals.user?.email || '',
        collectorEmail: locals.user?.email ?? '',
        held: detenus ?? { receipts: [], totalCents: 0 },
        members: ((adherents ?? []) as any[]).map((m) => ({
          id: m.id,
          label: `${m.lastName ?? ''} ${m.firstName ?? ''}`.trim(),
          licence: m.licence ?? ''
        })),
        // Les motifs : les catégories actives qui encaissent (une recette, donc une classe de produit).
        categories: ((categories ?? []) as any[])
          .filter((c) => c.active !== false && c.receiptCode)
          .map((c) => ({ id: c.id, label: c.adherentLabel || c.adminLabel, adminLabel: c.adminLabel })),
        // L'écart d'une remise peut tomber dans n'importe quelle catégorie active : le
        // trésorier choisit, l'écran propose celle dont le libellé parle d'écart.
        gapCategories: peutRecevoir
          ? ((categories ?? []) as any[]).filter((c) => c.active !== false).map((c) => ({ id: c.id, label: c.adherentLabel || c.adminLabel, adminLabel: c.adminLabel }))
          : [],
        canReceive: peutRecevoir,
        cashInHand: circulation ?? []
      };
    },
    ecritures: {
      open_receipt: {
        permission: ENCAISSER,
        route: (data) => ({
          chemin: '/accounting/cash-receipts',
          method: 'POST',
          body: {
            payerMemberId: data.payerMemberId ? identifiant(data.payerMemberId, "d'adhérent") : null,
            payerName: data.payerName ?? '',
            payerEmail: data.payerEmail || null,
            amountCents: montant(data.amountCents),
            categoryId: identifiant(data.categoryId, 'de motif'),
            description: data.description ?? '',
            collectorName: String(data.collectorName ?? '')
          }
        })
      },
      renew_receipt_token: {
        permission: ENCAISSER,
        route: (data) => ({ chemin: `/accounting/cash-receipts/${identifiant(data.id, 'de reçu')}/token`, method: 'POST' })
      },
      send_code: {
        permission: ENCAISSER,
        route: (data) => ({ chemin: `/accounting/cash-receipts/${identifiant(data.id, 'de reçu')}/code`, method: 'POST' })
      },
      verify_code: {
        permission: ENCAISSER,
        route: (data) => ({
          chemin: `/accounting/cash-receipts/${identifiant(data.id, 'de reçu')}/code/verify`,
          method: 'POST',
          body: { code: String(data.code ?? '') }
        })
      },
      sign_receipt: {
        permission: ENCAISSER,
        route: (data) => ({
          chemin: `/accounting/cash-receipts/${identifiant(data.id, 'de reçu')}/signature`,
          method: 'POST',
          body: { signature: String(data.signature ?? '') }
        })
      },
      cancel_receipt: {
        permission: ENCAISSER,
        route: (data) => ({ chemin: `/accounting/cash-receipts/${identifiant(data.id, 'de reçu')}`, method: 'DELETE' })
      },
      // L'encaisseur scelle sa remise en scannant le QR code affiché chez le trésorier.
      confirm_handover: {
        permission: ENCAISSER,
        route: (data) => ({ chemin: '/accounting/cash-handovers/confirm', method: 'POST', body: { qr: String(data.qr ?? '') } })
      },
      open_handover: {
        permission: RECEVOIR,
        route: (data) => ({
          chemin: '/accounting/cash-handovers',
          method: 'POST',
          body: {
            collectorEmail: String(data.collectorEmail ?? ''),
            countedCents: montant(data.countedCents),
            gapCategoryId: data.gapCategoryId ? identifiant(data.gapCategoryId, "de catégorie d'écart") : null
          }
        })
      },
      renew_handover_token: {
        permission: RECEVOIR,
        route: (data) => ({ chemin: `/accounting/cash-handovers/${identifiant(data.id, 'de remise')}/token`, method: 'POST' })
      },
      sign_handover: {
        permission: RECEVOIR,
        route: (data) => ({
          chemin: `/accounting/cash-handovers/${identifiant(data.id, 'de remise')}/signature`,
          method: 'POST',
          body: { signature: String(data.signature ?? '') }
        })
      },
      deposit_own: {
        permission: RECEVOIR,
        route: (data) => ({ chemin: `/accounting/cash-handovers/${identifiant(data.id, 'de remise')}/deposit`, method: 'POST' })
      },
      cancel_handover: {
        permission: RECEVOIR,
        route: (data) => ({ chemin: `/accounting/cash-handovers/${identifiant(data.id, 'de remise')}`, method: 'DELETE' })
      }
    }
  },

  'cash-receipt': {
    permission: ENCAISSER,
    feature: 'cash_receipts',
    charger: async (lire, _locals, params) => ({
      receipt: await lire(`/accounting/cash-receipts/${identifiant(params.get('id'), 'de reçu')}`)
    })
  },

  'cash-handover': {
    permission: RECEVOIR,
    feature: 'cash_receipts',
    charger: async (lire, _locals, params) => ({
      handover: await lire(`/accounting/cash-handovers/${identifiant(params.get('id'), 'de remise')}`)
    })
  }
};
