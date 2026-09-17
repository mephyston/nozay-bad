import { can } from '../../../../lib/guard';
import { oublierClub } from '../../../../lib/club';
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

/** Le code d'un exercice tel que l'API le désigne, l'identifiant à défaut. */
const codeDe = (x: any) => String(x.code || x.id);

/**
 * Les exercices dans lesquels on peut encore écrire : les non clôturés, plus le consulté.
 *
 * C'est la borne du rapprochement, de l'annuaire et des écritures pointables. Auto-limitante :
 * clôturer un exercice le fait sortir, le coût de lecture ne grandit donc pas sans fin.
 * `closedAt` et non `closed` : le référentiel rend la colonne telle quelle.
 */
function exercicesOuverts(seasons: any[], seasonId: string): string[] {
  return Array.from(new Set([seasonId, ...seasons.filter((x) => !x.closedAt).map(codeDe)]));
}

/**
 * L'annuaire des exercices ouverts, fondu en une liste où chaque adhésion porte SON code.
 *
 * `ledger_entries.member_id` désigne une adhésion, pas une personne : la même personne a un
 * identifiant par exercice, et une écriture doit se rattacher à celle de SON exercice — celui
 * de sa date, que le formulaire déduit, et non celui qu'on consulte. Une ligne d'août saisie
 * depuis 26-27 vise 25-26 : il faut donc les deux annuaires, et un marqueur sur chacun. La
 * convention précédente — pas de code valait « exercice consulté » — rendait une liste vide,
 * sans un mot, dès que l'exercice visé n'était pas le consulté.
 *
 * Chargé pour le rapprochement, et depuis que le formulaire du grand livre rattache une
 * recette à l'adhérent qui paie, pour le grand livre et l'écran d'un compte — c'est ainsi
 * qu'une cotisation en espèces ou en bons compte pour son dossier.
 */
async function annuaireOuvert(lire: Lecteur, seasons: any[], seasonId: string): Promise<any[]> {
  const annuaires = await Promise.all(
    exercicesOuverts(seasons, seasonId).map(async (code) => ({
      code,
      membres: ((await lire(`/members?season=${encodeURIComponent(code)}&limit=500`)) ?? []) as any[]
    }))
  );
  const membres: any[] = [];
  const connus = new Set<unknown>();
  for (const { code, membres: annuaire } of annuaires) {
    for (const membre of annuaire) {
      if (connus.has(membre.id)) continue;
      connus.add(membre.id);
      membres.push({ ...membre, seasonCode: code });
    }
  }
  return membres;
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
  // Aucun compte n'est nommé ici : ils sont des données, et l'écran sait montrer une liste vide.
  bilanTrésorerie: [] as {
    accountId: string;
    label: string;
    thirdParty: boolean;
    initialBalance: number;
    finalBalance: number;
    inVaultCents: number;
    pendingDebitCents: number;
    bankTheoreticalCents: number;
    statementBalanceCents: number | null;
    statementDate: string | null;
  }[]
});

/** Classe 4 du plan comptable : un compte de tiers, dont le solde est une dette et non de la trésorerie. */
const estCompteDeTiers = (compte: any) => /^4/.test(String(compte.classCode ?? ''));

/** Code de saison ou de classe, tel qu'il rejoindra un chemin d'API. */
function code(valeur: unknown, quoi: string): string {
  const brut = String(valeur ?? '');
  if (!/^[A-Za-z0-9-]{1,16}$/.test(brut)) throw new Refus(`Code ${quoi} invalide.`);
  return brut;
}

export const ECRANS: Record<string, Ecran> = {
  ledger: {
    feature: 'accounting',
    permission: 'accounting:ledger:read',
    charger: async (lire, locals, params) => {
      const saisonnier = await saison(lire, params);

      /*
        Les filtres du grand livre voyagent tels quels, y compris le sens de l'écriture :
        le compte de résultat sépare charges et produits, et un lien de catégorie qui
        ramènerait les deux mélangés ouvre trois cents cotisations pour y trouver sept
        remboursements.
      */
      // Le compte affiché par défaut est le compte bancaire principal du club : le premier
      // compte de nature `bank` actif, et non plus un code écrit ici.
      const [comptes, moyens]: [any[], any[]] = await Promise.all([
        lire('/accounting/accounts').then((r: any) => r ?? []),
        lire('/accounting/payment-methods?offered=admin').then((r: any) => r ?? [])
      ]);
      const comptePrincipal = comptes.find((c) => c.kind === 'bank' && c.active !== false)?.code ?? comptes[0]?.code ?? '';
      const compteDemande = params.get('accountId') || comptePrincipal;
      const requete = new URLSearchParams({
        season: saisonnier.seasonId,
        page: params.get('page') || '1',
        limit: params.get('limit') || '20',
        accountId: compteDemande
      });
      for (const cle of ['category', 'classCode', 'type', 'search', 'month', 'accrual'] as const) {
        const valeur = params.get(cle);
        if (valeur) requete.set(cle, valeur);
      }
      if (params.get('unreconciledCheques') === 'true') requete.set('unreconciledCheques', 'true');

      const [mouvements, rapport, categories, classes, membres] = await Promise.all([
        lire.detail(`/accounting/transactions?${requete}`),
        lire(`/accounting/seasons/${encodeURIComponent(saisonnier.seasonId)}/reports`),
        lire('/accounting/categories'),
        lire('/accounting/account-classes'),
        annuaireOuvert(lire, saisonnier.seasons, saisonnier.seasonId)
      ]);

      return {
        ...saisonnier,
        transactions: mouvements.data ?? [],
        // La pagination vit à côté de `data` dans l'enveloppe : `lire` ne rend que `data`,
        // d'où la lecture détaillée pour la récupérer.
        pagination: mouvements.enveloppe?.pagination ?? { total: 0, page: 1, limit: 20, totalPages: 1 },
        balances: rapport?.bilanTrésorerie ?? [],
        accounts: comptes.filter((c) => c.active !== false).map((c) => ({ id: c.id, code: c.code, label: c.label, kind: c.kind })),
        paymentMethods: moyens.map((m) => ({ code: m.code, label: m.label, kind: m.kind })),
        mainAccountId: comptePrincipal,
        categories: categories ?? [],
        accountClasses: classes ?? [],
        members: membres,
        unreconciledChequesOnly: params.get('unreconciledCheques') === 'true',
        accountId: compteDemande,
        searchQuery: params.get('search') || '',
        month: params.get('month') || '',
        accrual: params.get('accrual') || '',
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
    feature: 'accounting',
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
    feature: 'checks',
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
      'update-check': {
        permission: 'accounting:checks:write',
        route: (data) => ({
          chemin: `/accounting/checks/${identifiant(data.id, 'de chèque')}`,
          method: 'PUT',
          body: data
        })
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
      'confirm-deposit': {
        permission: 'accounting:checks:write',
        route: (data) => ({
          chemin: `/accounting/check-deposits/${identifiant(data.id, 'de bordereau')}/deposit`,
          method: 'POST',
          body: data.date ? { date: data.date } : {}
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
    feature: 'accounting',
    permission: 'accounting:bank:read',
    charger: async (lire, locals, params) => {
      const saisonnier = await saison(lire, params);
      const { seasons, seasonId } = saisonnier;
      const s = encodeURIComponent(seasonId);

      // Les écritures pointables et l'annuaire partagent la borne : on ne peut écrire que dans
      // un exercice non clôturé, donc on ne peut viser que ceux-là (voir `annuaireOuvert`).
      const exercicesCibles = exercicesOuverts(seasons, seasonId);

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

      const [enAttente, delExercice, listesEcritures, membres, categories, etats, comptes] = await Promise.all([
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
        annuaireOuvert(lire, seasons, seasonId),
        lire('/accounting/categories'),
        /*
          L'état de rapprochement ne s'établit que pour les comptes dont un relevé a été
          importé ; sans relevé la réponse est vide, et l'encart ne s'affiche pas.
        */
        lire(`/accounting/reconciliation-statements?season=${s}`),
        // Les comptes et leur nature : le virement d'une adhérente se propose sur une ligne
        // d'un compte bancaire et se crée depuis le compte d'attente, quels que soient leurs codes.
        lire('/accounting/accounts').then((r: any) => r ?? [])
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
        accounts: comptes,
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
      /*
        Le virement reçu d'une adhérente, saisi depuis sa ligne de relevé : le relais ne fait
        qu'un appel par écriture, donc l'écran crée le virement ici, puis pointe sa jambe
        bancaire par « match ». Même corps blanchi que le grand livre.
      */
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
   * Les comptes de trésorerie et les moyens de paiement : la porte de la comptabilité.
   *
   * Aucune fonctionnalité ne garde cet écran : c'est ici qu'un club sans compte bancaire
   * en crée un, et la comptabilité s'ouvre à la lecture suivante. Les moyens se lisent sans
   * filtre — inactifs compris, avec leur usage — car c'est l'écran qui décide de leur sort.
   */
  treasury: {
    permission: 'accounting:config:read',
    // Les comptes font le menu (une entrée par caisse) et ouvrent la comptabilité : le
    // contexte du club gardé par l'isolate doit être relu à la requête suivante.
    apres: oublierClub,
    charger: async (lire, locals) => {
      const [comptes, moyens, classes] = await Promise.all([
        lire('/accounting/accounts'),
        lire('/accounting/payment-methods'),
        lire('/accounting/account-classes')
      ]);
      return {
        accounts: comptes ?? [],
        paymentMethods: moyens ?? [],
        accountClasses: classes ?? [],
        canWrite: can(locals, 'accounting:config:write')
      };
    },
    ecritures: {
      create_account: {
        permission: 'accounting:config:write',
        route: (data) => ({
          chemin: '/accounting/accounts',
          method: 'POST',
          body: {
            code: data.code,
            label: data.label,
            accountClassCode: data.accountClassCode,
            kind: data.kind,
            statementAccountNumber: data.statementAccountNumber || null
          }
        })
      },
      update_account: {
        permission: 'accounting:config:write',
        route: (data) => ({
          chemin: `/accounting/accounts/${identifiant(data.id, 'de compte')}`,
          method: 'PUT',
          body: {
            ...(data.label !== undefined ? { label: data.label } : {}),
            ...(data.accountClassCode !== undefined ? { accountClassCode: data.accountClassCode } : {}),
            ...(data.kind !== undefined ? { kind: data.kind } : {}),
            ...(data.active !== undefined ? { active: data.active } : {}),
            ...(data.statementAccountNumber !== undefined ? { statementAccountNumber: data.statementAccountNumber || null } : {})
          }
        })
      },
      create_payment_method: {
        permission: 'accounting:config:write',
        route: (data) => ({
          chemin: '/accounting/payment-methods',
          method: 'POST',
          body: {
            code: data.code,
            label: data.label,
            kind: data.kind,
            defaultAccountCode: data.defaultAccountCode,
            defaultEntryStatus: data.defaultEntryStatus,
            storefront: data.storefront
          }
        })
      },
      update_payment_method: {
        permission: 'accounting:config:write',
        route: (data) => ({
          chemin: `/accounting/payment-methods/${identifiant(data.id, 'de moyen de paiement')}`,
          method: 'PUT',
          body: {
            ...(data.label !== undefined ? { label: data.label } : {}),
            ...(data.kind !== undefined ? { kind: data.kind } : {}),
            ...(data.defaultAccountCode !== undefined ? { defaultAccountCode: data.defaultAccountCode } : {}),
            ...(data.defaultEntryStatus !== undefined ? { defaultEntryStatus: data.defaultEntryStatus } : {}),
            ...(data.active !== undefined ? { active: data.active } : {}),
            ...(data.storefront !== undefined ? { storefront: data.storefront } : {})
          }
        })
      },
      delete_payment_method: {
        permission: 'accounting:config:write',
        route: (data) => ({
          chemin: `/accounting/payment-methods/${identifiant(data.id, 'de moyen de paiement')}`,
          method: 'DELETE'
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
      const [categories, classes, comptes] = await Promise.all([
        lire('/accounting/categories'),
        lire('/accounting/account-classes'),
        // Les comptes du club, en lecture seule : l'écran dit où chacun se range dans le plan.
        lire('/accounting/accounts')
      ]);
      return { categories: categories ?? [], accountClasses: classes ?? [], accounts: comptes ?? [] };
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
                  thirdParty: estCompteDeTiers(c),
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
              return { accountId: c.code, label: c.label, thirdParty: estCompteDeTiers(c), initialBalanceCents: ligne?.finalBalance ?? 0 };
            });
            return { ...s, isAutoFilled, initialBalances };
          })
        )
      };
    }
  },

  /**
    Un compte sans relevé, vu de près : la caisse, le porte-monnaie Badnet, le compte
    d'attente des adhérents. Le code vient de l'URL de la page et se vérifie contre la
    liste des comptes ; les écritures passent par le relais du grand livre, qui sait déjà
    tout écrire.
  */
  account: {
    feature: 'accounting',
    permission: 'accounting:ledger:read',
    charger: async (lire, locals, params) => {
      const codeCompte = String(params.get('account') ?? '');
      if (!/^[a-z_]{1,32}$/.test(codeCompte)) throw new Refus('Code de compte invalide.');

      const [saisonnier, comptes, moyens]: [any, any[], any[]] = await Promise.all([
        saison(lire, params),
        lire('/accounting/accounts').then((r: any) => r ?? []),
        lire('/accounting/payment-methods?offered=admin').then((r: any) => r ?? [])
      ]);
      const compte = comptes.find((c) => c.code === codeCompte);
      if (!compte) throw new Refus(`Compte « ${codeCompte} » inconnu.`);

      const s = encodeURIComponent(saisonnier.seasonId);
      const enrichi = (c: any) => ({ id: c.id, code: c.code, label: c.label, kind: c.kind, thirdParty: estCompteDeTiers(c) });

      /*
        Les avances des adhérents se rendent depuis l'écran Badnet et se lisent sur celui du
        compte d'attente : ces deux écrans reçoivent aussi les écritures du compte d'attente.
      */
      const veutAvances = compte.kind === 'wallet' || compte.kind === 'third_party' || estCompteDeTiers(compte);
      // Le compte d'attente des adhérents, reconnu à sa nature : ses écritures portent les avances.
      const compteAttente = comptes.find((c) => c.kind === 'third_party' && c.active !== false) ?? comptes.find((c) => estCompteDeTiers(c));

      /*
        Les avances se lisent sur TOUS les exercices ouverts, et non sur le seul consulté : un
        virement reçu en août se rend en septembre, sur l'exercice suivant, et l'appariement
        reçu/rendu doit voir les deux. Bornées à l'exercice affiché, l'avance d'août restait
        « en attente » sur 25-26 pendant que son crédit vivait sur 26-27. Même borne que
        l'archive du rapprochement : la clôture, seule chose qui ferme un exercice.
      */
      const lireAvances = () =>
        Promise.all(
          exercicesOuverts(saisonnier.seasons, saisonnier.seasonId).map((code) =>
            lire(`/accounting/transactions?season=${encodeURIComponent(code)}&accountId=${encodeURIComponent(compteAttente.code)}&limit=200`)
          )
        ).then((listes) => listes.flatMap((l: any) => l ?? []));

      const [soldes, mouvements, categories, avances, membres] = await Promise.all([
        lire(`/accounting/seasons/${s}/balances`),
        lire(`/accounting/transactions?season=${s}&accountId=${encodeURIComponent(codeCompte)}&limit=200`),
        lire('/accounting/categories'),
        veutAvances && compteAttente ? lireAvances() : Promise.resolve(null),
        annuaireOuvert(lire, saisonnier.seasons, saisonnier.seasonId)
      ]);

      const solde = (soldes ?? []).find((b: any) => b.accountId === compte.code || b.accountId === compte.id);
      const ecritures = mouvements ?? [];

      return {
        ...saisonnier,
        account: enrichi(compte),
        accounts: comptes.filter((c) => c.active !== false || c.code === codeCompte).map(enrichi),
        paymentMethods: moyens.map((m) => ({ code: m.code, label: m.label, kind: m.kind })),
        initialBalance: solde?.initialBalanceCents ?? solde?.initialBalance ?? 0,
        transactions: ecritures,
        categories: categories ?? [],
        memberAdvanceEntries: veutAvances ? avances ?? [] : [],
        members: membres,
        canWrite: can(locals, 'accounting:ledger:write'),
        canDelete: can(locals, 'accounting:ledger:delete')
      };
    }
  },

  invoices: {
    feature: 'invoices',
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
