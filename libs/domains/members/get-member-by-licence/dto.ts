import type { MemberSummary } from '../shared/queries';


export type GetMemberByLicenceLicence = string;
export type GetMemberByLicenceSeason = string;

/**
 * L'adhésion de la saison, augmentée de ce que la personne porte en propre.
 *
 * `photoUpdatedAt` est rendu en millisecondes plutôt qu'en `Date` : c'est un horodatage et
 * non une adresse — la clé R2 n'est jamais exposée, l'affichage s'en sert comme version
 * d'URL (`?v=`) pour que le remplacement d'un portrait change son adresse. `null` quand
 * l'adhérent n'a pas de photo.
 */
export type GetMemberByLicenceOutput = Omit<MemberSummary, 'photoUpdatedAt'> & {
  photoUpdatedAt: number | null;
};
