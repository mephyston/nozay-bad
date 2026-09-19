import { Hono } from 'hono';
import { createDb } from '@nba/db';
import { getMembersBySeason } from '@nba/members-api';
import { listSearchablePosts } from '@nba/cms-api';
import { listEvents } from '@nba/events-api';
import { listTeams } from '@nba/teams-api';
import { listProducts } from '@nba/shop-api';
import { isolateFeatures, type ClubFeatureBindings } from './club-features';

/**
 * La recherche de l'espace adhérent : ce que le club contient, en une frappe.
 *
 * Un point d'entrée qui compose ce que chaque domaine sait lister — adhérents,
 * actualités, agenda, équipes, boutique — et filtre en mémoire, mot par mot, sans
 * accents. Quelques centaines de lignes par domaine : moins cher qu'un `LIKE` qui ne
 * saurait pas lire « chèque » dans « cheque », et rien qui pèse sur le plan gratuit
 * tant que le client débounce sa frappe.
 *
 * Les fonctionnalités éteintes par le club ne répondent pas : l'annuaire des adhérents
 * en particulier, qui est un choix du club (`member_directory`), comme sur la fiche.
 */
export interface SearchHit {
  kind: 'member' | 'post' | 'event' | 'team' | 'product';
  /** Identifiant dans son domaine : licence, slug ou id. */
  id: string;
  title: string;
  /** Ce qui aide à reconnaître : date, championnat, prix, chapô… */
  subtitle: string | null;
  /** Chemin dans l'espace adhérent, relatif : c'est lui qui ouvre la bonne page. */
  href: string;
}

export interface SearchOutput {
  members: SearchHit[];
  posts: SearchHit[];
  events: SearchHit[];
  teams: SearchHit[];
  products: SearchHit[];
}

/** Résultats par rubrique : au-delà, on affine sa saisie plutôt que de faire défiler. */
const PER_KIND = 6;

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

const dateLabel = (iso: string) =>
  new Date(iso).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' });

const licence8 = (licence: string) => String(licence).replace(/\D/g, '').padStart(8, '0');

export type SearchBindings = ClubFeatureBindings;

export const searchRouter = new Hono<{ Bindings: SearchBindings }>();

searchRouter.get('/search', async (c) => {
  if (!c.env?.DB) return c.json({ success: false, error: 'Database binding DB is missing' }, 500);

  const q = (c.req.query('q') ?? '').trim();
  const seasonCode = (c.req.query('seasonCode') ?? '').trim();
  const words = normalize(q).split(' ').filter(Boolean);
  const empty: SearchOutput = { members: [], posts: [], events: [], teams: [], products: [] };
  // Une lettre ne cherche rien : trop de bruit, et une requête par touche pour rien.
  if (q.length < 2 || words.length === 0) return c.json({ success: true, data: empty });

  const db = createDb(c.env.DB);
  const features = await isolateFeatures(c.env);

  const [members, posts, events, teams, products] = await Promise.all([
    features.member_directory && seasonCode ? getMembersBySeason(db, seasonCode) : Promise.resolve([]),
    listSearchablePosts(db),
    features.events ? listEvents(db) : Promise.resolve([]),
    features.teams && seasonCode ? listTeams(db, seasonCode).then((out) => out.teams) : Promise.resolve([]),
    features.shop ? listProducts(db, { active: true }) : Promise.resolve([])
  ]);

  const data: SearchOutput = {
    members: members
      .filter((m) => m.status === 'valide' && matches(words, m.firstName, m.lastName, m.licence))
      .slice(0, PER_KIND)
      .map((m) => ({
        kind: 'member',
        id: licence8(m.licence),
        title: `${m.firstName} ${m.lastName}`,
        subtitle: `Licence ${licence8(m.licence)}`,
        href: `/adherents/${licence8(m.licence)}`
      })),
    posts: posts
      .filter((p) => matches(words, p.title, p.excerpt))
      .slice(0, PER_KIND)
      .map((p) => ({
        kind: 'post',
        id: p.slug,
        title: p.title,
        subtitle: p.publishedAt ? dateLabel(p.publishedAt.toISOString()) : null,
        href: `/actualites#${p.slug}`
      })),
    events: events
      .filter((e) => e.status === 'published' && matches(words, e.title, e.venueLabel, e.category))
      .slice(0, PER_KIND)
      .map((e) => ({
        kind: 'event',
        id: e.slug,
        title: e.title,
        subtitle: [dateLabel(e.startsAt), e.venueLabel].filter(Boolean).join(' · '),
        href: `/agenda#${e.slug}`
      })),
    teams: teams
      .filter((t) => t.active && matches(words, t.name, t.championshipLabel, t.divisionLabel, t.poolLabel, t.captain?.firstName, t.captain?.lastName))
      .slice(0, PER_KIND)
      .map((t) => ({
        kind: 'team',
        id: String(t.id),
        title: t.name,
        subtitle: [t.championshipLabel, t.divisionLabel].filter(Boolean).join(' · '),
        href: `/equipes/${t.id}`
      })),
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
