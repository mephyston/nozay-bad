import { createApiClient } from '@nba/api-client';

/**
 * Saison de référence du storefront.
 *
 * Tout ce qui relève d'un DROIT (accès à l'app) ou d'un AFFICHAGE (cotisation, boutique,
 * notes de frais) se règle sur la saison dont on est dans la fenêtre de dates — jamais sur
 * le drapeau `active` de la table `seasons`, qui est un outil de clôture comptable que le
 * bureau bascule au moment qui l'arrange.
 */

export interface Season {
  id: number;
  code: string;
  name: string;
  startDate: string;
  endDate: string;
  active: boolean;
}

/**
 * Date du jour à Paris, en `YYYY-MM-DD`. Le worker tourne en UTC : s'en remettre à lui
 * ferait basculer la saison deux heures trop tard, le 31 août au soir.
 *
 * Volontairement dupliqué de `lookup-household/repository.ts` : le storefront ne doit pas
 * tirer un domaine entier (routes Hono + accès D1) dans son bundle pour six lignes.
 */
export function parisToday(now: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Paris',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(now);
}

// Mémo à l'échelle de l'isolate, pour ne pas relire KV à chaque page. Daté lui aussi :
// il se périme de lui-même au changement de jour, donc au changement de saison.
let memo: { day: string; seasons: Season[] } | null = null;

/**
 * Liste des saisons, mise en cache sous une clé DATÉE : la journée est donc servie depuis
 * la mémoire ou KV, et le changement de saison prend effet exactement à minuit sans TTL à
 * arbitrer.
 */
export async function listSeasons(env: any, today: string = parisToday()): Promise<Season[]> {
  if (memo && memo.day === today) return memo.seasons;

  const kv = env?.RATE_LIMIT_KV;
  const key = `seasons:${today}`;

  if (kv && typeof kv.get === 'function') {
    try {
      const cached = await kv.get(key, { type: 'json' });
      if (Array.isArray(cached)) {
        memo = { day: today, seasons: cached as Season[] };
        return memo.seasons;
      }
    } catch (err) {
      console.warn('[season] lecture KV impossible, on interroge l’API:', err);
    }
  }

  let seasons: Season[] = [];
  try {
    const res = await createApiClient(env).fetch('http://localhost/accounting/seasons');
    if (res.ok) seasons = (((await res.json()) as any).data || []) as Season[];
  } catch (err) {
    console.error('[season] /accounting/seasons a échoué:', err);
    return [];
  }

  if (seasons.length === 0) return seasons; // panne : ne rien mémoriser, on retentera.

  memo = { day: today, seasons };
  if (kv && typeof kv.put === 'function') {
    try {
      await kv.put(key, JSON.stringify(seasons), { expirationTtl: 60 * 60 * 24 });
    } catch (err) {
      console.warn('[season] écriture KV impossible:', err);
    }
  }
  return seasons;
}

/** Saison dont la fenêtre de dates contient `today`, si elle existe. */
export function seasonAtDate(seasons: Season[], today: string): Season | undefined {
  return seasons.find((s) => s.startDate <= today && s.endDate >= today);
}

/**
 * La saison `code` est-elle encore en cours ? C'est le critère de fraîcheur d'une session :
 * elle reste valable tant que la saison au titre de laquelle elle a été ouverte n'est pas
 * terminée. Une saison inconnue (ou une session antérieure au champ `seasonCode`) est
 * traitée comme close, ce qui déclenche une re-vérification.
 */
export function isSeasonOpen(seasons: Season[], code: string, today: string): boolean {
  if (!code) return false;
  const season = seasons.find((s) => s.code === code);
  return Boolean(season && season.endDate >= today);
}

/**
 * Saison à retenir pour l'affichage : celle de la session, à défaut celle du calendrier.
 * Le repli sur `active` puis sur la première saison connue ne sert qu'à ne jamais rendre
 * une page vide si la table venait à être incohérente.
 */
export function displaySeason(
  seasons: Season[],
  sessionSeasonCode: string | undefined,
  today: string = parisToday()
): Season | undefined {
  return (
    (sessionSeasonCode ? seasons.find((s) => s.code === sessionSeasonCode) : undefined) ??
    seasonAtDate(seasons, today) ??
    seasons.find((s) => s.active) ??
    seasons[0]
  );
}
