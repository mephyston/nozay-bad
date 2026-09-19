import { Hono } from 'hono';
import { createDb, type Db } from '@nba/db';
import { getMembersBySeason } from '@nba/members-api';
import { listSearchablePosts, listSearchablePages } from '@nba/cms-api';
import { listEvents } from '@nba/events-api';
import { listTeams } from '@nba/teams-api';
import { listProducts } from '@nba/shop-api';
import { isolateFeatures, type ClubFeatureBindings } from './club-features';

/**
 * La recherche, pour l'espace adhérent et le site public.
 *
 * Un point d'entrée qui compose ce que chaque domaine sait lister et filtre en
 * mémoire, mot par mot, sans accents. Quelques centaines de lignes par domaine :
 * moins cher qu'un `LIKE` qui ne saurait pas lire « chèque » dans « cheque ».
 *
 * **Le périmètre vient de l'appelant, jamais de la requête.** `x-caller` est posé par
 * le worker qui appelle — site public ou espace adhérent — et authentifié par la clé
 * interne : un navigateur ne parle jamais à l'API. Le site public ne voit que le
 * public (pages, actualités publiques, agenda) ; l'espace adhérent voit ce qu'il
 * affiche déjà (adhérents si l'annuaire est ouvert, actualités privées comprises,
 * équipes, boutique). Un paramètre `scope` aurait été une invitation.
 *
 * Les fonctionnalités éteintes par le club ne répondent pas — l'annuaire des
 * adhérents en particulier, qui est un choix du club (`member_directory`).
 *
 * Les listes sources sont gardées en mémoire d'isolate une minute : ce sont elles
 * qui coûtent en base, pas le filtrage, et une frappe qui suit la première ne relit
 * rien — ni pour cet utilisateur, ni pour les autres pendant la minute.
 */
export interface SearchHit {
  kind: 'page' | 'member' | 'post' | 'event' | 'team' | 'product';
  /** Identifiant dans son domaine : chemin, licence, slug ou id. */
  id: string;
  title: string;
  /** Ce qui aide à reconnaître : date, championnat, prix, chapô… */
  subtitle: string | null;
  /** Chemin relatif dans l'application qui a demandé : c'est lui qui ouvre la bonne page. */
  href: string;
}

export interface SearchOutput {
  pages: SearchHit[];
  members: SearchHit[];
  posts: SearchHit[];
  events: SearchHit[];
  teams: SearchHit[];
  products: SearchHit[];
}

const EMPTY: SearchOutput = { pages: [], members: [], posts: [], events: [], teams: [], products: [] };

/** Résultats par rubrique : au-delà, on affine sa saisie plutôt que de faire défiler. */
const PER_KIND = 6;

/** Une minute : le temps d'une recherche, pas celui d'une publication qu'on attend. */
const SOURCE_TTL_MS = 60_000;

export function normalize(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

/** Chaque mot tapé doit se retrouver dans le texte : « remise cheque » resserre. */
export function matches(words: string[], ...fields: (string | null | undefined)[]): boolean {
  const haystack = normalize(fields.filter(Boolean).join(' '));
  return words.every((word) => haystack.includes(word));
}

const eur = (cents: number) => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(cents / 100);
const dateLabel = (iso: string) => new Date(iso).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' });
const licence8 = (licence: string) => String(licence).replace(/\D/g, '').padStart(8, '0');

/*
  Les sources, mémorisées par clé. Une promesse en échec n'est pas gardée : le
  prochain appel retente. `forgetSearchSources` sert aux tests.
*/
const sources = new Map<string, { expireA: number; value: Promise<unknown> }>();

export function forgetSearchSources(): void {
  sources.clear();
}

function remember<T>(key: string, load: () => Promise<T>, now = Date.now()): Promise<T> {
  const kept = sources.get(key);
  if (kept && kept.expireA > now) return kept.value as Promise<T>;
  const value = load().catch((error) => {
    sources.delete(key);
    throw error;
  });
  sources.set(key, { expireA: now + SOURCE_TTL_MS, value });
  return value;
}

export type SearchBindings = ClubFeatureBindings;

export const searchRouter = new Hono<{ Bindings: SearchBindings }>();

searchRouter.get('/search', async (c) => {
  if (!c.env?.DB) return c.json({ success: false, error: 'Database binding DB is missing' }, 500);

  const publicOnly = c.req.header('x-caller') === 'website';
  const q = (c.req.query('q') ?? '').trim();
  const seasonCode = (c.req.query('seasonCode') ?? '').trim();
  const words = normalize(q).split(' ').filter(Boolean);
  // Une lettre ne cherche rien : trop de bruit, et une requête par touche pour rien.
  if (q.length < 2 || words.length === 0) return c.json({ success: true, data: EMPTY });

  const db = createDb(c.env.DB);
  const features = await isolateFeatures(c.env);
  const none = <T>(): Promise<T[]> => Promise.resolve([]);

  const [pages, members, posts, events, teams, products] = await Promise.all([
    publicOnly ? remember('pages', () => listSearchablePages(db)) : none<Awaited<ReturnType<typeof listSearchablePages>>[number]>(),
    !publicOnly && features.member_directory && seasonCode ? remember(`members:${seasonCode}`, () => getMembersBySeason(db, seasonCode)) : none<Awaited<ReturnType<typeof getMembersBySeason>>[number]>(),
    remember('posts', () => listSearchablePosts(db)),
    features.events ? remember('events', () => listEvents(db)) : none<Awaited<ReturnType<typeof listEvents>>[number]>(),
    !publicOnly && features.teams && seasonCode ? remember(`teams:${seasonCode}`, () => listTeams(db, seasonCode).then((out) => out.teams)) : none<Awaited<ReturnType<typeof listTeams>>['teams'][number]>(),
    !publicOnly && features.shop ? remember('products', () => listProducts(db, { active: true })) : none<Awaited<ReturnType<typeof listProducts>>[number]>()
  ]);

  const data: SearchOutput = {
    pages: pages
      // Le titre d'abord : une page qui porte le mot dans son titre passe devant celle qui ne l'a que dans son corps.
      .map((p) => ({ p, rank: matches(words, p.title) ? 0 : matches(words, p.title, p.description, p.body) ? 1 : -1 }))
      .filter(({ rank }) => rank >= 0)
      .sort((a, b) => a.rank - b.rank)
      .slice(0, PER_KIND)
      .map(({ p }) => ({ kind: 'page', id: p.path, title: p.title, subtitle: p.description, href: p.path })),
    members: members
      .filter((m) => m.status === 'valide' && matches(words, m.firstName, m.lastName, m.licence))
      .slice(0, PER_KIND)
      .map((m) => ({ kind: 'member', id: licence8(m.licence), title: `${m.firstName} ${m.lastName}`, subtitle: `Licence ${licence8(m.licence)}`, href: `/adherents/${licence8(m.licence)}` })),
    posts: posts
      // Le site public ne rend jamais une actualité réservée aux adhérents.
      .filter((p) => (!publicOnly || p.visibility === 'public') && matches(words, p.title, p.excerpt))
      .slice(0, PER_KIND)
      .map((p) => ({
        kind: 'post',
        id: p.slug,
        title: p.title,
        subtitle: p.publishedAt ? dateLabel(p.publishedAt.toISOString()) : null,
        href: publicOnly ? p.path : `/actualites#${p.slug}`
      })),
    events: events
      .filter((e) => e.status === 'published' && matches(words, e.title, e.venueLabel, e.category))
      .slice(0, PER_KIND)
      .map((e) => ({
        kind: 'event',
        id: e.slug,
        title: e.title,
        subtitle: [dateLabel(e.startsAt), e.venueLabel].filter(Boolean).join(' · '),
        // Le site public n'ancre pas ses rendez-vous : c'est la page de l'agenda qu'on ouvre.
        href: publicOnly ? '/agenda/' : `/agenda#${e.slug}`
      })),
    teams: teams
      .filter((t) => t.active && matches(words, t.name, t.championshipLabel, t.divisionLabel, t.poolLabel, t.captain?.firstName, t.captain?.lastName))
      .slice(0, PER_KIND)
      .map((t) => ({ kind: 'team', id: String(t.id), title: t.name, subtitle: [t.championshipLabel, t.divisionLabel].filter(Boolean).join(' · '), href: `/equipes/${t.id}` })),
    products: products
      // Une déclinaison se trouve par son parent : c'est la carte qu'on ouvre.
      .filter((p) => p.parentId === null && matches(words, p.name, p.description, p.categoryLabel))
      .slice(0, PER_KIND)
      .map((p) => ({
        kind: 'product',
        id: String(p.id),
        title: p.name,
        subtitle: p.variantCount > 0 ? `${p.categoryLabel} · ${p.variantCount} choix` : `${p.categoryLabel} · ${eur(p.priceCents)}`,
        href: `/boutique?produit=${p.id}`
      }))
  };

  return c.json({ success: true, data });
});
