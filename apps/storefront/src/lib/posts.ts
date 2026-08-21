import { createApiClient } from '@nba/api-client';

export interface PostCategory {
  id: number;
  slug: string;
  name: string;
}

export interface PostCover {
  id: number;
  key: string;
  alt: string;
  width: number | null;
  height: number | null;
}

export interface MemberPost {
  id: number;
  slug: string;
  path: string;
  title: string;
  excerpt: string | null;
  bodyHtml: string;
  visibility: 'public' | 'private';
  publishedAt: string | number | null;
  cover?: PostCover | null;
  categories?: PostCategory[];
  /**
   * Événement de l'agenda annoncé par l'actualité, s'il y en a un.
   *
   * Un simple identifiant : c'est l'écran qui le rapproche de l'agenda déjà chargé,
   * plutôt que l'API qui joindrait deux domaines pour un numéro. Un identifiant devenu
   * orphelin ne trouve rien et n'affiche rien.
   */
  eventId?: number | null;
}

export interface FetchedPosts {
  posts: MemberPost[];
  /** Vrai si l'API n'a pas répondu : distingue « rien à afficher » de « rien n'a pu être lu ». */
  failed: boolean;
}

/** Nom du paramètre d'URL qui porte le filtre : `/actualites?filtre=actions-jeunes`. */
export const CATEGORY_PARAM = 'filtre';

/**
 * Adresse d'une actualité dans l'espace adhérent.
 *
 * Il n'y a pas de page par article ici : la liste les rend tous, et chaque carte porte
 * son slug en ancre (`PostCard`). Viser cette ancre est donc la façon d'« ouvrir » une
 * actualité — le navigateur y descend, et `scroll-mt` dégage l'en-tête collant.
 */
export function postAnchor(post: Pick<MemberPost, 'slug'>): string {
  return `/actualites#${post.slug}`;
}

/**
 * Combien d'actualités lire pour retrouver celle qui annonce un rendez-vous.
 *
 * Plus large que ce qu'un écran affiche : l'article qui annonce une compétition de
 * mars peut dater de janvier. Au-delà de cette fenêtre le lien ne se fait pas, et
 * c'est acceptable — c'est un raccourci vers l'article, jamais le seul chemin qui y
 * mène.
 */
export const ANNOUNCEMENT_LOOKUP_LIMIT = 50;

/**
 * Lit les actualités destinées aux adhérents, sans jamais faire échouer la page.
 *
 * L'espace adhérent voit **tout** — publiques et réservées —, là où le site public ne
 * voit que les publiques. Ce cloisonnement n'est pas décidé ici : l'API le déduit de
 * l'en-tête `x-caller`, précisément pour qu'un oubli côté client ne divulgue rien.
 *
 * Une API indisponible dégrade l'écran, elle ne l'empêche pas de s'ouvrir : l'accueil
 * de l'espace adhérent porte aussi la cotisation et les raccourcis, qui doivent rester.
 */
export async function fetchPosts(env: unknown, limit: number): Promise<FetchedPosts> {
  try {
    const apiService = createApiClient(env as never);
    const res = await apiService.fetch(`http://localhost/cms/posts?limit=${limit}`);
    if (!res.ok) return { posts: [], failed: true };

    const json = (await res.json()) as { data?: { posts?: MemberPost[] } };
    return { posts: json.data?.posts ?? [], failed: false };
  } catch {
    return { posts: [], failed: true };
  }
}

/**
 * Amorce du texte d'une actualité, pour une carte qui la résume.
 *
 * Le chapô fait autorité quand il existe — c'est la phrase que la rédaction a choisie.
 * À défaut on retombe sur le corps, débarrassé de son balisage : les fermetures de
 * blocs deviennent des espaces, sans quoi « …du club.</p><p>Rendez-vous » se lirait
 * « du club.Rendez-vous ».
 *
 * Reprise de la carte du site public, dont l'accueil de l'espace adhérent adopte la
 * présentation. Ici plutôt que dans le composant : c'est de la manipulation de texte,
 * elle se teste sans monter de gabarit.
 */
export function previewOf(post: Pick<MemberPost, 'excerpt' | 'bodyHtml'>): string {
  return (
    post.excerpt?.trim() ||
    post.bodyHtml
      .replace(/<\/(p|li|ul|ol|h2|h3|h4|blockquote)\s*>/gi, ' ')
      .replace(/<[^>]*>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&#39;|&apos;/g, "'")
      .replace(/&quot;/g, '"')
      .replace(/\s+/g, ' ')
      .trim()
  );
}

/**
 * Lit le filtre de rubrique dans l'URL. `null` signifie « toutes les actualités ».
 *
 * La valeur n'est pas validée ici : elle l'est en confrontant le slug aux rubriques
 * réellement présentes (voir `listCategories`), ce qui évite d'entretenir une liste
 * en double avec le CMS.
 */
export function readCategoryFilter(url: URL): string | null {
  return url.searchParams.get(CATEGORY_PARAM) || null;
}

/**
 * Les rubriques proposées au filtre, déduites des actualités affichées.
 *
 * Déduites, et non lues depuis le CMS : une rubrique qui ne classe aucune actualité
 * n'aurait donné qu'un filtre vide, et la liste des rubriques du CMS peut contenir des
 * entrées réservées au site public. Ici, tout filtre proposé ramène au moins un
 * résultat. Tri alphabétique français, l'ordre du CMS n'ayant pas de sens de lecture.
 */
export function listCategories(posts: MemberPost[]): PostCategory[] {
  const bySlug = new Map<string, PostCategory>();
  for (const post of posts) {
    for (const category of post.categories ?? []) {
      if (!bySlug.has(category.slug)) bySlug.set(category.slug, category);
    }
  }
  return [...bySlug.values()].sort((a, b) => a.name.localeCompare(b.name, 'fr'));
}

/**
 * Restreint les actualités à une rubrique. `null` rend la liste entière.
 *
 * Une actualité sans rubrique n'apparaît sous aucun filtre — mais « Tout » reste la
 * position par défaut, donc elle ne devient jamais introuvable.
 */
export function filterByCategory(posts: MemberPost[], slug: string | null): MemberPost[] {
  if (!slug) return posts;
  return posts.filter((post) => (post.categories ?? []).some((c) => c.slug === slug));
}
