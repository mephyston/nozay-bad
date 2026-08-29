import type { Permission } from '@nba/iam-ui';

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
  '/admin/ai': 'ai:assistant:use',

  '/admin/members': 'members:members:read',
  '/admin/members/dirigeants': 'members:members:read',
  '/admin/members/[licence]': 'members:members:read',
  '/admin/members/import': 'members:members:import',

  '/admin/accounting': 'accounting:ledger:read',
  '/admin/accounting/cash-box': 'accounting:ledger:read',
  '/admin/accounting/reconciliation': 'accounting:bank:read',
  '/admin/accounting/invoices': 'accounting:invoices:read',
  '/admin/accounting/invoices/[id]': 'accounting:invoices:read',
  '/admin/accounting/attestations/[id]': 'members:attestations:read',
  '/admin/accounting/cheques': 'accounting:checks:read',
  '/admin/accounting/cheques/list': 'accounting:checks:read',
  '/admin/accounting/cheques/deposits': 'accounting:checks:read',
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
  // Preuve de concept, à retirer avec la page.
  '/admin/website/menus-poc': 'cms:pages:read',
  '/admin/website/redirects': 'cms:nav:read',
  '/admin/website/footer': 'cms:pages:read',
  '/admin/website/schedules': 'schedules:slots:read',
  '/admin/website/jeu-libre': 'schedules:open-play:read',
  '/admin/website/jeu-libre/ouvreurs': 'schedules:open-play:read',
  '/admin/website/events': 'events:events:read',
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
  '/admin/settings/attestation': 'members:attestations:read',
  '/admin/settings/products': 'shop:products:read',
  '/admin/settings/plateforme': 'settings:platform:read',

  '/admin/iam': 'iam:users:read'
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
