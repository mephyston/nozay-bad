import type { Permission } from '@nba/iam-ui';
import type { Feature } from '@nba/club-ui';

export interface NavItem {
  name: string;
  href: string;
  /** Icône Lucide, résolue par le composant qui rend le menu. */
  icon: string;
  /** `null` = visible par tout compte, quel que soit son rôle. */
  permission: Permission | null;
  /**
   * Fonctionnalité dont l'entrée dépend (voir `@nba/club-ui`, `FEATURES`).
   *
   * Éteinte par le club, l'entrée disparaît du menu et sa page répond introuvable —
   * même source que les droits : une entrée visible mène toujours à une page ouverte.
   */
  feature?: Feature;
}

export interface NavGroup {
  label: string;
  items: NavItem[];
  /**
   * Rubrique encore en rodage, signalée comme telle dans le menu.
   *
   * Le bureau n'est pas le seul à ouvrir cette administration : dire qu'une section
   * vient d'arriver évite qu'un comportement inattendu passe pour une panne, et invite
   * à la signaler plutôt qu'à la contourner.
   */
  beta?: boolean;
  /** Fonctionnalité dont dépend tout le groupe ; chaque entrée peut en préciser une autre. */
  feature?: Feature;
}

/**
 * Structure du menu d'administration, permission comprise.
 *
 * Le menu et le contrôle d'accès dérivent de la même source (voir
 * `page-permissions.ts`, qui s'en sert de base) : une entrée visible mène donc
 * toujours à une page ouverte. Auparavant les deux listes étaient indépendantes —
 * le menu dans le composant, la garde dans le frontmatter de chaque page — et
 * elles avaient divergé.
 *
 * `icon` est le nom du composant Lucide, pas le composant lui-même : ce module est
 * importé par le middleware (côté serveur), où l'on ne veut pas charger de Svelte.
 */
export const NAV_GROUPS: NavGroup[] = [
  {
    label: '',
    items: [
      { name: 'Tableau de bord', icon: 'LayoutDashboard', href: '/', permission: 'dashboard:overview:read' }
    ]
  },
  {
    label: 'Adhérents',
    items: [
      { name: 'Liste des adhérents', icon: 'Users', href: '/admin/members', permission: 'members:members:read' },
      { name: 'Dirigeants', icon: 'Landmark', href: '/admin/members/dirigeants', permission: 'members:members:read' }
    ]
  },
  {
    label: 'Comptabilité',
    items: [
      { name: 'Rapports financiers', icon: 'BarChart3', href: '/admin/accounting/reports', permission: 'accounting:reports:read', feature: 'accounting' },
      { name: 'Grand Livre', icon: 'BookOpen', href: '/admin/accounting', permission: 'accounting:ledger:read', feature: 'accounting' },
      { name: 'Factures', icon: 'FileCheck', href: '/admin/accounting/invoices', permission: 'accounting:invoices:read', feature: 'invoices' },
      { name: 'Rapprochement bancaire', icon: 'Scale', href: '/admin/accounting/reconciliation', permission: 'accounting:bank:read', feature: 'accounting' },
      { name: 'Remises de chèques', icon: 'Landmark', href: '/admin/accounting/cheques', permission: 'accounting:checks:read', feature: 'checks' },
      { name: 'Caisse', icon: 'Wallet', href: '/admin/accounting/accounts/cash', permission: 'accounting:ledger:read', feature: 'cash' },
      { name: 'Badnet', icon: 'CreditCard', href: '/admin/accounting/accounts/badnet', permission: 'accounting:ledger:read', feature: 'badnet' },
      { name: 'Notes de frais', icon: 'Coins', href: '/admin/expenses', permission: 'expenses:reports:read', feature: 'expenses' }
    ]
  },
  {
    label: 'Boutique',
    feature: 'shop',
    items: [
      { name: 'Produits', icon: 'Package', href: '/admin/shop/products', permission: 'shop:products:read' },
      { name: 'Commandes', icon: 'ShoppingCart', href: '/admin/shop/orders', permission: 'shop:orders:read' }
    ]
  },
  {
    label: 'Communication',
    items: [
      // En tête de la communication, et non sous « Site public » : depuis l'absorption
      // des annonces, une actualité s'adresse aussi bien aux adhérents qu'aux visiteurs.
      { name: 'Actualités', icon: 'Newspaper', href: '/admin/website/posts', permission: 'cms:posts:read' },
      { name: 'Notifications', icon: 'Bell', href: '/admin/notifications', permission: 'notifications:messages:read', feature: 'push' },
      { name: 'Créneaux', icon: 'CalendarClock', href: '/admin/website/schedules', permission: 'schedules:slots:read', feature: 'schedules' },
      { name: 'Agenda', icon: 'CalendarDays', href: '/admin/website/events', permission: 'events:events:read', feature: 'events' }
    ]
  },
  {
    // Rubrique à part, et non sous « Communication » : tenir les séances et lire qui
    // vient n'est pas communiquer. La grille hebdomadaire, elle, reste là-bas — c'est
    // bien ce que le site affiche.
    label: 'Jeu libre',
    feature: 'open_play',
    beta: true,
    items: [
      { name: 'Séances', icon: 'DoorOpen', href: '/admin/website/jeu-libre', permission: 'schedules:open-play:read' },
      { name: 'Ouvreurs', icon: 'KeyRound', href: '/admin/website/jeu-libre/ouvreurs', permission: 'schedules:open-play:read' }
    ]
  },
  {
    // L'entraîneur tient ses séances individuelles ici : ce n'est ni du jeu libre ni de
    // la communication, c'est son entraînement.
    label: 'Entraînement',
    feature: 'indiv',
    beta: true,
    items: [
      { name: 'Indiv', icon: 'Dumbbell', href: '/admin/entrainement/indiv', permission: 'schedules:indiv:read' }
    ]
  },
  {
    label: 'Interclubs',
    feature: 'teams',
    beta: true,
    items: [
      { name: 'Équipes', icon: 'Trophy', href: '/admin/teams', permission: 'teams:teams:read' },
      { name: 'Contrôle des journées', icon: 'ShieldCheck', href: '/admin/teams/journees', permission: 'teams:lineups:read' },
      { name: 'Classements', icon: 'ChartNoAxesColumn', href: '/admin/teams/classements', permission: 'teams:rankings:read' },
      { name: 'Règlements', icon: 'FileText', href: '/admin/teams/reglements', permission: 'teams:rankings:read' }
    ]
  },
  {
    label: 'Site public',
    feature: 'website',
    items: [
      { name: 'Pages', icon: 'FileText', href: '/admin/website/pages', permission: 'cms:pages:read' },
      { name: 'Médiathèque', icon: 'Image', href: '/admin/website/media', permission: 'cms:media:read' },
      { name: 'Menus', icon: 'Menu', href: '/admin/website/menus', permission: 'cms:pages:read' },
      { name: 'Redirections', icon: 'Signpost', href: '/admin/website/redirects', permission: 'cms:nav:read' },
      { name: 'Pied de page', icon: 'PanelBottom', href: '/admin/website/footer', permission: 'cms:pages:read' }
    ]
  },
  {
    label: 'Réglages',
    items: [
      { name: 'Configuration', icon: 'Settings', href: '/admin/settings', permission: 'settings:hub:read' },
      { name: 'Accès & Rôles', icon: 'User', href: '/admin/iam', permission: 'iam:users:read' }
    ]
  },
  {
    label: 'Assistance',
    items: [{ name: "Centre d'aide", icon: 'HelpCircle', href: '/admin/help', permission: 'help:docs:read' }]
  }
];
