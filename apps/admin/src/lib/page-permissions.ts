import type { Permission } from '@nba/iam-ui';
import type { Feature } from '@nba/club-ui';

/**
 * Permission requise pour ouvrir une page, par motif de route Astro.
 *
 * Appliqué centralement par le middleware : **une route absente de cette table est
 * refusée**. C'est ce qui rend l'application fermée par défaut et corrige d'un coup
 * la dizaine de pages qui acceptaient des écritures sans la moindre garde, y compris
 * celles auxquelles personne ne pensait.
 *
 * La granularité est celle de la *consultation*. `/admin/accounting` n'exige que
 * `accounting:ledger:read`, si bien que la présidence peut consulter le grand livre ;
 * l'écriture est refusée par l'API, qui est l'autorité. La page décide de la
 * visibilité, l'API décide du droit d'agir.
 *
 * `null` = accessible à tout compte d'administration existant.
 *
 * `page-permissions.test.ts` vérifie dans les deux sens que cette table et les pages
 * réellement présentes coïncident : ni une page oubliée, ni une entrée orpheline.
 */
export const PAGE_PERMISSIONS: Record<string, Permission | null> = {
  '/': 'dashboard:overview:read',
  '/changelog': null,

  '/admin/help': 'help:docs:read',
  '/admin/help/[slug]': 'help:docs:read',

  '/admin/members': 'members:members:read',
  '/admin/members/dirigeants': 'members:members:read',
  '/admin/members/[licence]': 'members:members:read',
  '/admin/members/import': 'members:members:import',

  '/admin/accounting': 'accounting:ledger:read',
  // L'ancienne adresse de la Caisse redirige vers l'écran par compte.
  '/admin/accounting/cash-box': 'accounting:ledger:read',
  '/admin/accounting/accounts/[code]': 'accounting:ledger:read',
  '/admin/accounting/reconciliation': 'accounting:bank:read',
  '/admin/accounting/invoices': 'accounting:invoices:read',
  '/admin/accounting/invoices/[id]': 'accounting:invoices:read',
  '/admin/accounting/attestations/[id]': 'members:attestations:read',
  '/admin/accounting/cheques': 'accounting:checks:read',
  '/admin/accounting/cheques/list': 'accounting:checks:read',
  '/admin/accounting/cheques/deposits': 'accounting:checks:read',
  '/admin/accounting/cheques/deposits/[id]': 'accounting:checks:read',
  '/admin/accounting/reports': 'accounting:reports:read',
  '/admin/accounting/reports/[report]': 'accounting:reports:read',

  '/admin/expenses': 'expenses:reports:read',

  '/admin/shop/products': 'shop:products:read',
  '/admin/shop/orders': 'shop:orders:read',

  '/admin/website/media': 'cms:media:read',
  '/admin/website/pages': 'cms:pages:read',
  '/admin/website/pages/[id]': 'cms:pages:read',
  '/admin/website/posts': 'cms:posts:read',
  '/admin/website/menus': 'cms:pages:read',
  '/admin/website/redirects': 'cms:nav:read',
  '/admin/website/footer': 'cms:pages:read',
  '/admin/website/schedules': 'schedules:slots:read',
  '/admin/website/jeu-libre': 'schedules:open-play:read',
  '/admin/website/jeu-libre/ouvreurs': 'schedules:open-play:read',
  '/admin/website/events': 'events:events:read',
  '/admin/entrainement/indiv': 'schedules:indiv:read',
  '/admin/entrainement/indiv/selection': 'schedules:indiv:read',
  '/admin/teams': 'teams:teams:read',
  '/admin/teams/classements': 'teams:rankings:read',
  '/admin/teams/classements/import': 'teams:rankings:import',
  '/admin/teams/journees': 'teams:lineups:read',
  '/admin/teams/reglements': 'teams:rankings:read',
  '/admin/notifications': 'notifications:messages:read',

  '/admin/settings': 'settings:hub:read',
  // Écran de gestion, pas de consultation : lire les exercices est un besoin de
  // données d'autres écrans (sélecteur de saison), pas une raison d'ouvrir
  // celui-ci — d'où le droit d'écriture.
  '/admin/settings/seasons': 'accounting:seasons:write',
  '/admin/settings/accounting': 'accounting:config:read',
  '/admin/settings/tresorerie': 'accounting:config:read',
  '/admin/settings/attestation': 'members:attestations:read',
  '/admin/settings/products': 'shop:products:read',
  '/admin/settings/plateforme': 'settings:platform:read',
  '/admin/settings/club': 'settings:club:read',
  '/admin/settings/club/[section]': 'settings:club:read',
  // Gestion des salles : les créneaux, l'agenda et le site y renvoient.
  '/admin/settings/gymnases': 'schedules:slots:write',

  '/admin/iam': 'iam:users:read'
};

/**
 * Fonctionnalité dont dépend une page, par motif de route.
 *
 * Complément de `PAGE_PERMISSIONS`, même granularité : une page dont le club a éteint
 * la fonctionnalité répond **introuvable**, avant même la question des droits — une
 * rubrique éteinte n'existe pas, et « accès refusé » laisserait entendre qu'elle est là.
 * Une page absente d'ici ne dépend d'aucune fonctionnalité.
 *
 * `page-permissions.test.ts` vérifie que chaque entrée du menu qui porte une
 * fonctionnalité (`nav.ts`) est déclarée ici avec la même, et qu'aucun motif n'est
 * orphelin de `PAGE_PERMISSIONS`.
 *
 * Les pages figées (`prerender`) ne passent pas par le middleware : pour elles, ce sont
 * leurs relais qui répondent introuvable (`disponible` dans `relais.ts`), et la coquille
 * affiche l'écran vide. Le menu, lui, cache l'entrée dans tous les cas.
 */
export const PAGE_FEATURES: Record<string, Feature> = {
  '/admin/accounting': 'accounting',
  '/admin/accounting/cash-box': 'accounting',
  '/admin/accounting/accounts/[code]': 'accounting',
  '/admin/accounting/reconciliation': 'accounting',
  '/admin/accounting/invoices': 'invoices',
  '/admin/accounting/invoices/[id]': 'invoices',
  '/admin/accounting/attestations/[id]': 'attestations',
  '/admin/accounting/cheques': 'checks',
  '/admin/accounting/cheques/list': 'checks',
  '/admin/accounting/cheques/deposits': 'checks',
  '/admin/accounting/cheques/deposits/[id]': 'checks',
  '/admin/accounting/reports': 'accounting',
  '/admin/accounting/reports/[report]': 'accounting',

  '/admin/expenses': 'expenses',

  '/admin/shop/products': 'shop',
  '/admin/shop/orders': 'shop',

  '/admin/website/media': 'website',
  '/admin/website/pages': 'website',
  '/admin/website/pages/[id]': 'website',
  '/admin/website/menus': 'website',
  '/admin/website/redirects': 'website',
  '/admin/website/footer': 'website',
  '/admin/website/schedules': 'schedules',
  '/admin/website/jeu-libre': 'open_play',
  '/admin/website/jeu-libre/ouvreurs': 'open_play',
  '/admin/website/events': 'events',
  '/admin/entrainement/indiv': 'indiv',
  '/admin/entrainement/indiv/selection': 'indiv',
  '/admin/teams': 'teams',
  '/admin/teams/classements': 'teams',
  '/admin/teams/classements/import': 'teams',
  '/admin/teams/journees': 'teams',
  '/admin/teams/reglements': 'teams',
  '/admin/notifications': 'push',

  '/admin/settings/attestation': 'attestations',
  '/admin/settings/products': 'shop'
};

/**
 * Chemins hors du contrôle par page.
 *
 * Les points d'entrée `/api/**` et `/admin/api/**` ne rendent pas de page : ils
 * relaient vers l'API, qui applique sa propre table de permissions. Les ressources
 * statiques et les routes internes d'Astro n'ont pas de contrôle d'accès non plus.
 */
export function isPageRoute(pathname: string): boolean {
  if (pathname.startsWith('/api/') || pathname.startsWith('/admin/api/')) return false;
  if (pathname.startsWith('/_')) return false;
  // Une extension de fichier signale une ressource, pas une page.
  return !/\.[a-z0-9]+$/i.test(pathname);
}

/**
 * Convertit un chemin demandé en motif de route Astro.
 *
 * On compare au motif plutôt qu'au chemin brut pour que `/admin/members/12345678`
 * soit gouverné par la même règle que `/admin/members/[licence]`. Un chemin qui ne
 * correspond à aucun motif retourne `undefined`, donc un refus.
 */
export function matchPagePattern(pathname: string): string | undefined {
  const path = pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname;
  if (PAGE_PERMISSIONS[path] !== undefined) return path;

  const segments = path.split('/').filter(Boolean);
  for (const pattern of Object.keys(PAGE_PERMISSIONS)) {
    const patternSegments = pattern.split('/').filter(Boolean);
    if (patternSegments.length !== segments.length) continue;
    const ok = patternSegments.every(
      (s, i) => (s.startsWith('[') && s.endsWith(']')) || s === segments[i]
    );
    if (ok) return pattern;
  }
  return undefined;
}
