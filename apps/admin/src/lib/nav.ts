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
  /**
   * Mots que la recherche du menu reconnaît en plus du nom : ce qu'on tape quand on
   * ne connaît pas l'intitulé (« virement » pour le rapprochement, « adhésion » pour la
   * liste des adhérents). Sans accents ni majuscules, la recherche les neutralise.
   */
  keywords?: string[];
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
      { name: 'Tableau de bord', icon: 'LayoutDashboard', href: '/', permission: 'dashboard:overview:read', keywords: ['accueil', 'dashboard', 'synthese'] }
    ]
  },
  {
    label: 'Adhérents',
    items: [
      { name: 'Liste des adhérents', icon: 'Users', href: '/admin/members', permission: 'members:members:read', keywords: ['adhesion', 'licence', 'membres', 'inscription', 'import', 'poona'] },
      { name: 'Dirigeants', icon: 'Landmark', href: '/admin/members/dirigeants', permission: 'members:members:read', keywords: ['bureau', 'president', 'tresorier', 'secretaire', 'fonctions'] }
    ]
  },
  {
    label: 'Comptabilité',
    items: [
      { name: 'Rapports financiers', icon: 'BarChart3', href: '/admin/accounting/reports', permission: 'accounting:reports:read', feature: 'accounting', keywords: ['bilan', 'budget', 'resultat', 'assemblee', 'ag', 'exercice', 'saison'] },
      { name: 'Grand Livre', icon: 'BookOpen', href: '/admin/accounting', permission: 'accounting:ledger:read', feature: 'accounting', keywords: ['ecritures', 'comptabilite', 'mouvements', 'depenses', 'recettes', 'categories'] },
      { name: 'Factures', icon: 'FileCheck', href: '/admin/accounting/invoices', permission: 'accounting:invoices:read', feature: 'invoices', keywords: ['facturation', 'devis', 'avoir', 'client'] },
      { name: 'Rapprochement bancaire', icon: 'Scale', href: '/admin/accounting/reconciliation', permission: 'accounting:bank:read', feature: 'accounting', keywords: ['banque', 'releve', 'virement', 'ofx', 'pointage', 'compte courant', 'livret'] },
      { name: 'Remises de chèques', icon: 'Landmark', href: '/admin/accounting/cheques', permission: 'accounting:checks:read', feature: 'checks', keywords: ['cheque', 'depot', 'bordereau', 'remise'] },
      /*
        Les caisses et porte-monnaie du club ne sont pas listés ici : ce sont des comptes,
        réglés dans l'administration, et le menu en tire une entrée chacun à cette place
        (`menuAccountItems`, ci-dessous). `page-permissions` connaît leur page par son motif.
      */
      { name: 'Notes de frais', icon: 'Coins', href: '/admin/expenses', permission: 'expenses:reports:read', feature: 'expenses', keywords: ['remboursement', 'depense', 'frais', 'benevole'] }
    ]
  },
  {
    label: 'Boutique',
    feature: 'shop',
    items: [
      { name: 'Produits', icon: 'Package', href: '/admin/shop/products', permission: 'shop:products:read', keywords: ['boutique', 'catalogue', 'article', 'volants', 'cordage', 'maillot', 'stock', 'prix', 'declinaison', 'image'] },
      { name: 'Commandes', icon: 'ShoppingCart', href: '/admin/shop/orders', permission: 'shop:orders:read', keywords: ['boutique', 'commande', 'achat', 'validation', 'paiement', 'encaissement'] }
    ]
  },
  {
    label: 'Communication',
    items: [
      // En tête de la communication, et non sous « Site public » : depuis l'absorption
      // des annonces, une actualité s'adresse aussi bien aux adhérents qu'aux visiteurs.
      { name: 'Actualités', icon: 'Newspaper', href: '/admin/website/posts', permission: 'cms:posts:read', keywords: ['article', 'news', 'annonce', 'publication', 'blog'] },
      { name: 'Notifications', icon: 'Bell', href: '/admin/notifications', permission: 'notifications:messages:read', feature: 'push', keywords: ['push', 'message', 'envoi', 'alerte', 'rappel'] },
      { name: 'Créneaux', icon: 'CalendarClock', href: '/admin/website/schedules', permission: 'schedules:slots:read', feature: 'schedules', keywords: ['horaires', 'gymnase', 'entrainement', 'planning', 'seances'] },
      { name: 'Agenda', icon: 'CalendarDays', href: '/admin/website/events', permission: 'events:events:read', feature: 'events', keywords: ['evenement', 'calendrier', 'tournoi', 'date', 'soiree'] }
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
      { name: 'Séances', icon: 'DoorOpen', href: '/admin/website/jeu-libre', permission: 'schedules:open-play:read', keywords: ['jeu libre', 'ouverture', 'gymnase', 'inscription'] },
      { name: 'Ouvreurs', icon: 'KeyRound', href: '/admin/website/jeu-libre/ouvreurs', permission: 'schedules:open-play:read', keywords: ['jeu libre', 'cle', 'responsable', 'ouverture'] }
    ]
  },
  {
    // L'entraîneur tient ses séances individuelles ici : ce n'est ni du jeu libre ni de
    // la communication, c'est son entraînement.
    label: 'Entraînement',
    feature: 'indiv',
    beta: true,
    items: [
      { name: 'Indiv', icon: 'Dumbbell', href: '/admin/entrainement/indiv', permission: 'schedules:indiv:read', keywords: ['individuel', 'entrainement', 'coach', 'seance', 'competiteur'] }
    ]
  },
  {
    label: 'Interclubs',
    feature: 'teams',
    beta: true,
    items: [
      { name: 'Équipes', icon: 'Trophy', href: '/admin/teams', permission: 'teams:teams:read', keywords: ['interclubs', 'championnat', 'equipe', 'capitaine', 'joueurs'] },
      { name: 'Contrôle des journées', icon: 'ShieldCheck', href: '/admin/teams/journees', permission: 'teams:lineups:read', keywords: ['interclubs', 'journee', 'composition', 'feuille de match', 'controle'] },
      { name: 'Classements', icon: 'ChartNoAxesColumn', href: '/admin/teams/classements', permission: 'teams:rankings:read', keywords: ['interclubs', 'elo', 'poona', 'classement', 'import'] },
      { name: 'Règlements', icon: 'FileText', href: '/admin/teams/reglements', permission: 'teams:rankings:read', keywords: ['interclubs', 'regles', 'reglement', 'ffbad'] }
    ]
  },
  {
    label: 'Site public',
    feature: 'website',
    items: [
      { name: 'Pages', icon: 'FileText', href: '/admin/website/pages', permission: 'cms:pages:read', keywords: ['site', 'contenu', 'page', 'cms', 'brouillon', 'publier'] },
      { name: 'Médiathèque', icon: 'Image', href: '/admin/website/media', permission: 'cms:media:read', keywords: ['site', 'images', 'photos', 'fichiers', 'medias', 'pdf'] },
      { name: 'Menus', icon: 'Menu', href: '/admin/website/menus', permission: 'cms:pages:read', keywords: ['site', 'navigation', 'menu', 'liens'] },
      { name: 'Redirections', icon: 'Signpost', href: '/admin/website/redirects', permission: 'cms:nav:read', keywords: ['site', 'redirection', 'url', 'ancien lien', 'wordpress'] },
      { name: 'Pied de page', icon: 'PanelBottom', href: '/admin/website/footer', permission: 'cms:pages:read', keywords: ['site', 'footer', 'bas de page', 'mentions'] }
    ]
  },
  {
    label: 'Réglages',
    items: [
      { name: 'Configuration', icon: 'Settings', href: '/admin/settings', permission: 'settings:hub:read', keywords: ['reglages', 'parametres', 'club', 'comptes', 'moyens de paiement', 'fonctionnalites', 'identite', 'documents', 'logo', 'categories', 'attestation', 'saisons'] },
      { name: 'Accès & Rôles', icon: 'User', href: '/admin/iam', permission: 'iam:users:read', keywords: ['utilisateurs', 'roles', 'droits', 'permissions', 'acces', 'compte', 'connexion'] }
    ]
  },
  {
    label: 'Assistance',
    items: [{ name: "Centre d'aide", icon: 'HelpCircle', href: '/admin/help', permission: 'help:docs:read', keywords: ['aide', 'documentation', 'help', 'guide', 'comment faire'] }]
  }
];

/** Icône et adresse d'une entrée de menu pour un compte sans relevé (caisse, porte-monnaie). */
export const ACCOUNT_MENU_ICONS: Record<string, string> = { cash: 'Wallet', wallet: 'CreditCard', voucher: 'Ticket' };

/** Ce qu'on tape pour retrouver un compte selon sa nature, en plus de son nom et de son code. */
const ACCOUNT_MENU_KEYWORDS: Record<string, string[]> = {
  cash: ['caisse', 'especes', 'liquide', 'compte'],
  wallet: ['porte-monnaie', 'solde', 'compte'],
  voucher: ['cheques', 'bons', 'coupons', 'titres', 'pass', 'compte']
};

export function menuAccountItem(account: { code: string; label: string; kind: string }): NavItem {
  return {
    name: account.label,
    icon: ACCOUNT_MENU_ICONS[account.kind] ?? 'Wallet',
    href: `/admin/accounting/accounts/${account.code}`,
    permission: 'accounting:ledger:read',
    feature: 'accounting',
    keywords: [account.code, ...(ACCOUNT_MENU_KEYWORDS[account.kind] ?? [])]
  };
}

/**
 * Les saisies rapides : un formulaire ouvert d'un geste, depuis la recherche du menu.
 *
 * Elles étaient des boutons de la barre du bas (chèque, commande, frais), une par
 * droit. La barre n'a plus que deux cercles — menu, recherche — : c'est la recherche
 * qui les propose, à côté de la page qu'elles concernent. La page les reconnaît à
 * `?action=…` quand on y arrive, et à l'événement `event` quand on y est déjà.
 */
export interface QuickAction {
  name: string;
  icon: string;
  href: string;
  /** Événement que la page écoute quand on s'y trouve déjà : le sheet s'ouvre sans navigation. */
  event: string;
  /** Début de chemin qui dit « on y est déjà ». */
  pathPrefix: string;
  permission: Permission;
  feature?: Feature;
  keywords?: string[];
}

export const QUICK_ACTIONS: QuickAction[] = [
  {
    name: 'Enregistrer un chèque',
    icon: 'Landmark',
    href: '/admin/accounting/cheques/list?action=new-cheque',
    event: 'open-new-cheque',
    pathPrefix: '/admin/accounting/cheques/list',
    permission: 'accounting:checks:write',
    feature: 'checks',
    keywords: ['cheque', 'nouveau', 'saisie', 'remise']
  },
  {
    name: 'Nouvelle commande',
    icon: 'ShoppingCart',
    href: '/admin/shop/orders?action=new-order',
    event: 'open-new-order',
    pathPrefix: '/admin/shop/orders',
    permission: 'shop:orders:write',
    feature: 'shop',
    keywords: ['commande', 'boutique', 'nouveau', 'saisie', 'vente']
  },
  {
    name: 'Nouvelle note de frais',
    icon: 'Receipt',
    href: '/admin/expenses?action=new-expense',
    event: 'open-new-expense',
    pathPrefix: '/admin/expenses',
    permission: 'expenses:reports:write',
    feature: 'expenses',
    keywords: ['frais', 'depense', 'remboursement', 'nouveau', 'saisie']
  }
];
