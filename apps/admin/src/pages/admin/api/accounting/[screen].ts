import { can } from '../../../../lib/guard';
import { creerRelais, identifiant, type Ecran, type Lecteur } from '../../../../lib/relais';

/**
 * Les écrans du domaine « comptabilité ».
 *
 * La mécanique vit dans `lib/relais.ts` ; ce fichier ne déclare que la table.
 *
 * Deux écrans de cette rubrique ne passeront **jamais** par ici, et c'est délibéré :
 * `invoices/[id]` et `attestations/[id]` rendent un PDF, `reports/index` un ZIP. Un
 * relais qui répond du JSON ne sait pas relayer un flux binaire, et ces pages n'ont de
 * toute façon aucune donnée d'écran à charger — elles restent des routes serveur.
 */

/**
 * La saison affichée, et ce qu'il faut en dire.
 *
 * Résolution propre à la comptabilité, et différente de celle des interclubs : les
 * saisons sont triées par date de début, et à défaut de saison dans l'URL on prend
 * l'active, sinon la dernière. `closed` conditionne l'affichage en lecture seule, et le
 * nom sert au sous-titre — deux choses que la page calculait après coup.
 */
async function saison(lire: Lecteur, params: URLSearchParams) {
  const seasons: any[] = (await lire('/accounting/seasons')) ?? [];
  seasons.sort((a, b) => (a.startDate || a.code || '').localeCompare(b.startDate || b.code || ''));

  const demandee = params.get('season') ?? '';
  const active = seasons.find((s) => s.active === true || s.active === 1) ?? seasons[seasons.length - 1];
  const seasonId = demandee || (active ? active.code || String(active.id) : '25-26');

  const courante = seasons.find((s) => s.code === seasonId || String(s.id) === seasonId);
  return {
    seasons,
    seasonId,
    seasonName: courante?.name ? String(courante.name).replace('Saison ', '') : seasonId,
    isClosed: Boolean(courante?.closed)
  };
}

export const ECRANS: Record<string, Ecran> = {
  ledger: {
    permission: 'accounting:ledger:read',
    charger: async (lire, locals, params) => {
      const saisonnier = await saison(lire, params);

      /*
        Les filtres du grand livre voyagent tels quels, y compris le sens de l'écriture :
        le compte de résultat sépare charges et produits, et un lien de catégorie qui
        ramènerait les deux mélangés ouvre trois cents cotisations pour y trouver sept
        remboursements.
      */
      const requete = new URLSearchParams({
        season: saisonnier.seasonId,
        page: params.get('page') || '1',
        limit: params.get('limit') || '20',
        accountId: params.get('accountId') || 'current'
      });
      for (const cle of ['category', 'classCode', 'type', 'search', 'month'] as const) {
        const valeur = params.get(cle);
        if (valeur) requete.set(cle, valeur);
      }
      if (params.get('unreconciledCheques') === 'true') requete.set('unreconciledCheques', 'true');

      const [mouvements, rapport, categories, classes] = await Promise.all([
        lire.detail(`/accounting/transactions?${requete}`),
        lire(`/accounting/seasons/${encodeURIComponent(saisonnier.seasonId)}/reports`),
        lire('/accounting/categories'),
        lire('/accounting/account-classes')
      ]);

      return {
        ...saisonnier,
        transactions: mouvements.data ?? [],
        // La pagination vit à côté de `data` dans l'enveloppe : `lire` ne rend que `data`,
        // d'où la lecture détaillée pour la récupérer.
        pagination: mouvements.enveloppe?.pagination ?? { total: 0, page: 1, limit: 20, totalPages: 1 },
        balances: rapport?.bilanTrésorerie ?? [],
        categories: categories ?? [],
        accountClasses: classes ?? [],
        unreconciledChequesOnly: params.get('unreconciledCheques') === 'true',
        accountId: params.get('accountId') || 'current',
        searchQuery: params.get('search') || '',
        month: params.get('month') || '',
        limit: params.get('limit') || '20',
        canWrite: can(locals, 'accounting:ledger:write'),
        canDelete: can(locals, 'accounting:ledger:delete')
      };
    },
    ecritures: {
      /*
        Le corps part tel quel, `action` comprise — c'est ce que faisait la page, et le
        validateur de l'API l'ignore. Le réécrire ici risquerait d'oublier un champ que le
        formulaire envoie sans que personne ne s'en aperçoive.
      */
      create: {
        permission: 'accounting:ledger:write',
        route: (data) => ({ chemin: '/accounting/transactions', method: 'POST', body: data })
      },
      // Un virement écrit deux lignes du grand livre : c'est le même droit.
      'create-transfer': {
        permission: 'accounting:ledger:write',
        route: (data) => ({
          chemin: '/accounting/internal-transfers',
          method: 'POST',
          body: {
            seasonId: data.seasonId,
            sourceAccountId: data.sourceAccountId,
            destinationAccountId: data.destinationAccountId,
            amountCents: data.amountCents,
            sourceDate: data.sourceDate,
            destinationDate: data.destinationDate,
            description: data.description,
            reference: data.reference
          }
        })
      },
      update: {
        permission: 'accounting:ledger:write',
        route: (data) => ({
          chemin: `/accounting/transactions/${identifiant(data.id, "d'écriture")}`,
          method: 'PUT',
          body: data.updates
        })
      },
      delete: {
        permission: 'accounting:ledger:delete',
        route: (data) => ({
          chemin: `/accounting/transactions/${identifiant(data.id, "d'écriture")}`,
          method: 'DELETE'
        })
      }
    }
  },

  'cash-box': {
    permission: 'accounting:ledger:read',
    charger: async (lire, locals, params) => {
      const saisonnier = await saison(lire, params);
      const [soldes, mouvements] = await Promise.all([
        lire(`/accounting/seasons/${encodeURIComponent(saisonnier.seasonId)}/balances`),
        lire(`/accounting/transactions?season=${encodeURIComponent(saisonnier.seasonId)}&accountId=cash&limit=100`)
      ]);

      // La caisse porte deux identifiants selon l'âge de la donnée : l'un textuel, l'autre
      // numérique. Les deux se rencontrent encore en base.
      const caisse = (soldes ?? []).find((b: any) => b.accountId === 'cash' || b.accountId === 3);

      return {
        ...saisonnier,
        initialBalance: caisse?.initialBalanceCents ?? caisse?.initialBalance ?? 0,
        transactions: mouvements ?? [],
        canWrite: can(locals, 'accounting:ledger:write'),
        canDelete: can(locals, 'accounting:ledger:delete')
      };
    },
    ecritures: {
      create: {
        permission: 'accounting:ledger:write',
        route: (data) => ({ chemin: '/accounting/transactions', method: 'POST', body: data })
      },
      delete: {
        permission: 'accounting:ledger:delete',
        route: (data) => ({
          chemin: `/accounting/transactions/${identifiant(data.id, "d'écriture")}`,
          method: 'DELETE'
        })
      }
    }
  },

  invoices: {
    permission: 'accounting:invoices:read',
    charger: async (lire, locals, params) => {
      const saisonnier = await saison(lire, params);
      const [factures, categories] = await Promise.all([
        lire(`/accounting/invoices?season=${encodeURIComponent(saisonnier.seasonId)}`),
        /*
          Les catégories comptables : une ligne de facture porte son imputation. Sans
          elle, le rapprochement devait en inventer une, et il l'inventait en dur — toute
          recette de facturation atterrissait sous « Adhésions & Inscriptions ».
        */
        lire('/accounting/categories')
      ]);

      return {
        ...saisonnier,
        invoices: factures ?? [],
        categories: categories ?? [],
        canWrite: can(locals, 'accounting:invoices:write'),
        canDelete: can(locals, 'accounting:invoices:delete')
      };
    },
    ecritures: {
      create: {
        permission: 'accounting:invoices:write',
        route: (data) => ({ chemin: '/accounting/invoices', method: 'POST', body: data.invoice })
      },
      update: {
        permission: 'accounting:invoices:write',
        route: (data) => ({
          chemin: `/accounting/invoices/${identifiant(data.id, 'de facture')}`,
          method: 'PUT',
          body: data.invoice
        })
      },
      status: {
        permission: 'accounting:invoices:write',
        route: (data) => ({
          chemin: `/accounting/invoices/${identifiant(data.id, 'de facture')}/status`,
          method: 'POST',
          body: { status: data.status }
        })
      },
      delete: {
        permission: 'accounting:invoices:delete',
        route: (data) => ({
          chemin: `/accounting/invoices/${identifiant(data.id, 'de facture')}`,
          method: 'DELETE'
        })
      },
      // Lecture à la demande du détail d'une facture : elle ne descend pas avec la liste.
      'get-details': {
        permission: 'accounting:invoices:read',
        route: (data) => ({
          chemin: `/accounting/invoices/${identifiant(data.id, 'de facture')}`,
          method: 'GET'
        })
      }
    }
  }
};

export const { GET, POST } = creerRelais(ECRANS);
