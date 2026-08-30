import { can } from '../../../../lib/guard';
import { creerRelais, identifiant, Refus, type Ecran, type Lecteur } from '../../../../lib/relais';

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

/**
 * La saison précédente, déduite du code `AA-BB`.
 *
 * Sert la colonne de comparaison des rapports. Rend la chaîne vide sur un code qui ne
 * suit pas cette forme : mieux vaut pas de comparaison qu'une comparaison fausse.
 */
function saisonPrecedente(code: string): string {
  const [debut, fin] = code.split('-');
  const a = Number(debut);
  const b = Number(fin);
  if (!Number.isInteger(a) || !Number.isInteger(b)) return '';
  return `${String(a - 1).padStart(2, '0')}-${String(b - 1).padStart(2, '0')}`;
}

/**
 * Rapport de repli, aux huit champs attendus.
 *
 * Le repli n'en portait que trois : quand la lecture échouait, l'écran montrait des soldes
 * **absents** plutôt qu'à zéro, et les trois natures de trésorerie qu'il distingue —
 * comptable, bancaire théorique, relevé — n'avaient aucune valeur à afficher.
 */
const RAPPORT_VIDE = () => ({
  compteResultat: { totalRecettes: 0, totalDepenses: 0, netResult: 0, categories: {} },
  bilanTrésorerie: ['current', 'savings', 'cash'].map((accountId) => ({
    accountId,
    initialBalance: 0,
    finalBalance: 0,
    inVaultCents: 0,
    pendingDebitCents: 0,
    bankTheoreticalCents: 0,
    statementBalanceCents: null as number | null,
    statementDate: null as string | null
  }))
});

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

  /**
   * Les rapports financiers d'une saison.
   *
   * Les téléchargements — PDF d'un rapport, ZIP de l'export — ne passent **pas** par ici :
   * ils vivent sur `/admin/api/accounting/download`, qui relaie un flux binaire sans le
   * lire. C'est ce qui libère la page de son rôle de proxy.
   */
  reports: {
    permission: 'accounting:reports:read',
    charger: async (lire, locals, params) => {
      const saisonnier = await saison(lire, params);
      const { seasons, seasonId } = saisonnier;

      /*
        La saison en cours est arrêtée à aujourd'hui ; une saison passée se lit entière.
        Sans cette distinction, le rapport de l'année courante afficherait des totaux
        projetés sur douze mois dont six ne sont pas écoulés.
      */
      const active = seasons.find((s: any) => s.active === true || s.active === 1);
      const enCours = seasonId === active?.code || seasonId === seasons[seasons.length - 1]?.code;
      const arretedAu = enCours ? `?arretedAu=${new Date().toISOString().split('T')[0]}` : '';

      const [rapport, precedent, categories, classes, budget] = await Promise.all([
        lire(`/accounting/seasons/${encodeURIComponent(seasonId)}/reports${arretedAu}`),
        saisonPrecedente(seasonId)
          ? lire(`/accounting/seasons/${encodeURIComponent(saisonPrecedente(seasonId))}/reports`)
          : Promise.resolve(null),
        lire('/accounting/categories'),
        lire('/accounting/account-classes'),
        lire(`/accounting/seasons/${encodeURIComponent(seasonId)}/budget`)
      ]);

      return {
        ...saisonnier,
        report: rapport ?? RAPPORT_VIDE(),
        prevReport: precedent,
        categories: categories ?? [],
        accountClasses: classes ?? [],
        budget: budget ?? [],
        errorMsg: rapport ? null : 'Impossible de charger les données du bilan AG.',
        canUseAi: can(locals, 'ai:assistant:use'),
        canWriteBudget: can(locals, 'accounting:budget:write')
      };
    },
    ecritures: {
      /*
        Une seule écriture, et c'est volontaire. La page en portait une seconde — les
        soldes initiaux — dans une branche `else` que la table des actions rendait
        **inatteignable** : tout ce qui n'était pas `save_budget` était refusé avant d'y
        parvenir. La recopier ici aurait installé un chemin d'écriture sans permission
        propre, qui se serait ouvert au premier ajout dans la table.
      */
      save_budget: {
        permission: 'accounting:budget:write',
        route: (data) => ({
          chemin: `/accounting/seasons/${encodeURIComponent(String(data.seasonId ?? ''))}/budget`,
          method: 'POST',
          body: data.budget
        })
      }
    }
  },

  /**
   * Les chèques et leurs bordereaux de remise.
   *
   * Un seul écran de relais pour **deux pages** — « Gestion des chèques » et « Remise de
   * bordereaux » — qui ne diffèrent que par leur titre et l'onglet ouvert. Elles
   * chargeaient les mêmes données par deux gestionnaires jumeaux ; les tenir en double
   * garantissait qu'ils finiraient par diverger.
   *
   * La lecture d'une image de chèque par l'IA ne passe pas par ici : c'est un dépôt de
   * fichier, il vit sur `/admin/api/accounting/upload`.
   */
  cheques: {
    permission: 'accounting:checks:read',
    charger: async (lire, locals, params) => {
      const saisonnier = await saison(lire, params);
      const s = encodeURIComponent(saisonnier.seasonId);
      const [cheques, bordereaux, adherents, lignesBancaires] = await Promise.all([
        lire(`/accounting/checks?season=${s}`),
        lire(`/accounting/check-deposits?season=${s}`),
        lire(`/members?limit=1000&season=${s}`),
        lire(`/accounting/bank-transactions?season=${s}`)
      ]);

      return {
        ...saisonnier,
        checks: cheques ?? [],
        checkDeposits: bordereaux ?? [],
        members: adherents ?? [],
        // Seules les lignes encore à rapprocher, et au crédit : une remise de chèques
        // ne s'adosse pas à un débit.
        pendingBankTransactions: (lignesBancaires ?? []).filter(
          (tx: any) => tx.status === 'pending' && tx.amount > 0
        ),
        canWrite: can(locals, 'accounting:checks:write'),
        canDelete: can(locals, 'accounting:checks:delete')
      };
    },
    ecritures: {
      'create-check': {
        permission: 'accounting:checks:write',
        route: (data) => ({ chemin: '/accounting/checks', method: 'POST', body: data })
      },
      'delete-check': {
        permission: 'accounting:checks:delete',
        route: (data) => ({
          chemin: `/accounting/checks/${identifiant(data.id, 'de chèque')}`,
          method: 'DELETE'
        })
      },
      'create-deposit': {
        permission: 'accounting:checks:write',
        route: (data) => ({ chemin: '/accounting/check-deposits', method: 'POST', body: data })
      },
      'delete-deposit': {
        permission: 'accounting:checks:delete',
        route: (data) => ({
          chemin: `/accounting/check-deposits/${identifiant(data.id, 'de bordereau')}/delete`,
          method: 'POST'
        })
      },
      'clear-deposit': {
        permission: 'accounting:checks:write',
        route: (data) => ({
          chemin: `/accounting/check-deposits/${identifiant(data.id, 'de bordereau')}/clear`,
          method: 'POST',
          body: data
        })
      }
    }
  },

  /**
   * Le rapprochement bancaire.
   *
   * L'écran le plus cher de l'administration avant conversion : 148 ms, seize lectures.
   *
   * L'import d'un relevé ne passe pas par ici — c'est un dépôt de fichier, il vit sur
   * `/admin/api/accounting/upload`, où il porte enfin la permission
   * `accounting:bank:import` que le catalogue déclarait sans que personne l'applique.
   */
  reconciliation: {
    permission: 'accounting:bank:read',
    charger: async (lire, locals, params) => {
      const saisonnier = await saison(lire, params);
      const { seasons, seasonId } = saisonnier;
      const s = encodeURIComponent(seasonId);

      /*
        Les adhérents de la saison suivante sont chargés en plus : un encaissement de
        septembre concerne souvent l'adhésion de l'année qui commence, et le compte
        « produit constaté d'avance » est là pour ça.
      */
      const suivante = seasons[seasons.findIndex((x: any) => (x.code || String(x.id)) === seasonId) + 1];
      const codeSuivant = suivante ? suivante.code || String(suivante.id) : null;

      const [lignes, ecritures, adherents, adherentsSuivants, categories, etats] = await Promise.all([
        /*
          Toutes les lignes, sans borne d'exercice : une ligne de relevé n'appartient à
          aucune saison, c'est un mouvement daté. Les borner à l'exercice consulté faisait
          disparaître de la file, au 1er septembre, tout ce qui restait à rapprocher de
          l'année écoulée — et l'écran n'avait rien pour le dire.
        */
        lire('/accounting/bank-transactions'),
        /*
          Le solde progressif est refusé : c'est une sous-requête corrélée, réévaluée pour
          chacune des 2000 écritures demandées, et cet écran ne l'affiche nulle part.
        */
        lire(`/accounting/transactions?season=${s}&page=1&limit=2000&runningBalance=0`),
        lire(`/members?season=${s}&limit=500`),
        codeSuivant
          ? lire(`/members?season=${encodeURIComponent(codeSuivant)}&limit=500`)
          : Promise.resolve(null),
        lire('/accounting/categories'),
        /*
          L'état de rapprochement ne s'établit que pour les comptes dont un relevé a été
          importé ; sans relevé la réponse est vide, et l'encart ne s'affiche pas.
        */
        lire(`/accounting/reconciliation-statements?season=${s}`)
      ]);

      const membres = [...(adherents ?? [])];
      if (adherentsSuivants) {
        // `seasonCode` n'est posé que sur ceux de l'autre saison : c'est lui qui les
        // signale à l'écran, et son absence vaut « saison consultée ».
        const connus = new Set(membres.map((m: any) => m.id));
        for (const membre of adherentsSuivants as any[]) {
          if (!connus.has(membre.id)) membres.push({ ...membre, seasonCode: codeSuivant });
        }
      }

      return {
        ...saisonnier,
        bankStatementLines: lignes ?? [],
        glTransactions: ecritures ?? [],
        members: membres,
        dbCategories: categories ?? [],
        reconciliationStatements: etats ?? [],
        canReconcile: can(locals, 'accounting:bank:reconcile')
      };
    },
    ecritures: {
      analyze: {
        permission: 'accounting:bank:reconcile',
        route: (data) => ({
          chemin: data.btId
            ? `/accounting/bank-transactions/analyze?season=${encodeURIComponent(String(data.season ?? ''))}&id=${identifiant(data.btId, 'de ligne bancaire')}`
            : `/accounting/bank-transactions/analyze?season=${encodeURIComponent(String(data.season ?? ''))}`,
          method: 'POST'
        })
      },
      ...Object.fromEntries(
        (['create', 'match', 'reconcile'] as const).map((action) => [
          action,
          {
            permission: action === 'create' ? 'accounting:ledger:write' : 'accounting:bank:reconcile',
            /*
              Sans identifiant, on refuse ici plutôt que d'appeler l'API. Le gabarit d'URL
              acceptait `undefined` sans broncher et produisait
              `/bank-transactions/undefined/reconcile`, que l'API rejetait en 400 — un
              message qui ne disait ni quelle ligne, ni pourquoi.
            */
            route: (data: any) => {
              const brut = data.btId ?? data.match?.btId;
              if (brut === undefined || brut === null || brut === '') {
                throw new Refus(
                  "Aucune ligne bancaire n'est sélectionnée : rechargez la page et resélectionnez l'opération à rapprocher."
                );
              }
              return {
                chemin: `/accounting/bank-transactions/${identifiant(brut, 'de ligne bancaire')}/reconcile`,
                method: 'POST',
                body: data.match ?? data
              };
            }
          }
        ])
      ),
      ...Object.fromEntries(
        (['bulk', 'reconcile-bulk'] as const).map((action) => [
          action,
          {
            permission: 'accounting:bank:reconcile' as const,
            route: (data: any) => ({
              chemin: '/accounting/bank-transactions/reconcile-bulk',
              method: 'POST',
              body: { requests: data.requests }
            })
          }
        ])
      ),
      ignore: {
        permission: 'accounting:bank:reconcile',
        route: (data) => ({
          chemin: `/accounting/bank-transactions/${identifiant(data.btId, 'de ligne bancaire')}/ignore`,
          method: 'POST'
        })
      },
      unignore: {
        permission: 'accounting:bank:reconcile',
        route: (data) => ({
          chemin: `/accounting/bank-transactions/${identifiant(data.btId, 'de ligne bancaire')}/unignore`,
          method: 'POST'
        })
      },
      ...Object.fromEntries(
        (['delete-transaction', 'delete-ledger-entry'] as const).map((action) => [
          action,
          {
            permission: 'accounting:ledger:delete' as const,
            route: (data: any) => ({
              chemin: `/accounting/transactions/${identifiant(data.txId, "d'écriture")}`,
              method: 'DELETE'
            })
          }
        ])
      ),
      /*
        L'encart d'état de rapprochement se relit seul après chaque écriture : c'est le
        seul morceau de l'écran que le client ne peut pas recalculer, l'écart tenant au
        solde annoncé par la banque.
      */
      'get-reconciliation-statements': {
        permission: 'accounting:bank:read',
        route: (data) => ({
          chemin: `/accounting/reconciliation-statements?season=${encodeURIComponent(String(data.season ?? ''))}`,
          method: 'GET'
        })
      },
      'get-unpaid-invoices': {
        permission: 'accounting:invoices:read',
        route: (data) => ({
          chemin: `/accounting/invoices?season=${encodeURIComponent(String(data.season ?? ''))}`,
          method: 'GET'
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
