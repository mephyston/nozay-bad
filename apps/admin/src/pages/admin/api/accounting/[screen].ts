import { can } from '../../../../lib/guard';
import { creerRelais, identifiant, Refus, type Ecran, type Lecteur } from '../../../../lib/relais';
import { currentSeasonCode, sortSeasons } from '../../../../lib/seasons';

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
 * Le tri chronologique et le choix par défaut — l'active de la configuration — vivent
 * dans `lib/seasons`, et sont donc les mêmes que pour les interclubs, la boutique ou les
 * notes de frais : cette rubrique en portait sa propre copie, et c'est ainsi que les
 * défauts avaient divergé. `closed` conditionne l'affichage en lecture seule, et le nom
 * sert au sous-titre — deux choses que la page calculait après coup.
 */
async function saison(lire: Lecteur, params: URLSearchParams) {
  const seasons: any[] = sortSeasons((await lire('/accounting/seasons')) ?? []);

  const demandee = params.get('season') ?? '';
  const seasonId = demandee || currentSeasonCode(seasons) || '25-26';

  const courante = seasons.find((s: any) => s.code === seasonId || String(s.id) === seasonId);
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
  bilanTrésorerie: [
    ['current', 'Compte Courant'],
    ['savings', 'Livret A / Épargne'],
    ['cash', 'Caisse Buvette'],
    ['badnet', 'Porte-monnaie Badnet']
  ].map(([accountId, label]) => ({
    accountId,
    label,
    initialBalance: 0,
    finalBalance: 0,
    inVaultCents: 0,
    pendingDebitCents: 0,
    bankTheoreticalCents: 0,
    statementBalanceCents: null as number | null,
    statementDate: null as string | null
  }))
});

/** Code de saison ou de classe, tel qu'il rejoindra un chemin d'API. */
function code(valeur: unknown, quoi: string): string {
  const brut = String(valeur ?? '');
  if (!/^[A-Za-z0-9-]{1,16}$/.test(brut)) throw new Refus(`Code ${quoi} invalide.`);
  return brut;
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
        Les annuaires chargés : ceux de TOUS les exercices ouverts, et non plus « le consulté
        et le suivant ».

        Une adhésion appartient à un exercice, avec un identifiant différent d'une année sur
        l'autre. Le formulaire déduit l'exercice de rattachement de la DATE de la ligne : une
        ligne d'août rapprochée depuis 26-27 vise donc 25-26. On ne chargeait pas cet
        annuaire-là — seulement le consulté et le suivant — et la liste des adhérents
        s'affichait **vide**, sans rien dire, exactement quand on en avait besoin.

        « Ouvert » est la même borne que pour l'archive, et c'est la bonne : on ne peut écrire
        que dans un exercice non clôturé, donc on ne peut viser que ceux-là.
      */
      const codeDe = (x: any) => String(x.code || x.id);
      const exercicesCibles = Array.from(new Set([
        seasonId,
        ...seasons.filter((x: any) => !x.closedAt).map(codeDe)
      ]));

      /*
        L'intervalle de l'archive : tous les exercices non clôturés, plus celui qu'on consulte
        — ce dernier pouvant être clôturé, on ne va pas le rendre invisible pour autant.

        `closedAt` et non `closed` : le référentiel rend la colonne telle quelle, et le champ
        `closed` que d'autres endroits testent n'existe nulle part dans la réponse.
      */
      const consultee = seasons.find((x: any) => (x.code || String(x.id)) === seasonId);
      const retenues = seasons.filter((x: any) => !x.closedAt || x === consultee);
      const bornes = (retenues.length > 0 ? retenues : seasons).filter((x: any) => x.startDate && x.endDate);
      const archive = {
        debut: bornes.reduce((min: string, x: any) => (x.startDate < min ? x.startDate : min), bornes[0]?.startDate ?? '1970-01-01'),
        fin: bornes.reduce((max: string, x: any) => (x.endDate > max ? x.endDate : max), bornes[0]?.endDate ?? '2999-12-31')
      };

      const [enAttente, delExercice, listesEcritures, annuaires, categories, etats] = await Promise.all([
        /*
          Les lignes encore à rapprocher, sans borne d'exercice : une ligne de relevé
          n'appartient à aucune saison, c'est un mouvement daté. Les borner à l'exercice
          consulté faisait disparaître de la file, au 1er septembre, tout ce qui restait à
          rapprocher de l'année écoulée — et l'écran n'avait rien pour le dire.
        */
        lire('/accounting/bank-transactions?status=pending'),
        /*
          Et l'archive : les lignes des exercices encore OUVERTS, tous états confondus.

          La borne était l'exercice consulté, sur l'idée que « l'archive n'est jamais montrée
          que pour l'exercice choisi ». C'était faux d'un cran : une ligne d'août encore en
          attente figure bien dans la file — celle-ci n'a pas de borne de date, exprès — mais
          la rapprocher la faisait passer dans l'ensemble borné, et elle DISPARAISSAIT de
          l'écran à la seconde où on la rapprochait. Impossible de relire ce qu'on venait de
          faire sans changer de saison.

          La borne juste n'est pas l'exercice consulté mais la clôture : tant qu'un exercice
          n'est pas clôturé, on peut encore agir dessus, donc on doit encore le voir. Elle est
          auto-limitante — clôturer 25-26 fait sortir ses lignes — là où la demande nue qu'on
          a remplacée rapatriait chaque ligne jamais importée (1 188 par ouverture, mesurées
          sur l'analytique D1, premier poste de lecture du compte).
        */
        lire(`/accounting/bank-transactions?startDate=${archive.debut}&endDate=${archive.fin}`),
        /*
          Les écritures pointables, de TOUS les exercices ouverts.

          Elles étaient bornées à l'exercice consulté, alors que la file, elle, montre les
          lignes de relevé de tous les exercices : une ligne d'août proposée au pointage
          n'avait donc en face aucune des écritures d'août. Constaté en production le
          2026-09-01 — une commande de cordage rattachée à 25-26, introuvable depuis 26-27,
          sans que l'écran dise pourquoi.

          Même borne que l'archive et que les annuaires : on ne peut pointer qu'une écriture
          d'un exercice ouvert — `buildReconciliationStatements` refuse les autres — donc
          charger les exercices clos ne servirait qu'à proposer des refus.

          Le solde progressif est refusé : c'est une sous-requête corrélée, réévaluée pour
          chacune des 2000 écritures demandées, et cet écran ne l'affiche nulle part.
        */
        Promise.all(
          exercicesCibles.map((code) =>
            lire(`/accounting/transactions?season=${encodeURIComponent(code)}&page=1&limit=2000&runningBalance=0`)
          )
        ),
        Promise.all(
          exercicesCibles.map(async (code) => ({
            code,
            membres: (await lire(`/members?season=${encodeURIComponent(code)}&limit=500`)) ?? []
          }))
        ),
        lire('/accounting/categories'),
        /*
          L'état de rapprochement ne s'établit que pour les comptes dont un relevé a été
          importé ; sans relevé la réponse est vide, et l'encart ne s'affiche pas.
        */
        lire(`/accounting/reconciliation-statements?season=${s}`)
      ]);

      /*
        Les écritures des exercices ouverts, fondues en une liste sans doublon.

        Une écriture ne peut relever que d'un exercice, donc le recouvrement est nul en
        théorie — la déduplication est là parce qu'une liste d'écritures pointables qui
        proposerait deux fois la même laisserait la pointer deux fois.
      */
      const vues = new Set<unknown>();
      const ecritures: any[] = [];
      for (const liste of listesEcritures as any[][]) {
        for (const ecriture of liste ?? []) {
          if (vues.has(ecriture.id)) continue;
          vues.add(ecriture.id);
          ecritures.push(ecriture);
        }
      }

      /*
        Chaque adhésion porte SON code d'exercice, sans exception.

        La convention précédente — « pas de `seasonCode` » valait « exercice consulté » —
        était muette et fausse dès que l'exercice visé n'était pas celui qu'on consultait :
        le filtre cherchait alors un code que personne ne portait, et rendait une liste vide.
        Un marqueur implicite ne se voit pas quand il manque.
      */
      const membres: any[] = [];
      const connus = new Set<unknown>();
      for (const { code, membres: annuaire } of annuaires as { code: string; membres: any[] }[]) {
        for (const membre of annuaire) {
          if (connus.has(membre.id)) continue;
          connus.add(membre.id);
          membres.push({ ...membre, seasonCode: code });
        }
      }

      /*
        Les deux demandes se recouvrent — une ligne en attente datée dans l'exercice figure
        dans les deux — et l'écran dérive tout d'un seul tableau : compteurs, progression,
        filtre par compte. Un doublon y compterait deux fois.

        L'ordre est celui de l'archive, la plus récente d'abord, comme le rendait la demande
        unique qu'elles remplacent : c'est lui que la file et les onglets suivent.
      */
      const parId = new Map<number, any>();
      for (const ligne of [...((enAttente as any[]) ?? []), ...((delExercice as any[]) ?? [])]) {
        if (!parId.has(ligne.id)) parId.set(ligne.id, ligne);
      }
      const lignes = [...parId.values()].sort(
        (a, b) => String(b.date).localeCompare(String(a.date)) || b.id - a.id
      );

      return {
        ...saisonnier,
        bankStatementLines: lignes,
        glTransactions: ecritures,
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

  /**
   * Le plan comptable : catégories et classes de comptes.
   *
   * Rangé sous « Configuration » dans le menu, mais gardé par `accounting:config:*` — et
   * c'est la permission qui décide du domaine, pas la barre latérale. C'est aussi
   * l'adresse d'écriture des saisons, dont les actions vivent ici : les modules qui les
   * portent sont partagés avec les catégories, et les séparer n'apporterait rien.
   */
  config: {
    permission: 'accounting:config:read',
    charger: async (lire) => {
      const [categories, classes] = await Promise.all([
        lire('/accounting/categories'),
        lire('/accounting/account-classes')
      ]);
      return { categories: categories ?? [], accountClasses: classes ?? [] };
    },
    ecritures: {
      create_category: {
        permission: 'accounting:config:write',
        route: (data) => ({
          chemin: '/accounting/categories',
          method: 'POST',
          body: {
            adminLabel: data.adminLabel,
            adherentLabel: data.adherentLabel,
            hideInExpenses: data.hideInExpenses,
            receiptCode: data.receiptCode,
            expenseCode: data.expenseCode
          }
        })
      },
      update_category: {
        permission: 'accounting:config:write',
        route: (data) => ({
          chemin: `/accounting/categories/${identifiant(data.id, 'de catégorie')}`,
          method: 'PUT',
          body: data.updates
        })
      },
      delete_category: {
        permission: 'accounting:config:write',
        route: (data) => ({
          chemin: `/accounting/categories/${identifiant(data.id, 'de catégorie')}`,
          method: 'DELETE'
        })
      },
      /*
        Une classe de comptes est désignée par son **code** — « 706 », « 512 » — et non par
        un identifiant numérique. Il est contrôlé comme tel avant de rejoindre le chemin.
      */
      create_account_class: {
        permission: 'accounting:config:write',
        route: (data) => ({
          chemin: '/accounting/account-classes',
          method: 'POST',
          body: { code: data.code, label: data.label, type: data.type }
        })
      },
      update_account_class: {
        permission: 'accounting:config:write',
        route: (data) => ({
          chemin: `/accounting/account-classes/${code(data.code, 'de classe')}`,
          method: 'PUT',
          body: { label: data.label, type: data.type }
        })
      },
      delete_account_class: {
        permission: 'accounting:config:write',
        route: (data) => ({
          chemin: `/accounting/account-classes/${code(data.code, 'de classe')}`,
          method: 'DELETE'
        })
      },

      create_season: {
        permission: 'accounting:seasons:write',
        route: (data) => ({
          chemin: '/accounting/seasons',
          method: 'POST',
          body: { id: data.id, name: data.name, active: data.active }
        })
      },
      activate_season: {
        permission: 'accounting:seasons:write',
        route: (data) => ({
          chemin: `/accounting/seasons/${code(data.id, 'de saison')}`,
          method: 'PUT',
          body: { active: true }
        })
      },
      update_balances: {
        permission: 'accounting:seasons:write',
        route: (data) => ({
          chemin: `/accounting/seasons/${code(data.seasonId, 'de saison')}/balances`,
          method: 'POST',
          body: data.balances
        })
      },
      /*
        Clôturer est irréversible, et porte donc son propre droit — distinct de celui qui
        crée et modifie une saison.
      */
      check_close_season: {
        permission: 'accounting:seasons:close',
        route: (data) => ({
          chemin: `/accounting/seasons/${code(data.id, 'de saison')}/close-checks`,
          method: 'GET'
        })
      },
      close_season: {
        permission: 'accounting:seasons:close',
        route: (data) => ({
          chemin: `/accounting/seasons/${code(data.id, 'de saison')}/close`,
          method: 'POST',
          body: { confirmOverwriteInitialBalances: Boolean(data.confirmOverwrite) }
        })
      }
    }
  },

  /**
   * Les saisons comptables et leurs soldes initiaux.
   *
   * Lecture seule ici : ses écritures vivent sur `config`, l'adresse unique que visent les
   * modules partagés avec les catégories.
   */
  seasons: {
    permission: 'accounting:seasons:write',
    charger: async (lire) => {
      /*
        Les comptes viennent de la base, plus d'une table de trois codes : un compte ajouté
        après le seed (le porte-monnaie Badnet) a droit à son solde initial comme les autres.
        Le solde d'un compte se retrouve par son code ou par son identifiant numérique, les
        deux formes cohabitant encore dans les données.
      */
      const [saisons, comptes]: [any[], any[]] = await Promise.all([
        lire('/accounting/seasons').then((r: any) => r ?? []),
        lire('/accounting/accounts').then((r: any) => r ?? [])
      ]);

      const soldeDe = (soldes: any[], compte: any) =>
        soldes.find(
          (b) => b.accountId === compte.code || b.accountId === compte.id || b.accountNumericId === compte.id
        );

      /*
        Une lecture par saison, plus une seconde quand la saison n'a pas encore de soldes :
        c'est le coût dominant de cet écran, et il est conservé tel quel. C'est lui qui
        permet au formulaire de proposer un report à-nouveau plutôt qu'une saisie à blanc,
        et `isAutoFilled` dit à l'utilisateur d'où vient le chiffre.
      */
      return {
        seasons: await Promise.all(
          saisons.map(async (s) => {
            const codeSaison = s.code || String(s.id);
            const soldes: any[] =
              (await lire(`/accounting/seasons/${encodeURIComponent(codeSaison)}/balances`)) ?? [];

            if (soldes.length > 0) {
              return {
                ...s,
                isAutoFilled: false,
                initialBalances: comptes.map((c) => ({
                  accountId: c.code,
                  label: c.label,
                  initialBalanceCents: soldeDe(soldes, c)?.initialBalanceCents ?? soldeDe(soldes, c)?.initialBalance ?? 0
                }))
              };
            }

            const avant = saisonPrecedente(codeSaison);
            const rapport = avant
              ? await lire(`/accounting/seasons/${encodeURIComponent(avant)}/reports`)
              : null;
            const bilan: any[] = rapport?.bilanTrésorerie ?? [];
            let isAutoFilled = false;
            const initialBalances = comptes.map((c) => {
              const ligne = bilan.find((b) => b.accountId === c.code);
              if (ligne) isAutoFilled = true;
              return { accountId: c.code, label: c.label, initialBalanceCents: ligne?.finalBalance ?? 0 };
            });
            return { ...s, isAutoFilled, initialBalances };
          })
        )
      };
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
