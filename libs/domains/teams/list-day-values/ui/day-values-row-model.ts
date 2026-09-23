import { accorder, type Tone } from '@nba/ui';

/**
 * Le vocabulaire du contrôle des journées.
 *
 * Sept colonnes, et un tableau qui **défilait horizontalement** sur un téléphone —
 * c'est-à-dire dont la moitié droite, celle qui porte le statut, ne se voyait jamais.
 * Or c'est précisément ce qu'on vient chercher ici.
 *
 * Sur une ligne : l'équipe identifie, la division situe, les lignes composées tiennent
 * la droite, et le statut ne se badge que lorsqu'il réclame un geste.
 */

export type AnomalieLike = { severity: 'error' | 'warning'; message: string; article: string };

export type EquipeDeJourneeLike = {
  teamId: number;
  name: string;
  divisionLabel: string;
  value: number | null;
  delta: number | null;
  /** `null` quand le championnat ne définit aucune valeur d'équipe : rien à vérifier. */
  conform: boolean | null;
  upperTeamName: string | null;
  upperTeamValue: number | null;
  filledLines: number;
  expectedLines: number;
  captainName: string | null;
  captainLicence: string | null;
  issues: AnomalieLike[];
};

/** Une valeur d'équipe, à la française : virgule décimale, tiret quand elle manque. */
export const valeurFr = (v: number | null): string =>
  v === null ? '—' : v.toFixed(2).replace('.', ',');

/** Un écart signé : le « + » compte autant que le « − ». */
export const ecartFr = (v: number | null): string =>
  v === null ? '—' : `${v > 0 ? '+' : ''}${v.toFixed(2).replace('.', ',')}`;

export const erreursDe = (t: EquipeDeJourneeLike): AnomalieLike[] =>
  t.issues.filter((i) => i.severity === 'error');

export const avertissementsDe = (t: EquipeDeJourneeLike): AnomalieLike[] =>
  t.issues.filter((i) => i.severity === 'warning');

/** Les lignes composées sur celles attendues : ce que le coach vérifie d'abord. */
export const lignesDeComposition = (t: EquipeDeJourneeLike): string =>
  `${t.filledLines}/${t.expectedLines}`;

/** Une composition complète est au vert ; une composition vide n'est pas une alerte. */
export const tonDeComposition = (t: EquipeDeJourneeLike): Tone =>
  t.filledLines >= t.expectedLines && t.expectedLines > 0 ? 'success' : 'muted';

/**
 * Sous les lignes : la valeur de l'équipe, quand il y en a une à dire.
 *
 * Ni quand le championnat n'en définit aucune, ni quand elle n'est pas encore
 * calculée : « valeur — » n'apprend rien. Dans le tableau le tiret occupe une colonne
 * et signifie « pas de valeur » ; en légende, il n'est que du bruit.
 */
export const legendeDeComposition = (
  t: EquipeDeJourneeLike,
  avecValeur: boolean
): string | undefined =>
  avecValeur && t.value !== null ? `valeur ${valeurFr(t.value)}` : undefined;

export type EtatDeComposition = {
  texte: string;
  variante: 'destructive' | 'warning' | 'outline' | 'success';
  /** Vrai quand l'état réclame un geste : c'est lui seul qui se badge sur téléphone. */
  exception: boolean;
};

/**
 * L'état d'une composition, dans un vocabulaire unique.
 *
 * L'ordre compte et il est celui de la gravité : une erreur d'article fait perdre la
 * rencontre, un dépassement de valeur la fait perdre **aux deux** équipes, le reste
 * se corrige. « Conforme » est le cas courant — sur téléphone il ne se badge pas, son
 * silence est l'information ; la colonne du tableau, elle, le dit toujours, parce
 * qu'une colonne vide serait illisible.
 */
export const etatDeComposition = (t: EquipeDeJourneeLike): EtatDeComposition => {
  const erreurs = erreursDe(t);
  if (erreurs.length > 0)
    return {
      texte: `${erreurs.length} ${accorder(erreurs.length, 'erreur')}`,
      variante: 'destructive',
      exception: true
    };
  if (t.conform === false)
    return { texte: `Dépasse ${t.upperTeamName}`, variante: 'destructive', exception: true };
  if (t.filledLines === 0)
    return { texte: 'Pas composée', variante: 'outline', exception: true };
  if (t.conform === null) return { texte: 'À vérifier', variante: 'warning', exception: true };
  const avertissements = avertissementsDe(t);
  if (avertissements.length > 0)
    return {
      texte: `${avertissements.length} ${accorder(avertissements.length, 'avertissement')}`,
      variante: 'warning',
      exception: true
    };
  return { texte: 'Conforme', variante: 'success', exception: false };
};

/** La pastille du téléphone : l'état, et seulement s'il réclame un geste. */
export const pastilleDeComposition = (t: EquipeDeJourneeLike): EtatDeComposition | undefined => {
  const etat = etatDeComposition(t);
  return etat.exception ? etat : undefined;
};

/**
 * Le libellé du bouton qui prévient le staff.
 *
 * Il dit **qui** est prévenu, et ils ne sont pas toujours les mêmes : un dépassement de
 * valeur part aux deux capitaines concernés, une erreur dure au seul capitaine fautif.
 * Nommer le seul capitaine de l'équipe laisserait croire que l'autre n'a rien reçu.
 */
export const libelleDeSignalement = (t: EquipeDeJourneeLike, enCours: boolean): string => {
  if (enCours) return 'Envoi…';
  return t.conform === false ? 'Signaler aux deux capitaines' : 'Signaler au capitaine';
};
