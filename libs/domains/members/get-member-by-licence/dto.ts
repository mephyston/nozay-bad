import { membersTable } from '@nba/members/schema';


export type GetMemberByLicenceLicence = string;
export type GetMemberByLicenceSeason = string;

/**
 * L'adhésion de la saison, augmentée de ce que la personne porte en propre.
 *
 * `photoUpdatedAt` vient de `member_profiles`, rattaché à la licence et non à la saison.
 * C'est un horodatage et non une adresse : la clé R2 n'est jamais exposée, l'affichage
 * s'en sert comme version d'URL (`?v=`) pour que le remplacement d'un portrait change
 * son adresse. `null` quand l'adhérent n'a pas de photo.
 */
export type GetMemberByLicenceOutput = typeof membersTable.$inferSelect & {
  photoUpdatedAt: number | null;
};
