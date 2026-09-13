import { type Db } from '@nba/db';
import { GetSeasonBalancesRepository } from './repository';
import { GetSeasonBalancesInput, GetSeasonBalancesOutput } from './dto';
import { resolveOpeningBalances } from '../../shared/opening-balances';

/**
 * Les soldes d'ouverture d'un exercice, un par compte.
 *
 * Ce ne sont plus les seules lignes **figées** de `season_balances` : tant que l'exercice
 * précédent n'est pas clôturé, la table est vide pour le nouvel exercice, et les écrans par
 * compte (Caisse, Badnet) repartaient de zéro pendant que le grand livre, lui, calculait
 * l'à-nouveau. C'est la règle unique de `shared/opening-balances.ts` qui répond ici — figé
 * gagne, sinon on calcule — pour que le solde d'un compte soit le même partout où il s'affiche.
 *
 * `provisional` dit si le chiffre est calculé (exercice précédent ouvert) ou figé.
 */
export async function getSeasonBalances(db: Db, seasonId: GetSeasonBalancesInput): Promise<GetSeasonBalancesOutput> {
  const repo = new GetSeasonBalancesRepository();
  const [season, accounts, stored] = await Promise.all([
    repo.findSeason(db, seasonId),
    repo.listAccounts(db),
    repo.getBalances(db, seasonId)
  ]);
  if (!season) return [];

  // Figé = une ligne écrite par la clôture, non nulle (même lecture que l'à-nouveau).
  const fixed = new Set(stored.filter((b) => (b.initialBalanceCents ?? 0) !== 0).map((b) => b.accountId));
  const opening = await resolveOpeningBalances(db, season, accounts.map((a) => a.id));
  return accounts.map((a) => {
    const cents = opening.byAccountId.get(a.id) ?? 0;
    return {
      seasonId: season.id,
      accountId: a.code,
      accountNumericId: a.id,
      label: a.label,
      initialBalanceCents: cents,
      initialBalance: cents,
      provisional: !fixed.has(a.id)
    };
  });
}
