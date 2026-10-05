import { ageCategoryOf, seasonReferenceYear } from '@nba/members-api';
import type { PlayerDirectory } from './members-lookup';
import type { CategoryFamily } from './ranking';

/** Les codes FFBaD du référentiel adhérents (`U9`…`V8`), rapportés aux familles du championnat. */
const FAMILLE_PAR_CODE: Record<string, CategoryFamily> = {
  U9: 'minibad',
  U11: 'poussin',
  U13: 'benjamin',
  U15: 'minime',
  U17: 'cadet',
  U19: 'junior',
  S: 'senior'
};

/**
 * La famille de catégorie d'un adhérent sur une saison, d'après sa date de naissance.
 *
 * L'effectif se compose **avant** que les classements soient importés, et la catégorie
 * Poona ne couvre que les licences déjà validées : la date de naissance du référentiel
 * des adhérents vaut pour tous, dès l'adhésion. `null` si elle est illisible.
 */
export function familleDAge(birthDate: string, seasonCode: string): CategoryFamily | null {
  const annee = Number(birthDate.slice(0, 4));
  const reference = seasonReferenceYear({ code: seasonCode });
  if (!Number.isInteger(annee) || annee < 1900 || reference === null) return null;
  const code = ageCategoryOf(annee, reference).code;
  return code.startsWith('V') ? 'veteran' : (FAMILLE_PAR_CODE[code] ?? null);
}

/**
 * Les licences de l'annuaire qu'un championnat n'admet pas dans un effectif : un
 * senior dans une équipe vétérans, par exemple. Vide quand le championnat admet toutes
 * les catégories. Une date de naissance illisible ne fait écarter personne.
 */
export function licencesHorsCategorie(
  categories: readonly CategoryFamily[] | null,
  directory: PlayerDirectory,
  seasonCode: string
): string[] {
  if (categories === null) return [];
  return [...directory.values()]
    .filter((p) => {
      const famille = familleDAge(p.birthDate, seasonCode);
      return famille !== null && !categories.includes(famille);
    })
    .map((p) => p.licence);
}
