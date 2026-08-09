import type { RouteRule } from './types';

/**
 * Permission exigée par route, pour toute l'API.
 *
 * C'est la seule table d'autorisation de l'application. Une route absente d'ici est
 * refusée : le modèle est fermé par défaut, y compris pour une route ajoutée sans y
 * penser. `coverage.test.ts` vérifie dans les deux sens que cette table et les routes
 * réellement montées coïncident, donc ni un oubli ni une règle orpheline ne peuvent
 * passer la revue.
 *
 * L'ordre des lignes n'a aucune importance : `matcher.ts` trie par spécificité au
 * chargement. Elles sont groupées par domaine pour la lecture.
 *
 * `service: true` marque les routes appelées par le Worker storefront, qui agit pour
 * un adhérent connecté (session OTP) et non pour un compte d'administration. La liste
 * a été établie à partir des appels réellement présents dans `apps/storefront`.
 */
export const ROUTE_PERMISSIONS: RouteRule[] = [
  // ── Identité et gestion des accès ──────────────────────────────────────────
  // Jamais `service` : le storefront n'a pas de compte d'administration à résoudre.
  // Seule route exemptée de l'existence du compte : c'est elle qui crée le premier
  // administrateur et qui répond « compte non configuré » aux autres.
  { method: 'GET', path: '/iam/me', permission: null, allowUnknownActor: true },
  { method: 'GET', path: '/iam/users', permission: 'iam:users:read' },
  { method: 'POST', path: '/iam/users', permission: 'iam:users:write' },
  { method: 'PUT', path: '/iam/users/:id', permission: 'iam:users:write' },
  { method: 'DELETE', path: '/iam/users/:id', permission: 'iam:users:delete' },
  { method: 'GET', path: '/iam/roles', permission: 'iam:roles:read' },
  // Modifier ce qu'un rôle accorde revient à pouvoir s'accorder n'importe quel droit :
  // seul `super_admin` porte cette permission (voir permissions.ts).
  { method: 'PUT', path: '/iam/roles/:role', permission: 'iam:roles:write' },

  // ── Tableau de bord et assistant IA ────────────────────────────────────────
  { method: 'GET', path: '/dashboard/overview', permission: 'dashboard:overview:read' },
  { method: 'POST', path: '/ai/chat', permission: 'ai:assistant:use' },

  // ── Adhérents ──────────────────────────────────────────────────────────────
  { method: 'GET', path: '/members', permission: 'members:members:read' },
  { method: 'POST', path: '/members/import', permission: 'members:members:import' },
  // Recherche du foyer à la connexion OTP : appelée avant toute session.
  { method: 'POST', path: '/members/lookup-household', permission: 'members:members:read', service: true },
  { method: 'PATCH', path: '/members/:id/expense-authorization', permission: 'members:members:write' },
  { method: 'GET', path: '/members/attestation/config', permission: 'members:attestations:read' },
  { method: 'PUT', path: '/members/attestation/config', permission: 'members:attestations:write' },
  { method: 'POST', path: '/members/attestation/signature', permission: 'members:attestations:write' },
  { method: 'GET', path: '/members/:id/cse-data', permission: 'members:attestations:read' },
  // L'adhérent télécharge sa propre attestation ; le storefront impose l'identifiant
  // de la session, il n'est jamais repris de l'URL.
  { method: 'GET', path: '/members/:id/cse-attestation.pdf', permission: 'members:attestations:read', service: true },
  { method: 'GET', path: '/members/:licence', permission: 'members:members:read', service: true },

  // ── Comptabilité : exercices, budget, rapports ─────────────────────────────
  { method: 'GET', path: '/accounting/seasons', permission: 'accounting:seasons:read', service: true },
  { method: 'POST', path: '/accounting/seasons', permission: 'accounting:seasons:write' },
  { method: 'PUT', path: '/accounting/seasons/:id', permission: 'accounting:seasons:write' },
  { method: 'GET', path: '/accounting/seasons/:id/close-checks', permission: 'accounting:seasons:close' },
  { method: 'POST', path: '/accounting/seasons/:id/close', permission: 'accounting:seasons:close' },
  { method: 'POST', path: '/accounting/seasons/:id/reopen', permission: 'accounting:seasons:close' },
  { method: 'GET', path: '/accounting/seasons/:seasonId/balance', permission: 'accounting:reports:read' },
  { method: 'GET', path: '/accounting/seasons/:seasonId/balances', permission: 'accounting:reports:read' },
  { method: 'POST', path: '/accounting/seasons/:seasonId/balances', permission: 'accounting:seasons:write' },
  { method: 'GET', path: '/accounting/seasons/:seasonId/budget', permission: 'accounting:budget:read' },
  { method: 'POST', path: '/accounting/seasons/:seasonId/budget', permission: 'accounting:budget:write' },
  { method: 'GET', path: '/accounting/seasons/:seasonId/reports', permission: 'accounting:reports:read' },
  { method: 'GET', path: '/accounting/seasons/:seasonId/reports/pdf', permission: 'accounting:reports:export' },
  { method: 'GET', path: '/accounting/seasons/:season/export', permission: 'accounting:reports:export' },
  { method: 'POST', path: '/accounting/seasons/:seasonId/ai/analysis', permission: 'ai:assistant:use' },
  { method: 'POST', path: '/accounting/seasons/:seasonId/ai/budget-suggestion', permission: 'ai:assistant:use' },

  // ── Comptabilité : configuration ───────────────────────────────────────────
  // Le storefront lit les catégories pour afficher un libellé de note de frais.
  { method: 'GET', path: '/accounting/categories', permission: 'accounting:config:read', service: true },
  { method: 'POST', path: '/accounting/categories', permission: 'accounting:config:write' },
  { method: 'PUT', path: '/accounting/categories/:id', permission: 'accounting:config:write' },
  { method: 'DELETE', path: '/accounting/categories/:id', permission: 'accounting:config:write' },
  { method: 'GET', path: '/accounting/account-classes', permission: 'accounting:config:read' },
  { method: 'POST', path: '/accounting/account-classes', permission: 'accounting:config:write' },
  { method: 'PUT', path: '/accounting/account-classes/:code', permission: 'accounting:config:write' },
  { method: 'DELETE', path: '/accounting/account-classes/:code', permission: 'accounting:config:write' },

  // ── Comptabilité : factures ────────────────────────────────────────────────
  { method: 'GET', path: '/accounting/invoices', permission: 'accounting:invoices:read' },
  { method: 'POST', path: '/accounting/invoices', permission: 'accounting:invoices:write' },
  { method: 'GET', path: '/accounting/invoices/:id', permission: 'accounting:invoices:read' },
  { method: 'PUT', path: '/accounting/invoices/:id', permission: 'accounting:invoices:write' },
  { method: 'DELETE', path: '/accounting/invoices/:id', permission: 'accounting:invoices:delete' },
  { method: 'POST', path: '/accounting/invoices/:id/status', permission: 'accounting:invoices:write' },
  { method: 'GET', path: '/accounting/invoices/:id/invoice.pdf', permission: 'accounting:invoices:read' },

  // ── Comptabilité : relevés bancaires ───────────────────────────────────────
  // `bank-transactions` est l'alias historique de `bank-statement-lines`. Les deux
  // sont déclarés explicitement plutôt que fusionnés : le test de couverture
  // signalerait aussi bien un alias oublié qu'un alias retiré du code.
  { method: 'GET', path: '/accounting/bank-statement-lines', permission: 'accounting:bank:read' },
  { method: 'POST', path: '/accounting/bank-statement-lines/import', permission: 'accounting:bank:import' },
  { method: 'POST', path: '/accounting/bank-statement-lines/analyze', permission: 'accounting:bank:reconcile' },
  { method: 'POST', path: '/accounting/bank-statement-lines/reconcile-bulk', permission: 'accounting:bank:reconcile' },
  { method: 'POST', path: '/accounting/bank-statement-lines/:id/reconcile', permission: 'accounting:bank:reconcile' },
  { method: 'POST', path: '/accounting/bank-statement-lines/:id/ignore', permission: 'accounting:bank:reconcile' },
  { method: 'POST', path: '/accounting/bank-statement-lines/:id/unignore', permission: 'accounting:bank:reconcile' },
  { method: 'GET', path: '/accounting/bank-transactions', permission: 'accounting:bank:read' },
  { method: 'POST', path: '/accounting/bank-transactions/import', permission: 'accounting:bank:import' },
  { method: 'POST', path: '/accounting/bank-transactions/analyze', permission: 'accounting:bank:reconcile' },
  { method: 'POST', path: '/accounting/bank-transactions/reconcile-bulk', permission: 'accounting:bank:reconcile' },
  { method: 'POST', path: '/accounting/bank-transactions/:id/reconcile', permission: 'accounting:bank:reconcile' },
  { method: 'POST', path: '/accounting/bank-transactions/:id/ignore', permission: 'accounting:bank:reconcile' },
  { method: 'POST', path: '/accounting/bank-transactions/:id/unignore', permission: 'accounting:bank:reconcile' },

  // ── Comptabilité : grand livre ─────────────────────────────────────────────
  // `transactions` et `ledger` sont les alias historiques de `ledger-entries`.
  { method: 'GET', path: '/accounting/ledger-entries', permission: 'accounting:ledger:read' },
  { method: 'POST', path: '/accounting/ledger-entries', permission: 'accounting:ledger:write' },
  { method: 'PUT', path: '/accounting/ledger-entries/:id', permission: 'accounting:ledger:write' },
  { method: 'DELETE', path: '/accounting/ledger-entries/:id', permission: 'accounting:ledger:delete' },
  { method: 'GET', path: '/accounting/transactions', permission: 'accounting:ledger:read' },
  { method: 'POST', path: '/accounting/transactions', permission: 'accounting:ledger:write' },
  { method: 'PUT', path: '/accounting/transactions/:id', permission: 'accounting:ledger:write' },
  { method: 'DELETE', path: '/accounting/transactions/:id', permission: 'accounting:ledger:delete' },
  { method: 'DELETE', path: '/accounting/ledger/:id', permission: 'accounting:ledger:delete' },

  // ── Comptabilité : chèques et remises ──────────────────────────────────────
  { method: 'GET', path: '/accounting/checks', permission: 'accounting:checks:read' },
  { method: 'POST', path: '/accounting/checks', permission: 'accounting:checks:write' },
  { method: 'POST', path: '/accounting/checks/analyze', permission: 'accounting:checks:write' },
  { method: 'DELETE', path: '/accounting/checks/:id', permission: 'accounting:checks:delete' },
  { method: 'GET', path: '/accounting/check-deposits', permission: 'accounting:checks:read' },
  { method: 'POST', path: '/accounting/check-deposits', permission: 'accounting:checks:write' },
  { method: 'POST', path: '/accounting/check-deposits/:id/clear', permission: 'accounting:checks:write' },
  { method: 'POST', path: '/accounting/check-deposits/:id/delete', permission: 'accounting:checks:delete' },

  // ── Notes de frais ─────────────────────────────────────────────────────────
  // L'adhérent consulte et dépose ses propres notes depuis le storefront ; la
  // validation reste réservée à l'administration.
  { method: 'GET', path: '/expenses', permission: 'expenses:reports:read', service: true },
  { method: 'POST', path: '/expenses', permission: 'expenses:reports:write', service: true },
  { method: 'PUT', path: '/expenses/:id', permission: 'expenses:reports:write' },
  { method: 'POST', path: '/expenses/:id/approve', permission: 'expenses:reports:approve' },
  { method: 'POST', path: '/expenses/:id/reject', permission: 'expenses:reports:approve' },
  { method: 'POST', path: '/expenses/:id/cancel', permission: 'expenses:reports:approve' },

  // ── Boutique ───────────────────────────────────────────────────────────────
  { method: 'GET', path: '/shop/products', permission: 'shop:products:read', service: true },
  { method: 'POST', path: '/shop/products', permission: 'shop:products:write' },
  { method: 'PUT', path: '/shop/products/:id', permission: 'shop:products:write' },
  { method: 'GET', path: '/shop/product-categories', permission: 'shop:products:read', service: true },
  { method: 'POST', path: '/shop/product-categories', permission: 'shop:categories:write' },
  { method: 'PUT', path: '/shop/product-categories/:id', permission: 'shop:categories:write' },
  { method: 'DELETE', path: '/shop/product-categories/:id', permission: 'shop:categories:write' },
  { method: 'GET', path: '/shop/orders', permission: 'shop:orders:read', service: true },
  { method: 'POST', path: '/shop/orders', permission: 'shop:orders:write', service: true },
  { method: 'POST', path: '/shop/orders/:id/approve', permission: 'shop:orders:approve' },
  { method: 'POST', path: '/shop/orders/:id/reject', permission: 'shop:orders:approve' },

  // ── Notifications ──────────────────────────────────────────────────────────
  // Abonnement et préférences : gestes personnels d'un utilisateur sur son propre
  // appareil, sans rapport avec un droit métier.
  { method: 'POST', path: '/notifications/subscriptions', permission: null, service: true },
  { method: 'DELETE', path: '/notifications/subscriptions', permission: null, service: true },
  { method: 'GET', path: '/notifications/preferences', permission: null, service: true },
  { method: 'PUT', path: '/notifications/preferences', permission: null, service: true },
  { method: 'GET', path: '/notifications/overview', permission: 'notifications:messages:read' },
  { method: 'GET', path: '/notifications/audiences', permission: 'notifications:messages:read' },
  { method: 'GET', path: '/notifications/subscribers', permission: 'notifications:messages:read' },
  // Une notification part vers tous les téléphones du club : le droit d'émission
  // n'est jamais accordé implicitement.
  { method: 'POST', path: '/notifications/messages', permission: 'notifications:messages:send' },
  { method: 'POST', path: '/notifications/dispatch', permission: 'notifications:messages:send' },

  // Annonces du club. La lecture est ouverte au storefront (`service`), qui n'a ni
  // identité ni permission : la route s'y limite d'elle-même aux annonces publiées.
  { method: 'GET', path: '/announcements', permission: 'announcements:posts:read', service: true },
  { method: 'POST', path: '/announcements', permission: 'announcements:posts:write' },
  { method: 'PUT', path: '/announcements/:id', permission: 'announcements:posts:write' },
  { method: 'DELETE', path: '/announcements/:id', permission: 'announcements:posts:delete' },
  // Diffuser une annonce, c'est faire sonner tous les téléphones du club : l'acte relève
  // du même droit que l'envoi d'une notification, et non de la rédaction.
  { method: 'POST', path: '/announcements/:id/notify', permission: 'notifications:messages:send' },

  // Site public. Les lectures sont ouvertes au Worker du site (`service`), qui n'a ni
  // identité ni permission : chaque route s'y limite d'elle-même au contenu publié,
  // en regardant `x-caller`. La garde vit dans la route et non chez l'appelant, pour
  // qu'un paramètre oublié ne divulgue pas un brouillon.
  { method: 'GET', path: '/cms/route', permission: 'cms:pages:read', service: true },
  { method: 'GET', path: '/cms/content-version', permission: 'cms:pages:read', service: true },
  { method: 'GET', path: '/cms/pages', permission: 'cms:pages:read', service: true },
  { method: 'GET', path: '/cms/pages/:id', permission: 'cms:pages:read' },
  { method: 'POST', path: '/cms/pages', permission: 'cms:pages:write' },
  { method: 'PUT', path: '/cms/pages/:id', permission: 'cms:pages:write' },
  { method: 'PUT', path: '/cms/pages/:id/blocks', permission: 'cms:pages:write' },
  // Publier expose la page à tout le monde, Google compris — mais reste un acte de
  // rédaction, pas un droit à part.
  { method: 'POST', path: '/cms/pages/:id/publish', permission: 'cms:pages:write' },
  { method: 'DELETE', path: '/cms/pages/:id', permission: 'cms:pages:delete' },
  // Médiathèque. La lecture est ouverte au site public (`service`) : c'est elle qui
  // fournit dimensions et variantes, sans lesquelles les images décaleraient la page.
  { method: 'GET', path: '/cms/media', permission: 'cms:media:read', service: true },
  { method: 'GET', path: '/cms/media/:id', permission: 'cms:media:read', service: true },
  { method: 'POST', path: '/cms/media', permission: 'cms:media:write' },
  { method: 'DELETE', path: '/cms/media/:id', permission: 'cms:media:delete' },
  // Historique des pages. Restaurer réécrit le contenu : c'est un acte de rédaction,
  // pas un droit distinct.
  { method: 'GET', path: '/cms/pages/:id/revisions', permission: 'cms:pages:read' },
  { method: 'POST', path: '/cms/pages/:id/revisions/:revisionId/restore', permission: 'cms:pages:write' },
  // Actualités. Les lectures sont ouvertes au site public (`service`) : archives,
  // flux RSS et page d'accueil en dépendent.
  { method: 'GET', path: '/cms/posts', permission: 'cms:posts:read', service: true },
  { method: 'GET', path: '/cms/posts/:id', permission: 'cms:posts:read' },
  { method: 'POST', path: '/cms/posts', permission: 'cms:posts:write' },
  { method: 'PUT', path: '/cms/posts/:id', permission: 'cms:posts:write' },
  { method: 'POST', path: '/cms/posts/:id/publish', permission: 'cms:posts:write' },
  { method: 'DELETE', path: '/cms/posts/:id', permission: 'cms:posts:delete' },
  { method: 'GET', path: '/cms/post-categories', permission: 'cms:posts:read', service: true },
  { method: 'POST', path: '/cms/post-categories', permission: 'cms:posts:write' }
];
