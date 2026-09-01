import { type DbOrTx } from '@nba/db';
import { and, eq, gte, lt, ne, sql } from 'drizzle-orm';
import { ledgerEntriesTable, seasonBalancesTable, seasonsTable } from './schema';

/**
 * Le solde d'ouverture de trésorerie d'un exercice, figé s'il l'est, calculé sinon.
 *
 * `season_balances.initial_balance_cents` n'est écrit que par `closeSeasonWithRollover` : tant
 * que l'exercice précédent n'est pas clôturé, le suivant n'a aucun à-nouveau. Les trois écrans
 * qui affichent un solde en tiraient trois réponses différentes — le bilan de trésorerie le
 * reconstituait, le rapprochement et le grand livre lisaient `0`. D'où, au 1er septembre, un
 * écart de rapprochement égal à toute la trésorerie d'ouverture et un grand livre qui repart
 * de zéro, pendant que le bilan, lui, affichait le bon chiffre.
 *
 * La règle tient en deux temps, celle de n'importe quel logiciel comptable :
 *
 * 1. **Figé gagne.** Un à-nouveau écrit à la clôture fait autorité et n'est jamais recalculé :
 *    c'est la pièce d'ouverture, et le principe d'intangibilité du bilan d'ouverture veut
 *    qu'elle ne bouge plus.
 * 2. **Sinon on calcule**, depuis le dernier point figé antérieur augmenté des mouvements
 *    datés entre ce point et l'ouverture. Deux exercices ouverts en même temps est l'état
 *    normal plusieurs mois par an — on ne fait pas attendre la clôture pour afficher un solde.
 *
 * Ce que le calcul ne doit rien aux travaux d'inventaire mérite d'être dit, parce que c'est ce
 * qui le rend légitime : une charge à payer est par définition une charge dont l'argent bouge
 * APRÈS la date de clôture, et `validateAccrualAndFiscalPhase` le vérifie. Aucune régularisation
 * de fin d'exercice ne peut donc déplacer la trésorerie au 31 août. Le solde d'ouverture n'est
 * pas une estimation en attendant mieux : c'est un fait, connu dès la dernière écriture d'août.
 */
export interface OpeningBalances {
  /** Le solde d'ouverture par identifiant de compte, pour les comptes demandés. */
  byAccountId: Map<number, number>;
  /**
   * Vrai dès qu'au moins un compte a été calculé faute de report figé. L'écran s'en sert pour
   * dire « provisoire » plutôt que d'afficher un nombre muet dont personne ne sait s'il est
   * arrêté.
   */
  provisional: boolean;
}

/*
 * Le signe d'une écriture, en SQL.
 *
 * Doublon assumé de `signedEntryAmountCents` (shared/balances.ts) : le calcul se fait ici en
 * base, sur un `SUM` groupé, et non en rapatriant les lignes. La version précédente chargeait
 * TOUT le grand livre dans le Worker pour en tirer trois nombres — sur le plan gratuit, c'est
 * le nombre de lignes lues en D1 qui est la ressource rare, pas le CPU.
 *
 * Les deux implémentations sont tenues d'accord par un test dédié : voir
 * `opening-balances.test.ts`, « le signe SQL suit signedEntryAmountCents ».
 */
const MONTANT_SIGNE = sql<number>`SUM(CASE
  WHEN ${ledgerEntriesTable.type} = 'recette' THEN ${ledgerEntriesTable.amountCents}
  WHEN ${ledgerEntriesTable.type} = 'depense' THEN -${ledgerEntriesTable.amountCents}
  WHEN ${ledgerEntriesTable.transferLeg} = 'destination' THEN ${ledgerEntriesTable.amountCents}
  WHEN ${ledgerEntriesTable.transferLeg} = 'source' THEN -${ledgerEntriesTable.amountCents}
  ELSE 0
END)`;

export async function resolveOpeningBalances(
  db: DbOrTx,
  season: { id: number; startDate: string },
  accountIds: number[]
): Promise<OpeningBalances> {
  /*
   * Un à-nouveau à zéro est traité comme absent, et se reconstitue donc lui aussi.
   *
   * La base ne distingue pas « délibérément vide » de « jamais renseigné » — les deux valent
   * `0` — et c'est le comportement que le bilan de trésorerie avait déjà. Le faire autrement
   * ici rendrait les écrans à nouveau discordants, ce que tout ce module cherche à empêcher.
   */
  const figes = new Map<number, number>();
  const lignes = await db
    .select({
      accountId: seasonBalancesTable.accountId,
      initialBalanceCents: seasonBalancesTable.initialBalanceCents
    })
    .from(seasonBalancesTable)
    .where(eq(seasonBalancesTable.seasonId, season.id))
    .all();
  for (const ligne of lignes) {
    if ((ligne.initialBalanceCents ?? 0) !== 0) figes.set(ligne.accountId, ligne.initialBalanceCents);
  }

  const aCalculer = accountIds.filter((id) => !figes.has(id));
  if (aCalculer.length === 0) {
    return { byAccountId: new Map(figes), provisional: false };
  }

  /*
   * Le dernier point figé antérieur, et non le plus ancien.
   *
   * Une clôture écrit l'à-nouveau de tous les comptes d'un coup : le point figé est un
   * événement de bilan, pas une valeur par compte. Repartir du plus récent, c'est honorer la
   * dernière clôture au lieu de recalculer à travers elle — et sommer un exercice au lieu de
   * dix.
   */
  const anterieurs = await db
    .select({
      accountId: seasonBalancesTable.accountId,
      initialBalanceCents: seasonBalancesTable.initialBalanceCents,
      startDate: seasonsTable.startDate
    })
    .from(seasonBalancesTable)
    .innerJoin(seasonsTable, eq(seasonBalancesTable.seasonId, seasonsTable.id))
    .where(
      and(
        lt(seasonsTable.startDate, season.startDate),
        ne(seasonBalancesTable.initialBalanceCents, 0)
      )
    )
    .all();

  const depuis = anterieurs.reduce<string | null>(
    (recent, ligne) => (recent === null || ligne.startDate > recent ? ligne.startDate : recent),
    null
  );

  const socle = new Map<number, number>();
  for (const ligne of anterieurs) {
    if (ligne.startDate === depuis) socle.set(ligne.accountId, ligne.initialBalanceCents);
  }

  /*
   * Borne basse : le point figé, ou rien du tout quand il n'y en a jamais eu — c'est alors le
   * tout premier exercice, et le cumul part de l'origine sur un socle nul.
   *
   * Borne haute STRICTE : le 31 août appartient à l'exercice qui se ferme, pas à celui qui
   * s'ouvre. C'est la même coupure que `close-season`, qui borne ses mouvements par les dates
   * de l'exercice et non par `season_id` — les deux vues partitionnent le temps sans
   * recouvrement ni trou, et c'est ce qui rend le report exact.
   */
  const bornes = [lt(ledgerEntriesTable.date, season.startDate)];
  if (depuis !== null) bornes.push(gte(ledgerEntriesTable.date, depuis));

  const cumuls = await db
    .select({
      accountId: ledgerEntriesTable.accountId,
      delta: MONTANT_SIGNE.mapWith(Number)
    })
    .from(ledgerEntriesTable)
    .where(and(...bornes))
    .groupBy(ledgerEntriesTable.accountId)
    .all();

  const parCompte = new Map(cumuls.map((c) => [c.accountId, c.delta ?? 0]));

  const byAccountId = new Map(figes);
  for (const id of aCalculer) {
    byAccountId.set(id, (socle.get(id) ?? 0) + (parCompte.get(id) ?? 0));
  }

  return { byAccountId, provisional: true };
}
