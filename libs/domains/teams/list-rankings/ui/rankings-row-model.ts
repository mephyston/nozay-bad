import { accorder, type Tone } from '@nba/ui';

/**
 * Le vocabulaire des classements.
 *
 * Huit colonnes sur un tableau. La rangée du téléphone en gardait trois, mais
 * n'offrait **aucune correction** : il fallait un ordinateur pour redresser un
 * classement, alors que c'est au gymnase qu'on s'aperçoit qu'il est faux.
 */

export type ClassementLike = {
  id: number | string;
  licence: string;
  firstName: string;
  lastName: string;
  gender: string;
  category: string | null;
  singles: string | null;
  doubles: string | null;
  mixed: string | null;
  cpphSingles: number | null;
  cpphDoubles: number | null;
  cpphMixed: number | null;
  isMember: boolean;
  mutation: string;
  source: string;
};

/**
 * Un classement absent n'est **pas** `NC`.
 *
 * `NC` est un classement à part entière — zéro point, mais alignable ; l'absence
 * désigne un licencié non compétiteur. Les confondre ferait entrer en équipe
 * quelqu'un qui n'y a pas sa place.
 */
export const classementOuTiret = (valeur: string | null): string => valeur ?? '—';

/** Le nom, tel qu'on le cherche : nom puis prénom. */
export const nomDeJoueur = (c: ClassementLike): string => `${c.lastName} ${c.firstName}`;

/** Sous le nom : la catégorie et la licence, les deux clés d'identification. */
export const detailDeJoueur = (c: ClassementLike): string =>
  c.category ? `${c.category} · ${c.licence}` : c.licence;

/** La valeur qui compte à droite : les trois classements, dans l'ordre S/D/M. */
export const classementsDeJoueur = (c: ClassementLike): string =>
  [c.singles, c.doubles, c.mixed].map(classementOuTiret).join('/');

/** Un joueur sans aucun classement est en retrait : il n'y a rien à comparer. */
export const tonDeClassements = (c: ClassementLike): Tone =>
  c.singles || c.doubles || c.mixed ? 'foreground' : 'muted';

/** Les points CPPH, sous les classements — la donnée fine, quand elle existe. */
export const cpphDeJoueur = (c: ClassementLike): string | undefined => {
  const points = [c.cpphSingles, c.cpphDoubles, c.cpphMixed];
  if (points.every((p) => p === null)) return undefined;
  return `CPPH ${points.map((p) => p ?? '—').join('/')}`;
};

/**
 * Les signalements, et seulement les exceptions.
 *
 * « Pas adhérent » se dit en permanence : ce joueur n'est alignable dans aucune
 * composition, et c'est la seule chose qui compte quand on lit cette liste pour
 * composer une équipe.
 */
export const signalementsDeJoueur = (
  c: ClassementLike
): { label: string; variant: 'destructive' | 'warning' | 'outline' }[] => {
  const liste: { label: string; variant: 'destructive' | 'warning' | 'outline' }[] = [];
  if (!c.isMember) liste.push({ label: 'Pas adhérent', variant: 'destructive' });
  if (c.mutation !== 'none') liste.push({ label: 'Muté', variant: 'warning' });
  if (c.source === 'manuel') liste.push({ label: 'Saisi à la main', variant: 'outline' });
  return liste;
};

/**
 * Les dates de classement proposées à la portée de l'écran.
 *
 * Le nombre de joueurs accompagne chaque date : deux imports d'une même semaine se
 * distinguent par là, et choisir le mauvais fausse toutes les valeurs d'équipe.
 */
export function choixDeDate(
  dates: readonly { eloDate: string; players: number }[]
): { value: string; label: string; hint: string }[] {
  return dates.map((date) => ({
    value: date.eloDate,
    label: date.eloDate,
    hint: `${date.players} ${accorder(date.players, 'joueur')}`
  }));
}
