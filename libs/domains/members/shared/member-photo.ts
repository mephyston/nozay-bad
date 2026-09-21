/**
 * L'adresse du portrait d'un adhérent, côté administration.
 *
 * Écrite une fois : deux écrans la construisaient déjà, et une troisième copie
 * aurait fini par diverger sur la taille ou sur la forme de la version — ce qui
 * ferait deux entrées de cache pour un seul portrait.
 *
 * `size=128` et non 512 : la vignette fait 36 px, et deux cents portraits en pleine
 * résolution feraient de la liste la page la plus lourde de l'administration.
 */
export function memberPhotoUrl(
  licence: string,
  photoUpdatedAt: string | number | null | undefined,
  size = 128
): string | null {
  if (photoUpdatedAt === null || photoUpdatedAt === undefined) return null;
  // Toujours en millisecondes : la liste reçoit une chaîne ISO, la fiche un nombre.
  const version = typeof photoUpdatedAt === 'number' ? photoUpdatedAt : Date.parse(photoUpdatedAt);
  if (!Number.isFinite(version)) return null;
  return `/admin/api/member-photo?licence=${encodeURIComponent(licence)}&size=${size}&v=${version}`;
}
