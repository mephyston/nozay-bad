import type { Permission } from '@nba/iam-ui';

export interface NavItem {
  name: string;
  href: string;
  /** Icône Lucide, résolue par le composant qui rend le menu. */
  icon: string;
  /** `null` = visible par tout compte, quel que soit son rôle. */
  permission: Permission | null;
}

export interface NavGroup {
  label: string;
  items: NavItem[];
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
      { name: 'Tableau de bord', icon: 'LayoutDashboard', href: '/', permission: 'dashboard:overview:read' },
      { name: 'Assistant IA', icon: 'Sparkles', href: '/admin/ai', permission: 'ai:assistant:use' }
    ]
  },
  {
    label: 'Adhérents',
    items: [
      { name: 'Liste des adhérents', icon: 'Users', href: '/admin/members', permission: 'members:members:read' }
    ]
  },
  {
    label: 'Comptabilité',
    items: [
      { name: 'Rapports financiers', icon: 'BarChart3', href: '/admin/accounting/reports', permission: 'accounting:reports:read' },
      { name: 'Grand Livre', icon: 'BookOpen', href: '/admin/accounting', permission: 'accounting:ledger:read' },
      { name: 'Factures', icon: 'FileCheck', href: '/admin/accounting/invoices', permission: 'accounting:invoices:read' },
      { name: 'Rapprochement bancaire', icon: 'Scale', href: '/admin/accounting/import', permission: 'accounting:bank:read' },
      { name: 'Remises de chèques', icon: 'Landmark', href: '/admin/accounting/cheques', permission: 'accounting:checks:read' },
      { name: 'Caisse', icon: 'Wallet', href: '/admin/accounting/cash-box', permission: 'accounting:ledger:read' },
      { name: 'Notes de frais', icon: 'Coins', href: '/admin/expenses', permission: 'expenses:reports:read' }
    ]
  },
  {
    label: 'Boutique',
    items: [
      { name: 'Produits', icon: 'Package', href: '/admin/shop/products', permission: 'shop:products:read' },
      { name: 'Commandes', icon: 'ShoppingCart', href: '/admin/shop/orders', permission: 'shop:orders:read' }
    ]
  },
  {
    label: 'Communication',
    items: [
      { name: 'Annonces', icon: 'Megaphone', href: '/admin/announcements', permission: 'announcements:posts:read' },
      { name: 'Notifications', icon: 'Bell', href: '/admin/notifications', permission: 'notifications:messages:read' }
    ]
  },
  {
    label: 'Site public',
    items: [
      { name: 'Médiathèque', icon: 'Image', href: '/admin/website/media', permission: 'cms:media:read' }
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
