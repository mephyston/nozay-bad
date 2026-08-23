import { type DbOrTx } from '@nba/db';
import { getMembersBySeason } from '@nba/members-api';
import { normalizeLicence } from './ranking';

/**
 * L'identité d'un joueur, telle que les écrans d'équipe l'affichent.
 *
 * Elle vient du référentiel des adhérents, jamais des classements : un compétiteur qui
 * n'est pas adhérent ne doit apparaître dans aucun sélecteur de composition, et c'est
 * cette résolution-là qui le tient à l'écart.
 */
export interface PlayerIdentity {
  licence: string;
  firstName: string;
  lastName: string;
  /** `M` / `F` du référentiel adhérents — à ne pas confondre avec le `H` / `F` de Poona. */
  gender: 'M' | 'F';
  birthDate: string;
  /**
   * Version du portrait, en millisecondes. `null` : aucune photo.
   *
   * En millisecondes et non en `Date`, comme la fiche d'adhérent : c'est un horodatage
   * qui ne sert qu'à faire varier une URL, et une `Date` traverserait le JSON en chaîne
   * ISO — donc en un troisième format pour la même chose.
   */
  photoUpdatedAt: number | null;
}

export type PlayerDirectory = Map<string, PlayerIdentity>;

/**
 * Annuaire des adhérents d'une saison, indexé par licence normalisée.
 *
 * La normalisation est le point sensible : l'export ELO écrit les zéros de tête, d'autres
 * exports les perdent. Sans elle, la jointure échoue en silence et se lit comme « ce
 * joueur n'existe pas ».
 */
export async function loadPlayerDirectory(db: DbOrTx, seasonCode: string): Promise<PlayerDirectory> {
  const members = await getMembersBySeason(db, seasonCode);

  return new Map(
    members.map((member) => [
      normalizeLicence(member.licence),
      {
        licence: normalizeLicence(member.licence),
        firstName: member.firstName,
        lastName: member.lastName,
        gender: member.gender,
        birthDate: member.birthDate,
        photoUpdatedAt: member.photoUpdatedAt?.getTime() ?? null
      }
    ])
  );
}

/**
 * Identité d'une licence, ou un repli lisible.
 *
 * On ne renvoie jamais `null` silencieusement : une équipe dont le capitaine a quitté le
 * club doit afficher « licence inconnue », pas une case vide qu'on lira comme « aucun
 * capitaine désigné ».
 */
export function identityOf(directory: PlayerDirectory, licence: string | null | undefined): PlayerIdentity | null {
  if (!licence) return null;
  const normalized = normalizeLicence(licence);
  return (
    directory.get(normalized) ?? {
      licence: normalized,
      firstName: '',
      lastName: 'Licence inconnue',
      gender: 'M',
      birthDate: '',
      photoUpdatedAt: null
    }
  );
}
