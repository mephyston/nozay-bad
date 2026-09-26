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

  // ── Tableau de bord ────────────────────────────────────────────────────────
  { method: 'GET', path: '/dashboard/overview', permission: 'dashboard:overview:read' },
  // La recherche de l'espace adhérent : elle ne rend que ce que l'espace affiche déjà,
  // et chaque rubrique s'éteint avec sa fonctionnalité — l'annuaire compris.
  { method: 'GET', path: '/search', permission: null, service: true },

  // Consommation Cloudflare. Aucune donnée du club, mais un jeton qui voit tout le
  // compte : jamais ouvert aux appelants de service.
  { method: 'GET', path: '/platform/usage', permission: 'settings:platform:read' },

  // ── Identité du club et fonctionnalités ────────────────────────────────────
  // La lecture est ouverte à tout compte et aux appelants de service : titre des
  // pages, pied de page, expéditeur des mails — tout le monde en a besoin, et rien
  // n'y est secret (l'IBAN figure sur chaque facture).
  { method: 'GET', path: '/club/settings', permission: null, service: true },
  { method: 'PUT', path: '/club/settings/:section', permission: 'settings:club:write' },
  { method: 'PUT', path: '/club/features', permission: 'settings:club:write' },
  { method: 'POST', path: '/club/assets/:asset', permission: 'settings:club:write' },
  { method: 'DELETE', path: '/club/assets/:asset', permission: 'settings:club:write' },
  { method: 'PUT', path: '/club/assets/partners', permission: 'settings:club:write' },

  // ── Adhérents ──────────────────────────────────────────────────────────────
  { method: 'GET', path: '/members', permission: 'members:members:read' },
  { method: 'POST', path: '/members/import', permission: 'members:members:import' },
  { method: 'GET', path: '/members/export', permission: 'members:members:export' },
  // Recherche du foyer à la connexion OTP : appelée avant toute session.
  { method: 'POST', path: '/members/lookup-household', permission: 'members:members:read', service: true },
  // Anniversaires du jour, affichés sur l'accueil de l'espace adhérent : même contenu
  // que l'annonce poussée à tout le club chaque matin.
  { method: 'GET', path: '/members/birthdays', permission: 'members:members:read', service: true, feature: 'birthdays' },
  { method: 'PATCH', path: '/members/:id/expense-authorization', permission: 'members:members:write' },
  // Fonctions au club (bureau, CA, entraîneurs) : lecture avec la fiche, écriture avec elle.
  { method: 'GET', path: '/members/club-functions', permission: 'members:members:read' },
  { method: 'GET', path: '/members/club-functions/status', permission: 'members:members:read' },
  { method: 'PUT', path: '/members/:licence/club-functions', permission: 'members:members:write' },
  { method: 'GET', path: '/members/attestation/config', permission: 'members:attestations:read', feature: 'attestations' },
  { method: 'PUT', path: '/members/attestation/config', permission: 'members:attestations:write', feature: 'attestations' },
  { method: 'POST', path: '/members/attestation/signature', permission: 'members:attestations:write', feature: 'attestations' },
  { method: 'GET', path: '/members/:id/cse-data', permission: 'members:attestations:read', feature: 'attestations' },
  // L'adhérent télécharge sa propre attestation ; le storefront impose l'identifiant
  // de la session, il n'est jamais repris de l'URL.
  { method: 'GET', path: '/members/:id/cse-attestation.pdf', permission: 'members:attestations:read', service: true, feature: 'attestations' },
  // Portrait de l'adhérent. `service: true` des trois côtés : l'espace adhérent gère la
  // sienne et lit celle des autres, l'administration gère celle de n'importe qui. C'est
  // la couche appelante qui impose l'identité — le storefront force la licence de la
  // session et ne reprend jamais celle de l'URL, comme pour l'attestation CSE.
  { method: 'GET', path: '/members/:licence/photo', permission: 'members:members:read', service: true },
  { method: 'POST', path: '/members/:licence/photo', permission: 'members:members:write', service: true },
  { method: 'DELETE', path: '/members/:licence/photo', permission: 'members:members:write', service: true },
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

  // ── Comptabilité : configuration ───────────────────────────────────────────
  // Le storefront lit les catégories pour afficher un libellé de note de frais.
  { method: 'GET', path: '/accounting/categories', permission: 'accounting:config:read', service: true },
  { method: 'POST', path: '/accounting/categories', permission: 'accounting:config:write' },
  { method: 'PUT', path: '/accounting/categories/:id', permission: 'accounting:config:write' },
  { method: 'DELETE', path: '/accounting/categories/:id', permission: 'accounting:config:write' },
  // Les comptes de trésorerie, pour les sélecteurs et l'écran des soldes initiaux.
  { method: 'GET', path: '/accounting/accounts', permission: 'accounting:config:read' },
  // Comptes de trésorerie et moyens de paiement : la configuration, gardée comme les
  // catégories. La boutique lit les moyens offerts aux adhérents (route de service, filtrée
  // sur `storefront` par l'appelant).
  { method: 'POST', path: '/accounting/accounts', permission: 'accounting:config:write' },
  { method: 'PUT', path: '/accounting/accounts/:id', permission: 'accounting:config:write' },
  // Lecture ouverte à tout compte : un entraîneur qui saisit une commande doit choisir
  // un moyen de paiement sans porter le droit de configurer la comptabilité.
  { method: 'GET', path: '/accounting/payment-methods', permission: null, service: true },
  { method: 'POST', path: '/accounting/payment-methods', permission: 'accounting:config:write' },
  { method: 'PUT', path: '/accounting/payment-methods/:id', permission: 'accounting:config:write' },
  { method: 'DELETE', path: '/accounting/payment-methods/:id', permission: 'accounting:config:write' },
  { method: 'GET', path: '/accounting/account-classes', permission: 'accounting:config:read' },
  { method: 'POST', path: '/accounting/account-classes', permission: 'accounting:config:write' },
  { method: 'PUT', path: '/accounting/account-classes/:code', permission: 'accounting:config:write' },
  { method: 'DELETE', path: '/accounting/account-classes/:code', permission: 'accounting:config:write' },

  // ── Comptabilité : factures ────────────────────────────────────────────────
  { method: 'GET', path: '/accounting/invoices', permission: 'accounting:invoices:read', feature: 'invoices' },
  { method: 'POST', path: '/accounting/invoices', permission: 'accounting:invoices:write', feature: 'invoices' },
  { method: 'GET', path: '/accounting/invoices/:id', permission: 'accounting:invoices:read', feature: 'invoices' },
  { method: 'PUT', path: '/accounting/invoices/:id', permission: 'accounting:invoices:write', feature: 'invoices' },
  { method: 'DELETE', path: '/accounting/invoices/:id', permission: 'accounting:invoices:delete', feature: 'invoices' },
  { method: 'POST', path: '/accounting/invoices/:id/status', permission: 'accounting:invoices:write', feature: 'invoices' },
  { method: 'GET', path: '/accounting/invoices/:id/invoice.pdf', permission: 'accounting:invoices:read', feature: 'invoices' },

  // ── Comptabilité : relevés bancaires ───────────────────────────────────────
  // `bank-transactions` est l'alias historique de `bank-statement-lines`. Les deux
  // sont déclarés explicitement plutôt que fusionnés : le test de couverture
  // signalerait aussi bien un alias oublié qu'un alias retiré du code.
  { method: 'GET', path: '/accounting/bank-statement-lines', permission: 'accounting:bank:read', feature: 'accounting' },
  { method: 'GET', path: '/accounting/accounts/:accountCode/reconciliation-statement', permission: 'accounting:bank:read' },
  { method: 'GET', path: '/accounting/reconciliation-statements', permission: 'accounting:bank:read', feature: 'accounting' },
  { method: 'POST', path: '/accounting/bank-statement-lines/import', permission: 'accounting:bank:import', feature: 'accounting' },
  { method: 'POST', path: '/accounting/bank-statement-lines/analyze', permission: 'accounting:bank:reconcile', feature: 'accounting' },
  { method: 'POST', path: '/accounting/bank-statement-lines/reconcile-bulk', permission: 'accounting:bank:reconcile', feature: 'accounting' },
  { method: 'POST', path: '/accounting/bank-statement-lines/:id/reconcile', permission: 'accounting:bank:reconcile', feature: 'accounting' },
  { method: 'GET', path: '/accounting/bank-transactions', permission: 'accounting:bank:read', feature: 'accounting' },
  { method: 'POST', path: '/accounting/bank-transactions/import', permission: 'accounting:bank:import', feature: 'accounting' },
  { method: 'POST', path: '/accounting/bank-transactions/analyze', permission: 'accounting:bank:reconcile', feature: 'accounting' },
  { method: 'POST', path: '/accounting/bank-transactions/reconcile-bulk', permission: 'accounting:bank:reconcile', feature: 'accounting' },
  { method: 'POST', path: '/accounting/bank-transactions/:id/reconcile', permission: 'accounting:bank:reconcile', feature: 'accounting' },

  // ── Comptabilité : virements internes ──────────────────────────────────────
  // Un virement écrit deux lignes du grand livre : c'est le même droit.
  { method: 'POST', path: '/accounting/internal-transfers', permission: 'accounting:ledger:write', feature: 'accounting' },
  { method: 'PUT', path: '/accounting/internal-transfers/:id', permission: 'accounting:ledger:write', feature: 'accounting' },

  // ── Comptabilité : grand livre ─────────────────────────────────────────────
  // `transactions` et `ledger` sont les alias historiques de `ledger-entries`.
  { method: 'GET', path: '/accounting/ledger-entries', permission: 'accounting:ledger:read', feature: 'accounting' },
  { method: 'POST', path: '/accounting/ledger-entries', permission: 'accounting:ledger:write', feature: 'accounting' },
  { method: 'PUT', path: '/accounting/ledger-entries/:id', permission: 'accounting:ledger:write', feature: 'accounting' },
  { method: 'DELETE', path: '/accounting/ledger-entries/:id', permission: 'accounting:ledger:delete', feature: 'accounting' },
  { method: 'GET', path: '/accounting/transactions', permission: 'accounting:ledger:read' },
  { method: 'POST', path: '/accounting/transactions', permission: 'accounting:ledger:write' },
  { method: 'PUT', path: '/accounting/transactions/:id', permission: 'accounting:ledger:write' },
  { method: 'DELETE', path: '/accounting/transactions/:id', permission: 'accounting:ledger:delete' },
  { method: 'DELETE', path: '/accounting/ledger/:id', permission: 'accounting:ledger:delete', feature: 'accounting' },

  // ── Comptabilité : chèques et remises ──────────────────────────────────────
  { method: 'GET', path: '/accounting/checks', permission: 'accounting:checks:read', feature: 'checks' },
  { method: 'POST', path: '/accounting/checks', permission: 'accounting:checks:write', feature: 'checks' },
  { method: 'POST', path: '/accounting/checks/analyze', permission: 'accounting:checks:write', feature: 'checks' },
  { method: 'PUT', path: '/accounting/checks/:id', permission: 'accounting:checks:write', feature: 'checks' },
  { method: 'DELETE', path: '/accounting/checks/:id', permission: 'accounting:checks:delete', feature: 'checks' },
  { method: 'GET', path: '/accounting/check-deposits', permission: 'accounting:checks:read', feature: 'checks' },
  { method: 'POST', path: '/accounting/check-deposits', permission: 'accounting:checks:write', feature: 'checks' },
  { method: 'POST', path: '/accounting/check-deposits/:id/deposit', permission: 'accounting:checks:write', feature: 'checks' },
  { method: 'POST', path: '/accounting/check-deposits/:id/clear', permission: 'accounting:checks:write', feature: 'checks' },
  { method: 'POST', path: '/accounting/check-deposits/:id/delete', permission: 'accounting:checks:delete', feature: 'checks' },
  { method: 'GET', path: '/accounting/check-deposits/:id/deposit-slip.pdf', permission: 'accounting:checks:read', feature: 'checks' },

  // ── Notes de frais ─────────────────────────────────────────────────────────
  // L'adhérent consulte et dépose ses propres notes depuis le storefront ; la
  // validation reste réservée à l'administration.
  { method: 'GET', path: '/expenses', permission: 'expenses:reports:read', service: true, feature: 'expenses' },
  { method: 'POST', path: '/expenses', permission: 'expenses:reports:write', service: true, feature: 'expenses' },
  { method: 'PUT', path: '/expenses/:id', permission: 'expenses:reports:write', feature: 'expenses' },
  { method: 'POST', path: '/expenses/:id/approve', permission: 'expenses:reports:approve', feature: 'expenses' },
  { method: 'POST', path: '/expenses/:id/reject', permission: 'expenses:reports:approve', feature: 'expenses' },
  { method: 'POST', path: '/expenses/:id/cancel', permission: 'expenses:reports:approve', feature: 'expenses' },

  // ── Boutique ───────────────────────────────────────────────────────────────
  { method: 'GET', path: '/shop/products', permission: 'shop:products:read', service: true, feature: 'shop' },
  { method: 'POST', path: '/shop/products', permission: 'shop:products:write', feature: 'shop' },
  { method: 'PUT', path: '/shop/products/:id', permission: 'shop:products:write', feature: 'shop' },
  // Supprimer un produit jamais commandé, et l'illustrer : même geste de gestion du catalogue.
  { method: 'DELETE', path: '/shop/products/:id', permission: 'shop:products:write', feature: 'shop' },
  { method: 'POST', path: '/shop/products/:id/image', permission: 'shop:products:write', feature: 'shop' },
  { method: 'DELETE', path: '/shop/products/:id/image', permission: 'shop:products:write', feature: 'shop' },
  { method: 'GET', path: '/shop/product-categories', permission: 'shop:products:read', service: true, feature: 'shop' },
  { method: 'POST', path: '/shop/product-categories', permission: 'shop:categories:write', feature: 'shop' },
  { method: 'PUT', path: '/shop/product-categories/:id', permission: 'shop:categories:write', feature: 'shop' },
  { method: 'DELETE', path: '/shop/product-categories/:id', permission: 'shop:categories:write', feature: 'shop' },
  { method: 'GET', path: '/shop/orders', permission: 'shop:orders:read', service: true, feature: 'shop' },
  { method: 'POST', path: '/shop/orders', permission: 'shop:orders:write', service: true, feature: 'shop' },
  // Les quatre transitions du workflow relèvent de la même décision de gestion.
  // Corriger une commande avant règlement : jamais depuis l'espace adhérent (pas de `service`).
  { method: 'PUT', path: '/shop/orders/:id', permission: 'shop:orders:write', feature: 'shop' },
  { method: 'POST', path: '/shop/orders/:id/validate', permission: 'shop:orders:approve', feature: 'shop' },
  { method: 'POST', path: '/shop/orders/:id/pay', permission: 'shop:orders:approve', feature: 'shop' },
  { method: 'POST', path: '/shop/orders/:id/reject', permission: 'shop:orders:approve', feature: 'shop' },
  { method: 'POST', path: '/shop/orders/:id/cancel', permission: 'shop:orders:approve', feature: 'shop' },
  // Défaire un encaissement, c'est retirer une recette : le même droit que l'écrire.
  { method: 'POST', path: '/shop/orders/:id/unpay', permission: 'shop:orders:approve', feature: 'shop' },

  // ── Notifications ──────────────────────────────────────────────────────────
  // Abonnement et préférences : gestes personnels d'un utilisateur sur son propre
  // appareil, sans rapport avec un droit métier.
  { method: 'POST', path: '/notifications/subscriptions', permission: null, service: true, feature: 'push' },
  { method: 'DELETE', path: '/notifications/subscriptions', permission: null, service: true, feature: 'push' },
  { method: 'GET', path: '/notifications/preferences', permission: null, service: true, feature: 'push' },
  { method: 'PUT', path: '/notifications/preferences', permission: null, service: true, feature: 'push' },
  { method: 'GET', path: '/notifications/overview', permission: 'notifications:messages:read', feature: 'push' },
  { method: 'GET', path: '/notifications/audiences', permission: 'notifications:messages:read', feature: 'push' },
  { method: 'GET', path: '/notifications/subscribers', permission: 'notifications:messages:read', feature: 'push' },
  // Registre des notifications automatiques : consultation seule, même droit que l'aperçu.
  { method: 'GET', path: '/notifications/scheduled', permission: 'notifications:messages:read', feature: 'push' },
  // Une notification part vers tous les téléphones du club : le droit d'émission
  // n'est jamais accordé implicitement.
  { method: 'POST', path: '/notifications/messages', permission: 'notifications:messages:send', feature: 'push' },
  { method: 'POST', path: '/notifications/dispatch', permission: 'notifications:messages:send', feature: 'push' },

  // Site public. Les lectures sont ouvertes au Worker du site (`service`), qui n'a ni
  // identité ni permission : chaque route s'y limite d'elle-même au contenu publié,
  // en regardant `x-caller`. La garde vit dans la route et non chez l'appelant, pour
  // qu'un paramètre oublié ne divulgue pas un brouillon.
  { method: 'GET', path: '/cms/route', permission: 'cms:pages:read', service: true, feature: 'website' },
  { method: 'GET', path: '/cms/content-version', permission: 'cms:pages:read', service: true },
  { method: 'GET', path: '/cms/pages', permission: 'cms:pages:read', service: true, feature: 'website' },
  // Index « rendez-vous → article qui l'annonce », sans le corps des articles.
  { method: 'GET', path: '/cms/posts/announcements', permission: 'cms:posts:read', service: true },
  { method: 'GET', path: '/cms/pages/:id', permission: 'cms:pages:read', feature: 'website' },
  { method: 'POST', path: '/cms/pages', permission: 'cms:pages:write', feature: 'website' },
  { method: 'PUT', path: '/cms/pages/:id', permission: 'cms:pages:write', feature: 'website' },
  { method: 'PUT', path: '/cms/pages/:id/blocks', permission: 'cms:pages:write', feature: 'website' },
  // Publier expose la page à tout le monde, Google compris — mais reste un acte de
  // rédaction, pas un droit à part.
  { method: 'POST', path: '/cms/pages/:id/publish', permission: 'cms:pages:write', feature: 'website' },
  { method: 'DELETE', path: '/cms/pages/:id', permission: 'cms:pages:delete', feature: 'website' },
  // Médiathèque. La lecture est ouverte au site public (`service`) : c'est elle qui
  // fournit dimensions et variantes, sans lesquelles les images décaleraient la page.
  { method: 'GET', path: '/cms/media', permission: 'cms:media:read', service: true },
  { method: 'GET', path: '/cms/media/:id', permission: 'cms:media:read', service: true },
  { method: 'POST', path: '/cms/media', permission: 'cms:media:write' },
  // Reprendre le texte alternatif relève du dépôt : c'est le libellé du média, pas un
  // droit distinct. Rien d'autre n'est modifiable — le fichier, lui, est immuable.
  { method: 'PUT', path: '/cms/media/:id', permission: 'cms:media:write' },
  { method: 'DELETE', path: '/cms/media/:id', permission: 'cms:media:delete' },
  // Historique des pages. Restaurer réécrit le contenu : c'est un acte de rédaction,
  // pas un droit distinct.
  { method: 'GET', path: '/cms/pages/:id/revisions', permission: 'cms:pages:read', feature: 'website' },
  { method: 'POST', path: '/cms/pages/:id/revisions/:revisionId/restore', permission: 'cms:pages:write', feature: 'website' },
  // Actualités. Les lectures sont ouvertes au site public (`service`) : archives,
  // flux RSS et page d'accueil en dépendent.
  { method: 'GET', path: '/cms/posts', permission: 'cms:posts:read', service: true },
  { method: 'GET', path: '/cms/posts/:id', permission: 'cms:posts:read' },
  { method: 'POST', path: '/cms/posts', permission: 'cms:posts:write' },
  { method: 'PUT', path: '/cms/posts/:id', permission: 'cms:posts:write' },
  { method: 'POST', path: '/cms/posts/:id/publish', permission: 'cms:posts:write' },
  { method: 'DELETE', path: '/cms/posts/:id', permission: 'cms:posts:delete' },
  // Diffuser une actualité, c'est faire sonner tous les téléphones du club : l'acte
  // relève du même droit que l'envoi d'une notification, et non de la rédaction.
  { method: 'POST', path: '/cms/posts/:id/notify', permission: 'notifications:messages:send', feature: 'push' },
  { method: 'GET', path: '/cms/post-categories', permission: 'cms:posts:read', service: true },
  // Les menus font partie de la structure du site : qui peut composer les pages peut
  // les ranger. Pas de permission dédiée pour une poignée d'entrées.
  { method: 'GET', path: '/cms/redirects', permission: 'cms:pages:read', feature: 'website' },
  // L'administration des redirections relève de `cms:nav:*` : le catalogue libelle ces
  // droits « les menus et les redirections » depuis le début, ils prennent corps ici.
  // (L'entrée GET ci-dessus reste sous `cms:pages:read` : elle alimente l'encart
  // « Anciennes adresses » de l'éditeur, visible des simples lecteurs de pages.)
  // Pas de `cms:nav:delete` au catalogue : la suppression relève du droit d'écriture,
  // comme pour les entrées de menu.
  { method: 'GET', path: '/cms/redirects/all', permission: 'cms:nav:read', feature: 'website' },
  { method: 'POST', path: '/cms/redirects', permission: 'cms:nav:write', feature: 'website' },
  { method: 'PUT', path: '/cms/redirects/:id', permission: 'cms:nav:write', feature: 'website' },
  { method: 'DELETE', path: '/cms/redirects/:id', permission: 'cms:nav:write', feature: 'website' },
  { method: 'GET', path: '/cms/nav', permission: 'cms:pages:read', service: true, feature: 'website' },
  { method: 'POST', path: '/cms/nav', permission: 'cms:pages:write', feature: 'website' },
  { method: 'PUT', path: '/cms/nav/reorder', permission: 'cms:pages:write', feature: 'website' },
  { method: 'PUT', path: '/cms/nav/:id', permission: 'cms:pages:write', feature: 'website' },
  { method: 'DELETE', path: '/cms/nav/:id', permission: 'cms:pages:write', feature: 'website' },
  // Réglages du pied de page : phrase de présentation, adresse, comptes sociaux. Même
  // droit que les menus — c'est la même chose, du châssis de site plutôt que du
  // contenu — et lecture ouverte au site, qui les affiche sur toutes ses pages.
  { method: 'GET', path: '/cms/settings', permission: 'cms:pages:read', service: true, feature: 'website' },
  { method: 'PUT', path: '/cms/settings', permission: 'cms:pages:write', feature: 'website' },
  { method: 'POST', path: '/cms/post-categories', permission: 'cms:posts:write' },

  // Créneaux. Le site public les affiche, d'où `service` en lecture : c'est ce qui
  // remplace l'iframe Google Sheets, invisible des moteurs.
  { method: 'GET', path: '/schedules', permission: 'schedules:slots:read', service: true, feature: 'schedules' },
  { method: 'GET', path: '/schedules/venues', permission: 'schedules:slots:read', service: true },
  { method: 'POST', path: '/schedules/venues', permission: 'schedules:slots:write' },
  { method: 'POST', path: '/schedules', permission: 'schedules:slots:write', feature: 'schedules' },
  { method: 'PUT', path: '/schedules/:id', permission: 'schedules:slots:write', feature: 'schedules' },
  { method: 'DELETE', path: '/schedules/:id', permission: 'schedules:slots:write', feature: 'schedules' },

  // Séances de jeu libre. La lecture est ouverte au service : c'est l'espace adhérent
  // qui appelle, au nom de la session qu'il détient, et il n'obtient que des compteurs.
  // S'inscrire et se désinscrire le sont pour la même raison — la page impose l'identité
  // depuis la session, le navigateur ne choisit que ses invités.
  //
  // Lire la liste nominative ne l'est pas : des noms d'adhérents, et surtout d'invités
  // non licenciés, ne sortent qu'auprès d'une identité d'administration. C'est toute la
  // différence entre compter et savoir qui.
  { method: 'GET', path: '/schedules/open-play', permission: 'schedules:open-play:read', service: true, feature: 'open_play' },
  { method: 'POST', path: '/schedules/open-play', permission: 'schedules:open-play:write', feature: 'open_play' },
  { method: 'POST', path: '/schedules/open-play/generate', permission: 'schedules:open-play:write', feature: 'open_play' },
  { method: 'PUT', path: '/schedules/open-play/:id', permission: 'schedules:open-play:write', feature: 'open_play' },
  { method: 'POST', path: '/schedules/open-play/:id/registrations', permission: 'schedules:open-play:read', service: true, feature: 'open_play' },
  { method: 'DELETE', path: '/schedules/open-play/:id/registrations', permission: 'schedules:open-play:read', service: true, feature: 'open_play' },
  { method: 'GET', path: '/schedules/open-play/:id/registrations', permission: 'schedules:registrations:read', feature: 'open_play' },
  // Qui vient jouer, tel que l'espace adhérent l'affiche : des prénoms et des noms, et
  // rien d'autre. Ouvert au service, contrairement à la liste d'appel ci-dessus, parce
  // que la projection elle-même écarte licence, adresse et identifiant d'adhésion — un
  // adhérent choisit de venir parce que ses partenaires viennent, pas pour l'annuaire.
  { method: 'GET', path: '/schedules/open-play/:id/attendees', permission: 'schedules:open-play:read', service: true, feature: 'open_play' },
  // Ce que montre le bloc « Jeu libre » du site public : les prochaines séances, les
  // inscrits en « Camille D. », l'ouvreur sous la même forme, les invités comptés. La
  // réduction des noms est faite par le handler — le site ne reçoit jamais de nom
  // complet, ni licence, ni consigne du bureau.
  { method: 'GET', path: '/schedules/open-play/public', permission: 'schedules:open-play:read', service: true, feature: 'open_play' },

  // Ouvreurs. Prendre et rendre une séance sont ouverts au service : c'est l'espace
  // adhérent qui appelle, avec la licence de la session — le navigateur ne peut pas
  // prétendre à une autre, et le refus « vous n'êtes pas ouvreur » est de toute façon
  // rendu par le handler. La liste des détenteurs de badge, elle, ne l'est pas : elle
  // n'a aucune raison de descendre dans un navigateur d'adhérent.
  { method: 'GET', path: '/schedules/open-play/openers', permission: 'schedules:open-play:read', feature: 'open_play' },
  { method: 'POST', path: '/schedules/open-play/openers', permission: 'schedules:open-play:write', feature: 'open_play' },
  { method: 'DELETE', path: '/schedules/open-play/openers/:id', permission: 'schedules:open-play:write', feature: 'open_play' },
  { method: 'POST', path: '/schedules/open-play/:id/opener', permission: 'schedules:open-play:read', service: true, feature: 'open_play' },
  { method: 'DELETE', path: '/schedules/open-play/:id/opener', permission: 'schedules:open-play:read', service: true, feature: 'open_play' },
  // Séances individuelles. La liste est ouverte au storefront, qui y lit la prochaine
  // soirée au nom du profil actif ; l'entraîneur tient les soirées depuis l'admin.
  { method: 'GET', path: '/schedules/indiv', permission: 'schedules:indiv:read', service: true, feature: 'indiv' },
  { method: 'POST', path: '/schedules/indiv', permission: 'schedules:indiv:write', feature: 'indiv' },
  { method: 'POST', path: '/schedules/indiv/generate', permission: 'schedules:indiv:write', feature: 'indiv' },
  { method: 'PUT', path: '/schedules/indiv/:id', permission: 'schedules:indiv:write', feature: 'indiv' },
  // Candidater et se retirer : le storefront force l'identité depuis la session.
  { method: 'POST', path: '/schedules/indiv/:id/requests', permission: 'schedules:indiv:read', service: true, feature: 'indiv' },
  { method: 'DELETE', path: '/schedules/indiv/:id/requests', permission: 'schedules:indiv:read', service: true, feature: 'indiv' },
  // La liste nominative des candidats est l'outil même du choix : lecture, sans `service`.
  { method: 'GET', path: '/schedules/indiv/:id/candidates', permission: 'schedules:indiv:read', feature: 'indiv' },
  { method: 'PUT', path: '/schedules/indiv/:id/selection', permission: 'schedules:indiv:write', feature: 'indiv' },
  // Composite d'apps/api : annonce + notifications aux retenus et non retenus.
  { method: 'POST', path: '/schedules/indiv/:id/announce', permission: 'schedules:indiv:write', feature: 'indiv' },

  // Agenda. Remplace l'iframe Google Calendar : chaque événement devient indexable.
  { method: 'GET', path: '/events', permission: 'events:events:read', service: true, feature: 'events' },
  { method: 'POST', path: '/events', permission: 'events:events:write', feature: 'events' },
  { method: 'PUT', path: '/events/:id', permission: 'events:events:write', feature: 'events' },
  { method: 'DELETE', path: '/events/:id', permission: 'events:events:delete', feature: 'events' },

  // Inscriptions. S'inscrire et se désinscrire sont ouverts au service — c'est
  // l'espace adhérent qui appelle, au nom de la session qu'il détient. Lire la liste
  // ne l'est pas : des noms d'adhérents ne sortent qu'auprès d'une identité
  // d'administration. C'est toute la différence entre compter et savoir qui.
  { method: 'POST', path: '/events/:id/registrations', permission: 'events:events:read', service: true, feature: 'events' },
  { method: 'DELETE', path: '/events/:id/registrations', permission: 'events:events:read', service: true, feature: 'events' },
  { method: 'GET', path: '/events/:id/registrations', permission: 'events:registrations:read', feature: 'events' },
  // « Voir qui vient » de l'espace adhérent : des noms et un nombre d'accompagnants, sans
  // adresse ni identifiant — la liste complète reste au bureau, ligne du dessus.
  { method: 'GET', path: '/events/:id/attendees', permission: 'events:events:read', service: true, feature: 'events' },

  // ── Interclubs ─────────────────────────────────────────────────────────────
  // Les classements et la date à laquelle ils sont arrêtés : jamais `service`. Le
  // barème complet du club est une donnée nominative, et l'espace adhérent n'en a
  // besoin que résolu — sous forme de valeurs d'équipe, avec la composition.
  { method: 'GET', path: '/teams/rankings', permission: 'teams:rankings:read', feature: 'teams' },
  { method: 'POST', path: '/teams/rankings/import', permission: 'teams:rankings:import', feature: 'teams' },
  { method: 'PUT', path: '/teams/rankings/:licence', permission: 'teams:rankings:write', feature: 'teams' },
  // Épingler la date de référence recalcule toutes les valeurs d'équipe de la saison :
  // c'est une écriture sur les classements, pas un réglage d'affichage.
  { method: 'GET', path: '/teams/championship-settings', permission: 'teams:rankings:read', feature: 'teams' },
  { method: 'PUT', path: '/teams/championship-settings', permission: 'teams:rankings:write', feature: 'teams' },

  // Calendrier des journées. Le lire est ouvert au service : l'espace adhérent affiche à
  // chaque équipe ses prochaines rencontres.
  { method: 'GET', path: '/teams/days', permission: 'teams:teams:read', service: true, feature: 'teams' },
  { method: 'PUT', path: '/teams/days', permission: 'teams:teams:write', feature: 'teams' },

  // Équipes. La lecture est ouverte au service — le menu « Équipes » de l'espace adhérent
  // montre à tout le club ses équipes et leur staff. L'écriture ne l'est pas : créer une
  // équipe ou désigner un capitaine relève du coach, depuis l'administration.
  { method: 'GET', path: '/teams/my-fixtures', permission: 'teams:teams:read', service: true, feature: 'teams' },
  { method: 'GET', path: '/teams', permission: 'teams:teams:read', service: true, feature: 'teams' },
  { method: 'POST', path: '/teams', permission: 'teams:teams:write', feature: 'teams' },
  // Fiche adhérent de l'espace adhérent : les équipes et les classements d'UNE licence.
  // `GET /teams/rankings`, qui rend le barème nominatif de tout le club, reste fermé.
  // L'annuaire du club — nom, portrait, trois classements — est ouvert à l'espace
  // adhérent : c'est ce qu'un adhérent lit déjà sur la fiche de chaque coéquipier.
  // `GET /teams/rankings` reste fermé pour autant : historique par date, mutations et
  // détail d'import n'ont rien d'un annuaire.
  { method: 'GET', path: '/teams/players', permission: 'teams:teams:read', service: true, feature: 'teams' },
  { method: 'GET', path: '/teams/players/:licence', permission: 'teams:teams:read', service: true, feature: 'teams' },
  { method: 'GET', path: '/teams/:id', permission: 'teams:teams:read', service: true, feature: 'teams' },
  { method: 'DELETE', path: '/teams/:id', permission: 'teams:teams:delete', feature: 'teams' },
  { method: 'PUT', path: '/teams/:id/staff', permission: 'teams:teams:write', feature: 'teams' },
  { method: 'PUT', path: '/teams/:id/roster', permission: 'teams:teams:write', feature: 'teams' },
  { method: 'PUT', path: '/teams/:id/fixtures', permission: 'teams:teams:write', feature: 'teams' },

  // Contrôle du coach : les valeurs de toutes les équipes d'un championnat sur une
  // journée, et les joueurs alignés deux fois dans la semaine. Jamais `service` — c'est
  // une vue d'ensemble du club, pas ce dont un capitaine a besoin.
  { method: 'GET', path: '/teams/day-values', permission: 'teams:lineups:read', feature: 'teams' },

  // Compositions. Ouvertes au service dans les deux sens : ce sont les capitaines qui
  // composent, depuis l'espace adhérent, sans compte d'administration. Le droit d'écrire
  // ne vient pas d'ici mais de la désignation dans l'équipe — le handler le vérifie sur
  // la licence que le storefront tire de la session, jamais du corps de la requête.
  { method: 'GET', path: '/teams/:id/days/:number/lineup', permission: 'teams:lineups:read', service: true, feature: 'teams' },
  { method: 'PUT', path: '/teams/:id/days/:number/lineup', permission: 'teams:lineups:write', service: true, feature: 'teams' },
  // La date réelle de la rencontre, propre à chaque équipe : c'est le capitaine qui la
  // connaît, pas le coach. Elle ne déplace jamais la journée, qui porte les règles.
  { method: 'PUT', path: '/teams/:id/days/:number/date', permission: 'teams:lineups:write', service: true, feature: 'teams' },
  // Prévenir le capitaine d'une anomalie : geste du coach, jamais du storefront.
  { method: 'POST', path: '/teams/:id/days/:number/notify-captain', permission: 'teams:lineups:write', feature: 'teams' }
];
