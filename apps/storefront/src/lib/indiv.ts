import { createApiClient } from '@nba/api-client';

/**
 * La prochaine soirée d'indiv, lue au nom du profil actif.
 *
 * **Une seule**, jamais la liste : c'est ce qui évite les demandes trop à l'avance. La
 * soirée suivante n'apparaît qu'une fois la précédente passée — ou annulée, auquel cas
 * elle est sautée, l'adhérent n'ayant rien à y faire.
 *
 * `memberId` et `group` viennent de la session et de la fiche adhérent, jamais du
 * navigateur : c'est ce qui permet à l'API de dire « voici où *tu* en es » et « tu peux
 * candidater » sans qu'on puisse le demander pour quelqu'un d'autre.
 */

export interface IndivSlot {
  index: number;
  startTime: string;
  endTime: string;
}

export interface MyIndivRequest {
  preferredSlot: number | null;
  note: string | null;
  selectedSlot: number | null;
}

export interface IndivSession {
  id: number;
  /** Date locale « 2026-03-17 ». */
  date: string;
  startTime: string;
  endTime: string;
  slotCount: number;
  capacityPerSlot: number;
  status: 'open' | 'announced' | 'cancelled';
  label: string | null;
  notes: string | null;
  cancelledReason: string | null;
  venue: { name: string } | null;
  slots: IndivSlot[];
  requestCount: number;
  selectedCount: number;
  myRequest: MyIndivRequest | null;
  /** Les retenus par créneau, prénom et initiale — vide tant que rien n'est annoncé. */
  selectedNames: Record<string, string[]>;
}

export interface IndivView {
  session: IndivSession | null;
  /** Le profil actif est-il d'un groupe compétiteur ? */
  eligible: boolean;
}

const NONE: IndivView = { session: null, eligible: false };

export async function fetchNextIndivSession(
  env: unknown,
  options: { memberId?: number; group?: string | null }
): Promise<IndivView> {
  try {
    const api = createApiClient(env as never);
    const params = new URLSearchParams({ limit: '1', includeCancelled: '0' });
    if (options.memberId) params.set('memberId', String(options.memberId));
    if (options.group) params.set('group', options.group);

    const res = await api.fetch(`http://localhost/schedules/indiv?${params}`);
    if (!res.ok) return NONE;

    const json = (await res.json()) as { data?: { sessions: IndivSession[]; eligible: boolean } };
    return { session: json.data?.sessions?.[0] ?? null, eligible: Boolean(json.data?.eligible) };
  } catch {
    return NONE;
  }
}

/** « 19h30-20h00 », tel que l'annonce l'écrit. */
export function formatSlot(slot: IndivSlot): string {
  const h = (t: string) => t.replace(':', 'h');
  return `${h(slot.startTime)}-${h(slot.endTime)}`;
}

/**
 * L'état de la soirée, en une phrase.
 *
 * La seule chose que le compétiteur regarde vraiment : sait-il s'il joue ?
 */
export function indivStatusLabel(session: IndivSession): { text: string; tone: 'ok' | 'pending' | 'off' } {
  if (session.status === 'cancelled') {
    return { text: session.cancelledReason ?? 'Soirée annulée', tone: 'off' };
  }
  if (session.status === 'announced') {
    return { text: `Retenus annoncés — ${session.selectedCount} sur ${session.requestCount} candidat${session.requestCount > 1 ? 's' : ''}`, tone: 'ok' };
  }
  if (session.requestCount === 0) return { text: 'Aucun candidat pour le moment', tone: 'pending' };
  return {
    text: `${session.requestCount} candidat${session.requestCount > 1 ? 's' : ''} pour ${session.slotCount * session.capacityPerSlot} places`,
    tone: 'pending'
  };
}
