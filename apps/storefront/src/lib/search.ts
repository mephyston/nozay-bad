/**
 * La recherche de contenu, vue du navigateur.
 *
 * Elle interroge `/api/search`, qui relaie à l'API sous la session de l'adhérent, et
 * rend les rubriques dans un ordre fixe — celui de l'espace : les gens, puis ce qui
 * se lit, puis ce qui se joue, puis ce qui s'achète. Une rubrique éteinte par le club
 * revient vide et ne s'affiche pas.
 */
export interface ContentSearchHit {
  kind: 'member' | 'post' | 'event' | 'team' | 'product';
  id: string;
  title: string;
  subtitle: string | null;
  href: string;
}

export interface ContentSearchGroup {
  kind: ContentSearchHit['kind'];
  label: string;
  hits: ContentSearchHit[];
}

const GROUPS: { kind: ContentSearchHit['kind']; key: 'members' | 'posts' | 'events' | 'teams' | 'products'; label: string }[] = [
  { kind: 'member', key: 'members', label: 'Adhérents' },
  { kind: 'post', key: 'posts', label: 'Actualités' },
  { kind: 'event', key: 'events', label: 'Agenda' },
  { kind: 'team', key: 'teams', label: 'Équipes' },
  { kind: 'product', key: 'products', label: 'Boutique' }
];

export function groupContentHits(data: Partial<Record<(typeof GROUPS)[number]['key'], ContentSearchHit[]>> | null | undefined): ContentSearchGroup[] {
  return GROUPS.map((g) => ({ kind: g.kind, label: g.label, hits: data?.[g.key] ?? [] }));
}

/** Ne lève jamais : sans réseau, la recherche de contenu se tait et le menu répond seul. */
export async function searchContent(q: string, fetcher: typeof fetch = fetch): Promise<ContentSearchGroup[]> {
  try {
    const res = await fetcher(`/api/search?q=${encodeURIComponent(q)}`);
    if (!res.ok) return groupContentHits(null);
    const json = (await res.json()) as { data?: Parameters<typeof groupContentHits>[0] };
    return groupContentHits(json.data);
  } catch {
    return groupContentHits(null);
  }
}
