import { createApiClient } from '@nba/api-client';
import type { ClubFixture, ClubTeam } from '@nba/teams-api';

export type { ClubFixture, ClubTeam };

export interface ClubFixturesView {
  fixtures: ClubFixture[];
  teams: ClubTeam[];
}

const NONE: ClubFixturesView = { fixtures: [], teams: [] };

/**
 * Les rencontres de toutes les équipes du club. Comme les autres encarts, une API muette
 * les fait disparaître sans empêcher la page de s'ouvrir.
 */
export async function fetchClubFixtures(env: unknown, seasonCode: string | null, range: { from?: string; to?: string } = {}): Promise<ClubFixturesView> {
  if (!seasonCode) return NONE;
  try {
    const query = new URLSearchParams({ seasonCode });
    if (range.from) query.set('from', range.from);
    if (range.to) query.set('to', range.to);
    const res = await createApiClient(env as never).fetch(`http://localhost/teams/club-fixtures?${query}`);
    if (!res.ok) return NONE;
    const json = (await res.json()) as { data?: ClubFixturesView };
    return json.data ?? NONE;
  } catch {
    return NONE;
  }
}

const addDays = (date: string, days: number) => {
  const [y, m, d] = date.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
};

/**
 * Ce que l'accueil annonce : le week-end dès le vendredi (vendredi → dimanche), le jour
 * même les autres jours. `today` est le jour civil du club.
 */
export function homeFixturesWindow(today: string): { from: string; to: string; weekend: boolean } {
  const weekday = new Date(`${today}T12:00:00Z`).getUTCDay();
  if (weekday === 5) return { from: today, to: addDays(today, 2), weekend: true };
  if (weekday === 6) return { from: today, to: addDays(today, 1), weekend: true };
  if (weekday === 0) return { from: today, to: today, weekend: true };
  return { from: today, to: today, weekend: false };
}

/**
 * Une couleur par équipe, toujours la même pour un même numéro : elle aide à distinguer les
 * lignes, jamais seule — le nom de l'équipe l'accompagne partout. Des teintes assez
 * soutenues pour se lire sur fond clair comme sombre.
 */
const TEAM_COLORS = ['#2563eb', '#db2777', '#059669', '#d97706', '#7c3aed', '#0891b2', '#dc2626', '#65a30d', '#c026d3', '#0d9488'];

export function teamColor(teamNumber: number): string {
  return TEAM_COLORS[(Math.max(1, teamNumber) - 1) % TEAM_COLORS.length];
}

const DAYS = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
const MONTHS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];

/** « samedi 28 novembre · 20 h 30 », ou « semaine du 23 novembre » sans date. */
export function fixtureWhen(fixture: Pick<ClubFixture, 'date' | 'weekStart'>): string {
  if (!fixture.date) {
    const [, m, d] = fixture.weekStart.split('-').map(Number);
    return `semaine du ${d} ${MONTHS[m - 1]}`;
  }
  const [y, m, d] = fixture.date.slice(0, 10).split('-').map(Number);
  const day = `${DAYS[new Date(Date.UTC(y, m - 1, d)).getUTCDay()]} ${d} ${MONTHS[m - 1]}`;
  const time = /T(\d{2}):(\d{2})/.exec(fixture.date);
  return time ? `${day} · ${Number(time[1])} h${time[2] === '00' ? '' : ` ${time[2]}`}` : day;
}
