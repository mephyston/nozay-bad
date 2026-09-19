import type { NavGroup, NavItem, QuickAction } from './nav';

/**
 * La recherche dans le menu : ce qu'on tape quand on ne sait plus où est la page.
 *
 * Elle ne cherche que dans le menu — pages et saisies rapides —, jamais dans les
 * données : « commande » mène à *Boutique › Commandes* et à *Nouvelle commande*, pas
 * à une commande. Insensible aux accents et à la casse ; chaque mot tapé doit se
 * retrouver dans le nom, la rubrique ou les mots-clés, si bien que « remise cheque »
 * resserre au lieu d'élargir. Le nom pèse plus que les mots-clés : *Commandes* passe
 * avant *Produits* quand on tape « commande », même si les deux le connaissent.
 */
export interface NavSearchHit {
  kind: 'page' | 'action';
  name: string;
  icon: string;
  href: string;
  /** Rubrique du menu, pour lever les homonymes (« Pages » du site, « Menus » du site…). */
  group: string;
  /** Saisie rapide : l'événement à émettre quand on est déjà sur la page. */
  event?: string;
  pathPrefix?: string;
}

/** Minuscules, sans accents ni ponctuation : la forme sous laquelle tout est comparé. */
export function normalize(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function tokens(query: string): string[] {
  return normalize(query).split(' ').filter(Boolean);
}

interface Candidate {
  hit: NavSearchHit;
  name: string;
  haystack: string;
}

function score(candidate: Candidate, words: string[]): number {
  let total = 0;
  for (const word of words) {
    if (candidate.name.startsWith(word)) total += 4;
    else if (candidate.name.includes(word)) total += 3;
    else if (candidate.haystack.includes(word)) total += 1;
    else return 0;
  }
  return total;
}

function candidateOf(hit: NavSearchHit, keywords: string[] | undefined): Candidate {
  const name = normalize(hit.name);
  const haystack = normalize([hit.name, hit.group, ...(keywords ?? [])].join(' '));
  return { hit, name, haystack };
}

export function searchNav(
  groups: Pick<NavGroup, 'label' | 'items'>[],
  actions: QuickAction[],
  query: string,
  limit = 8
): NavSearchHit[] {
  const words = tokens(query);
  if (words.length === 0) return [];

  const candidates: Candidate[] = [];
  for (const group of groups) {
    for (const item of group.items as NavItem[]) {
      candidates.push(candidateOf({ kind: 'page', name: item.name, icon: item.icon, href: item.href, group: group.label }, item.keywords));
    }
  }
  for (const action of actions) {
    candidates.push(
      candidateOf(
        { kind: 'action', name: action.name, icon: action.icon, href: action.href, group: 'Saisie rapide', event: action.event, pathPrefix: action.pathPrefix },
        action.keywords
      )
    );
  }

  return candidates
    .map((candidate, index) => ({ candidate, index, points: score(candidate, words) }))
    .filter((entry) => entry.points > 0)
    // À points égaux, l'ordre du menu : c'est celui que l'utilisateur connaît.
    .sort((a, b) => b.points - a.points || a.index - b.index)
    .slice(0, limit)
    .map((entry) => entry.candidate.hit);
}
