import { seasonForDate, sortSeasons, type SeasonLike } from '@nba/ui';

/**
 * L'exercice proposé à une nouvelle saisie, et ceux que le formulaire offre.
 *
 * Une écriture nouvelle se rattache à l'exercice en cours, pas à celui que le grand livre
 * affiche : on consultait la saison écoulée, on saisissait une recette, et elle partait sur
 * un exercice clôturé — que le serveur refuse. Un exercice clôturé ne se propose donc plus du
 * tout ; il ne reste dans la liste que s'il est déjà celui de l'écriture modifiée, pour que le
 * champ ne s'affiche pas vide.
 */
type SaisonDeSaisie = SeasonLike & { active?: boolean | null };

const ouverte = (s: SaisonDeSaisie) => !s.closed;

/**
 * Dans l'ordre : l'exercice qui couvre `aujourdhui`, l'exercice actif, celui que l'écran
 * consulte, puis le dernier ouvert — chacun seulement s'il n'est pas clôturé.
 */
export function saisonDeSaisie(seasons: SaisonDeSaisie[], consultee: string, aujourdhui: string): string {
  const parDate = seasonForDate(seasons, aujourdhui);
  const choix =
    (parDate && ouverte(parDate) ? parDate : undefined) ??
    seasons.find((s) => s.active && ouverte(s)) ??
    seasons.find((s) => String(s.id) === consultee && ouverte(s)) ??
    sortSeasons(seasons.filter(ouverte)).at(-1);
  return choix ? String(choix.id) : consultee;
}

/** Les exercices où l'on peut écrire, plus celui de l'écriture en cours s'il est clôturé. */
export function saisonsDeSaisie<T extends SaisonDeSaisie>(seasons: T[], valeur: string): T[] {
  return seasons.filter((s) => ouverte(s) || String(s.id) === valeur);
}
