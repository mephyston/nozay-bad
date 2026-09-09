import { formatWindow, type SlotWindow } from './indiv';

/**
 * L'aide au choix de l'entraîneur : classer les candidats, proposer une répartition,
 * écrire l'annonce.
 *
 * Purs et sans base : c'est l'écran d'administration qui les exécute, sur des candidats
 * que le relais a enrichis de l'âge et du classement. Le domaine ne connaît ni les
 * adhérents ni les classements — il reçoit des nombres, il rend un ordre.
 */

export interface RankableCandidate {
  requestId: number;
  /** Âge au jour de la soirée, ou `null` quand la date de naissance n'a pas été jointe. */
  age: number | null;
  /** Fois retenu cette saison, soirées annoncées seulement. */
  selectedCount: number;
  /** Horodatage de la demande, en secondes : à égalité, le premier arrivé passe devant. */
  requestedAt: number;
  preferredSlot: number | null;
}

/**
 * Âge atteint à une date, à partir d'une date de naissance ISO.
 *
 * Découpé en texte et jamais confié à `new Date` — même prudence que la saison : un
 * fuseau ne doit pas faire perdre un an la veille d'un anniversaire.
 */
export function ageAt(birthDate: string | null | undefined, date: string): number | null {
  if (!birthDate || !/^\d{4}-\d{2}-\d{2}$/.test(birthDate)) return null;
  const [by, bm, bd] = birthDate.split('-').map(Number);
  const [y, m, d] = date.split('-').map(Number);
  const age = y - by - (m < bm || (m === bm && d < bd) ? 1 : 0);
  return Number.isFinite(age) && age >= 0 ? age : null;
}

/**
 * L'ordre de priorité, tel que David l'a fixé : ceux qui ont eu le moins de séances
 * cette saison d'abord, puis les plus jeunes — l'avenir du club —, puis l'ordre des
 * demandes. Un âge inconnu passe après les âges connus, jamais devant.
 *
 * Retourne une copie : l'écran garde la liste reçue pour ce qu'elle est.
 */
export function rankCandidates<T extends RankableCandidate>(candidates: readonly T[]): T[] {
  return [...candidates].sort((a, b) => {
    if (a.selectedCount !== b.selectedCount) return a.selectedCount - b.selectedCount;
    if (a.age !== b.age) {
      if (a.age === null) return 1;
      if (b.age === null) return -1;
      return a.age - b.age;
    }
    return a.requestedAt - b.requestedAt;
  });
}

export interface SelectionAssignment {
  requestId: number;
  slot: number;
}

/**
 * Une répartition proposée, dans l'ordre de priorité.
 *
 * On parcourt les candidats classés : celui qui a une préférence prend son créneau s'il
 * reste une place, sinon il est **sauté** — une préférence est un souhait, mais la
 * proposition ne le contredit pas d'elle-même, c'est à l'entraîneur de le faire en
 * connaissance de cause. Les indifférents comblent le premier créneau libre.
 */
export function proposeSelection(
  ranked: readonly RankableCandidate[],
  layout: { slotCount: number; capacityPerSlot: number }
): SelectionAssignment[] {
  const taken = new Map<number, number>();
  const free = (slot: number) => (taken.get(slot) ?? 0) < layout.capacityPerSlot;
  const take = (requestId: number, slot: number) => {
    taken.set(slot, (taken.get(slot) ?? 0) + 1);
    return { requestId, slot };
  };

  const picks: SelectionAssignment[] = [];
  for (const candidate of ranked) {
    if (candidate.preferredSlot !== null) {
      const slot = candidate.preferredSlot;
      if (slot >= 1 && slot <= layout.slotCount && free(slot)) picks.push(take(candidate.requestId, slot));
      continue;
    }
    for (let slot = 1; slot <= layout.slotCount; slot += 1) {
      if (free(slot)) {
        picks.push(take(candidate.requestId, slot));
        break;
      }
    }
  }
  return picks;
}

export interface AnnouncementInput {
  /** « mardi 17 mars », déjà formaté par l'appelant. */
  dateLabel: string;
  venueName: string | null;
  slots: SlotWindow[];
  /** Noms des retenus par numéro de créneau. */
  selectedBySlot: Record<number, string[]>;
}

/**
 * Le texte de l'annonce, prêt à coller sur le groupe WhatsApp.
 *
 * Une ligne par créneau, « personne » quand il reste vide : l'entraîneur voit d'un coup
 * d'œil ce qu'il envoie, et le groupe lit la même chose que l'espace adhérent.
 */
export function announcementText(input: AnnouncementInput): string {
  const lines = [`Indiv ${input.dateLabel}${input.venueName ? ` — ${input.venueName}` : ''}`];
  for (const slot of input.slots) {
    const names = input.selectedBySlot[slot.index] ?? [];
    lines.push(`${formatWindow(slot)} : ${names.length ? names.join(', ') : 'personne'}`);
  }
  return lines.join('\n');
}
