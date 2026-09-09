import { isValidTime } from './slot';

/**
 * Règles et garde-fous des séances individuelles.
 *
 * Purs, sans base ni HTTP, comme `open-play.ts` : validateurs, handlers et écrans s'y
 * réfèrent pour ne jamais proposer une valeur que l'API refuserait. Les règles de date
 * (`isValidDate`, `isUpcomingDate`, `datesInRange`) sont celles du jeu libre, reprises
 * telles quelles — une soirée d'indiv est une date comme une séance de jeu libre.
 */

/** L'habitude du club : deux créneaux de trente minutes, deux personnes par créneau. */
export const DEFAULT_SLOT_COUNT = 2;
export const DEFAULT_SLOT_MINUTES = 30;
export const DEFAULT_CAPACITY_PER_SLOT = 2;

/**
 * Bornes de saisie. Six créneaux de deux heures couvrent largement une soirée ; au-delà
 * c'est une faute de frappe, et quatre personnes par créneau n'est plus de l'individuel.
 */
export const MAX_SLOT_COUNT = 6;
export const MAX_SLOT_MINUTES = 120;
export const MAX_CAPACITY_PER_SLOT = 4;

/** Un mot pour l'entraîneur, pas une lettre. */
export const MAX_INDIV_NOTE_LENGTH = 200;

/**
 * Le groupe d'adhésion ouvre-t-il les séances individuelles ?
 *
 * Le club n'a pas de liste de compétiteurs : il a des libellés de tarif Poona, bruts et
 * non normalisés — « Compétiteurs adultes », « Compétiteur adulte 1 entrainement /semaine ».
 * La règle retenue est la plus simple qui les couvre tous : le mot « compétiteur » dans le
 * libellé, sans égard à la casse ni aux accents. Elle est assumée comme approximative ;
 * « Elite Jeunes (Collège) » n'y répond pas, et c'est un choix connu, pas un oubli.
 *
 * Le domaine ne connaît pas les adhérents : c'est l'appelant qui lui présente le libellé,
 * et c'est ici, dans le handler, que le refus est rendu — pas dans un écran contournable.
 */
export function isIndivEligibleGroup(label: string | null | undefined): boolean {
  if (!label) return false;
  return label
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .includes('competiteur');
}

/**
 * « 19:30 » + 30 → « 20:00 ».
 *
 * Reste dans la journée : une soirée ne franchit pas minuit, et un résultat à « 24:30 »
 * serait refusé par `isValidTime` en aval plutôt que de boucler en silence.
 */
export function addMinutes(time: string, minutes: number): string {
  const [hours, mins] = time.split(':').map(Number);
  const total = hours * 60 + mins + minutes;
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
}

export interface SlotWindow {
  /** 1-based : c'est le numéro que l'adhérent lit et que l'entraîneur annonce. */
  index: number;
  startTime: string;
  endTime: string;
}

export interface SlotLayout {
  startTime: string;
  slotCount: number;
  slotMinutes: number;
}

/**
 * Les créneaux d'une soirée, dérivés et jamais stockés.
 *
 * Le k-ième va de `start + (k-1)·m` à `start + k·m`. C'est la seule fonction qui connaît
 * cette arithmétique : l'écran, l'annonce et le validateur passent tous par elle.
 */
export function slotWindows(layout: SlotLayout): SlotWindow[] {
  return Array.from({ length: layout.slotCount }, (_, i) => ({
    index: i + 1,
    startTime: addMinutes(layout.startTime, i * layout.slotMinutes),
    endTime: addMinutes(layout.startTime, (i + 1) * layout.slotMinutes)
  }));
}

/** Heure de fin de la soirée : la fin du dernier créneau. */
export function sessionEndTime(layout: SlotLayout): string {
  return addMinutes(layout.startTime, layout.slotCount * layout.slotMinutes);
}

/**
 * La soirée tient-elle dans la journée ?
 *
 * Refuse ce que `addMinutes` laisse passer : une heure de début valide dont la fin
 * dépasserait minuit.
 */
export function isValidLayout(layout: SlotLayout): boolean {
  return (
    isValidTime(layout.startTime) &&
    Number.isInteger(layout.slotCount) &&
    layout.slotCount >= 1 &&
    layout.slotCount <= MAX_SLOT_COUNT &&
    Number.isInteger(layout.slotMinutes) &&
    layout.slotMinutes >= 1 &&
    layout.slotMinutes <= MAX_SLOT_MINUTES &&
    isValidTime(sessionEndTime(layout))
  );
}

/** « 19h30-20h00 », tel que l'annonce l'écrit. */
export function formatWindow(window: SlotWindow): string {
  const h = (t: string) => t.replace(':', 'h');
  return `${h(window.startTime)}-${h(window.endTime)}`;
}
