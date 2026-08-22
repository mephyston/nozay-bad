import { createApiClient } from '@nba/api-client';

export interface OpenPlayGuest {
  firstName: string;
  lastName: string;
}

export interface OpenPlaySession {
  id: number;
  seasonCode: string;
  /** Date locale « 2026-03-21 ». */
  date: string;
  startTime: string;
  endTime: string;
  minPlayers: number;
  status: 'open' | 'confirmed' | 'cancelled';
  openerFirstName: string | null;
  openerLastName: string | null;
  label: string | null;
  notes: string | null;
  cancelledReason: string | null;
  venue: { name: string; streetAddress: string | null; city: string | null } | null;
  /** Adhérents inscrits : ceux que le club assure sans question. */
  registrationCount: number;
  guestCount: number;
  /** Le chiffre du seuil : inscrits **et** invités. */
  playerCount: number;
  needsOpener: boolean;
  /**
   * Mes invités, ou `null` si je ne suis pas inscrit — ce qui n'est pas la même chose
   * qu'un tableau vide, et décide du libellé du bouton.
   */
  myGuests: OpenPlayGuest[] | null;
  iAmOpener: boolean;
}

export interface OpenPlayView {
  sessions: OpenPlaySession[];
  /** La licence lue figure-t-elle parmi les ouvreurs désignés de la saison ? */
  canOpen: boolean;
}

/**
 * Les prochaines séances de jeu libre, lues au nom du profil actif.
 *
 * `memberId` et `licence` viennent de la session, jamais du navigateur : c'est ce qui
 * permet à l'API de répondre « voici où *tu* en es » sans qu'on puisse le demander pour
 * quelqu'un d'autre. L'API ne rend que les séances à venir tant qu'on ne lui demande pas
 * l'historique — le tri et le filtrage n'ont donc pas à être refaits ici.
 *
 * Comme pour l'agenda, une API muette dégrade l'écran mais ne l'empêche pas de s'ouvrir.
 */
export async function fetchOpenPlaySessions(
  env: unknown,
  options: { memberId?: number; licence?: string } = {}
): Promise<OpenPlayView> {
  try {
    const api = createApiClient(env as never);
    const params = new URLSearchParams();
    if (options.memberId) params.set('memberId', String(options.memberId));
    if (options.licence) params.set('licence', options.licence);

    const res = await api.fetch(`http://localhost/schedules/open-play?${params}`);
    if (!res.ok) return { sessions: [], canOpen: false };

    const json = (await res.json()) as { data?: OpenPlayView };
    return json.data ?? { sessions: [], canOpen: false };
  } catch {
    return { sessions: [], canOpen: false };
  }
}

/** « samedi 21 mars », tel que l'adhérent le lit. */
export function formatSessionDate(date: string): string {
  return new Intl.DateTimeFormat('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    timeZone: 'Europe/Paris'
  }).format(new Date(`${date}T12:00:00Z`));
}

/**
 * L'état de la séance, en une phrase lisible sans réfléchir.
 *
 * C'est la seule chose que l'adhérent regarde vraiment : sait-il s'il va jouer ?
 */
export function sessionStatusLabel(session: OpenPlaySession): {
  text: string;
  tone: 'ok' | 'pending' | 'off';
} {
  if (session.status === 'cancelled') {
    return { text: session.cancelledReason ?? 'Séance annulée', tone: 'off' };
  }
  if (session.openerFirstName) {
    const opener = `${session.openerFirstName} ${(session.openerLastName ?? '').charAt(0)}.`.trim();
    return { text: `Confirmée — ouverte par ${opener}`, tone: 'ok' };
  }
  if (session.needsOpener) return { text: 'Il manque un ouvreur', tone: 'pending' };
  return {
    text: `${session.playerCount} joueur${session.playerCount > 1 ? 's' : ''} sur ${session.minPlayers}`,
    tone: 'pending'
  };
}
