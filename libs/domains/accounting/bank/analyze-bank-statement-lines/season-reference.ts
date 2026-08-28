/**
 * Reconnaissance d'une saison citée dans un libellé bancaire.
 *
 * Un adhérent qui règle sa cotisation en juin pour la rentrée écrit très souvent la
 * saison dans le motif de son virement : « cotisation 26-27 », « adhésion 2026/2027 ».
 * L'écriture appartient pourtant à l'exercice suivant, pas à celui qui l'encaisse — c'est
 * la définition même d'un produit constaté d'avance.
 *
 * La détection est **déterministe** et vit hors de l'invite au modèle : c'est une lecture
 * de chaîne, pas un jugement. Confier au modèle le soin de comparer deux millésimes
 * reviendrait à rendre aléatoire ce qui ne l'est pas — et un rattachement d'exercice mal
 * posé se paie à la clôture.
 */

/** Deux millésimes contigus, sous les formes qu'on rencontre vraiment. */
const SEASON_PATTERNS: RegExp[] = [
  // « 2026-2027 », « 2026/2027 », « 2026 2027 ». Les millésimes sont bornés au siècle
  // plausible plutôt que laissés à `\d{4}` : deux nombres à quatre chiffres qui se
  // suivent, cela existe ailleurs qu'en saison — un identifiant, une plage de références.
  //
  // La borne est « pas d'autre chiffre autour », et non `\b` : les motifs de virement
  // sont écrits sans espaces (« FOSSE-JULES-ADHESION2026-2027 »), et un millésime collé
  // à une lettre reste un millésime. `\b` ne voyait pas celui-là.
  /(?<!\d)((?:19|20|21)\d{2})\s*[-/ ]\s*((?:19|20|21)\d{2})(?!\d)/g,
  // « 26-27 », « 26/27 » — exigés collés à un séparateur pour ne pas confondre avec un
  // montant ou un numéro de rue.
  /(?<!\d)(\d{2})\s*[-/]\s*(\d{2})(?!\d)/g
];

/** Normalise un millésime sur deux chiffres : « 2026 » et « 26 » donnent 26. */
function twoDigits(value: string): number {
  const n = Number(value);
  return n >= 100 ? n % 100 : n;
}

/**
 * La saison citée dans le texte, au format court « 26-27 », ou `null`.
 *
 * Seules les paires **contiguës** sont retenues : « 26-27 » est une saison, « 26-30 »
 * est autre chose — un numéro de rue, une plage de montants, un identifiant.
 */
export function seasonInText(text: string): string | null {
  for (const pattern of SEASON_PATTERNS) {
    /*
     * Toutes les occurrences, pas la première.
     *
     * « VIR 16/06 COTISATION 26-27 » commence par une date : s'arrêter au premier couple
     * de nombres perdrait la saison qui suit, et le libellé qui la porte est justement
     * celui qu'on cherche.
     */
    for (const match of text.matchAll(pattern)) {
      const start = twoDigits(match[1]);
      const end = twoDigits(match[2]);
      if ((start + 1) % 100 === end) {
        return `${String(start).padStart(2, '0')}-${String(end).padStart(2, '0')}`;
      }
    }
  }
  return null;
}

/**
 * Les derniers mois d'un exercice, pendant lesquels une adhésion encaissée vise la rentrée.
 *
 * L'exercice se clôt le 31 août et les inscriptions s'ouvrent en juillet : à partir de là,
 * une cotisation qui rentre n'appartient plus à l'exercice qui l'encaisse. Deux mois, donc,
 * comptés depuis la fin de l'exercice et non depuis un mois codé en dur — un club dont la
 * saison finirait en juin n'aurait pas à réécrire cette règle.
 */
export const ADVANCE_WINDOW_MONTHS = 2;

/**
 * L'encaissement tombe-t-il dans cette fenêtre ?
 *
 * La date n'est pas une preuve, à la différence d'un millésime écrit dans le motif — mais
 * c'est le seul indice disponible quand l'adhérent n'écrit rien, et il ne s'est pas démenti :
 * en août 2026, les 58 encaissements d'adhésion ont tous été rattachés à la rentrée, sans une
 * exception. Les laisser en « normal » revenait à faire corriger le trésorier une à une, ou à
 * gonfler le résultat de l'exercice qui se clôture s'il ne les voyait pas passer.
 *
 * La fenêtre commence au PREMIER JOUR de son premier mois : reculer de deux mois depuis un
 * 31 août demanderait de raboter au 30 juin, une arithmétique de calendrier qu'une comparaison
 * de chaînes n'a pas à connaître.
 */
export function isInAdvanceWindow(date: string, seasonEndDate: string, months = ADVANCE_WINDOW_MONTHS): boolean {
  const [endYear, endMonth] = seasonEndDate.split('-').map(Number);
  if (!endYear || !endMonth) return false;

  let year = endYear;
  let month = endMonth - months + 1;
  while (month < 1) { month += 12; year -= 1; }

  const windowStart = `${year}-${String(month).padStart(2, '0')}-01`;
  return date >= windowStart && date <= seasonEndDate;
}

/** La saison citée est-elle postérieure à celle de l'exercice en cours ? */
export function isFutureSeason(cited: string, current: string): boolean {
  const startOf = (code: string) => Number(code.split('-')[0]);
  const c = startOf(cited);
  const n = startOf(current);
  if (Number.isNaN(c) || Number.isNaN(n)) return false;
  return c > n;
}
