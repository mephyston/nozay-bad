import { accorder } from '@nba/ui';

/**
 * Le vocabulaire de l'écran de choix.
 *
 * Une rangée y portait sept informations : le rang, le nom, l'âge, la catégorie, trois
 * classements, l'historique, le souhait, la note — puis une rangée de boutons. À 390 px
 * tout cela se replie en six lignes, et l'on ne voit plus deux candidats à la fois.
 *
 * Ce qui décide vient en premier : qui, quel âge, et combien de fois cette personne a
 * déjà été retenue. Le reste — classements, note — se lit dans la fiche.
 */

export type CandidatLike = {
  requestId: number;
  firstName: string;
  lastName: string;
  age: number | null;
  category?: string | null;
  singles?: string | null;
  doubles?: string | null;
  mixed?: string | null;
  preferredSlot: number | null;
  note: string | null;
  requestCount: number;
  selectedCount: number;
  lastSelectedDate: string | null;
};

/** Le nom, tel qu'on le lit dans une liste. */
export const nomDeCandidat = (c: CandidatLike): string => `${c.firstName} ${c.lastName}`;

/**
 * Ce qui décide, sous le nom : l'âge, la catégorie, et l'équité.
 *
 * « Retenu 2 fois sur 5 demandes » est la donnée qui fonde l'ordre de priorité — la
 * mettre en troisième ligne d'une carte la rendait invisible au moment du choix.
 */
export const detailDeCandidat = (c: CandidatLike): string => {
  const morceaux: string[] = [c.age !== null ? `${c.age} ans` : 'âge inconnu'];
  if (c.category) morceaux.push(c.category);
  morceaux.push(
    `retenu ${c.selectedCount} sur ${c.requestCount} ${accorder(c.requestCount, 'demande')}`
  );
  return morceaux.join(' · ');
};

/** Les trois classements Poona, tirets compris : leur absence est une information. */
export const classementsDeCandidat = (c: CandidatLike): string =>
  `S/D/M ${[c.singles, c.doubles, c.mixed].map((r) => r ?? '—').join(' / ')}`;

/** Le souhait exprimé par le candidat, et sa note s'il en a laissé une. */
export const souhaitDeCandidat = (c: CandidatLike): string => {
  const souhait = c.preferredSlot ? `créneau ${c.preferredSlot}` : 'indifférent';
  return c.note ? `Souhait : ${souhait} · « ${c.note} »` : `Souhait : ${souhait}`;
};

/** Ce qu'affiche la colonne de droite : le créneau attribué, ou rien. */
export const affectationDeCandidat = (slot: number | null | undefined): string =>
  slot === null || slot === undefined ? '—' : `Créneau ${slot}`;

/**
 * La légende sous l'affectation : le souhait, **et seulement s'il n'est pas exaucé**.
 *
 * Répéter « souhait : créneau 2 » sous « Créneau 2 » n'apprend rien. Le signaler quand
 * les deux divergent, en revanche, est précisément ce qu'un entraîneur veut voir en
 * relisant sa sélection.
 */
export const ecartAuSouhait = (
  c: CandidatLike,
  slot: number | null | undefined
): string | undefined => {
  if (!c.preferredSlot) return undefined;
  const attribue = slot ?? null;
  if (attribue === c.preferredSlot) return undefined;
  return `souhaitait le ${c.preferredSlot}`;
};

export type CreneauLike = { index: number; libelle: string };

/**
 * Les choix offerts pour un candidat : aucun créneau, puis chacun d'eux.
 *
 * Un créneau complet reste **proposé** et non masqué : l'entraîneur doit pouvoir voir
 * qu'il l'est, et le choisir quand même serait refusé par l'écran avec sa raison. Le
 * faire disparaître donnerait une liste qui change de taille sans explication.
 */
export function choixDeCreneau(
  creneaux: readonly CreneauLike[],
  occupation: Readonly<Record<number, number>>,
  capacite: number
): { value: string; label: string; hint?: string }[] {
  return [
    { value: '', label: 'Aucun créneau' },
    ...creneaux.map((creneau) => {
      const pris = occupation[creneau.index] ?? 0;
      return {
        value: String(creneau.index),
        label: `Créneau ${creneau.index} · ${creneau.libelle}`,
        hint: pris >= capacite ? `complet (${pris}/${capacite})` : `${pris}/${capacite}`
      };
    })
  ];
}
