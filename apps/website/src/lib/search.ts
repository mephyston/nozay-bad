import { createApiClient } from '@nba/api-client';
import type { WebsiteEnv } from './cms';

/**
 * Ce que le site public sait chercher : ses pages, ses actualités, son agenda.
 *
 * L'API décide du périmètre d'après l'appelant — `website` ne reçoit jamais autre
 * chose que du public, quoi qu'on lui demande. Ici on ne fait que relayer, et
 * ranger dans l'ordre de lecture du site.
 */
export interface SiteSearchHit {
  kind: 'page' | 'post' | 'event';
  id: string;
  title: string;
  subtitle: string | null;
  href: string;
}

export interface SiteSearchGroup {
  kind: SiteSearchHit['kind'];
  label: string;
  hits: SiteSearchHit[];
}

const GROUPS: { kind: SiteSearchHit['kind']; key: 'pages' | 'posts' | 'events'; label: string }[] = [
  { kind: 'page', key: 'pages', label: 'Pages' },
  { kind: 'post', key: 'posts', label: 'Actualités' },
  { kind: 'event', key: 'events', label: 'Agenda' }
];

export function groupSiteHits(data: Partial<Record<(typeof GROUPS)[number]['key'], SiteSearchHit[]>> | null | undefined): SiteSearchGroup[] {
  return GROUPS.map((g) => ({ kind: g.kind, label: g.label, hits: data?.[g.key] ?? [] }));
}

/** Côté serveur : la page `/recherche` et le point `/api/search` passent par là. */
export async function searchSite(env: WebsiteEnv, q: string): Promise<SiteSearchGroup[]> {
  if (q.length < 2) return groupSiteHits(null);
  try {
    const res = await createApiClient(env as never, { caller: 'website' }).fetch(`http://localhost/search?q=${encodeURIComponent(q)}`);
    if (!res.ok) return groupSiteHits(null);
    const json = (await res.json()) as { data?: Parameters<typeof groupSiteHits>[0] };
    return groupSiteHits(json.data);
  } catch {
    return groupSiteHits(null);
  }
}

/** Côté navigateur : la loupe de l'en-tête. Ne lève jamais. */
export async function fetchSiteSearch(q: string, fetcher: typeof fetch = fetch): Promise<SiteSearchGroup[]> {
  try {
    const res = await fetcher(`/api/search.json?q=${encodeURIComponent(q)}`);
    if (!res.ok) return groupSiteHits(null);
    const json = (await res.json()) as { data?: Parameters<typeof groupSiteHits>[0] };
    return groupSiteHits(json.data);
  } catch {
    return groupSiteHits(null);
  }
}
