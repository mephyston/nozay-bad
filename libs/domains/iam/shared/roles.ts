import { ALL_PERMISSIONS, type Permission } from './permissions';

/**
 * Rôles métier de l'association. Le mapping rôle→permissions vit ici, en TypeScript :
 * il est versionné, typé, et toute modification passe par une revue de code. La base
 * ne stocke que la liaison compte↔rôle (`admin_user_roles`).
 *
 * Deny-by-default : un compte sans rôle n'a aucune permission. `membre` est le socle —
 * le rôle attribué à tout compte créé sans rôle explicite — et ne donne accès qu'au
 * tableau de bord et au centre d'aide. Il porte volontairement le libellé « Accès
 * minimal » : c'est ce qu'il est, et non un rôle métier que l'on choisirait.
 */
export const ROLES = [
  'super_admin',
  'president',
  'tresorier',
  'secretaire',
  'coach',
  'communication',
  'membre'
] as const;

export type Role = (typeof ROLES)[number];

export const DEFAULT_ROLE: Role = 'membre';

export const ROLE_LABELS: Record<Role, string> = {
  super_admin: 'Super administrateur',
  president: 'Président·e',
  tresorier: 'Trésorier·ère',
  secretaire: 'Secrétaire',
  coach: 'Entraîneur·e',
  communication: 'Communication',
  membre: 'Accès minimal'
};

export const ROLE_DESCRIPTIONS: Record<Role, string> = {
  super_admin: "Tous les droits, y compris la configuration technique et l'usurpation de compte.",
  president: "Consultation de l'ensemble du club, actes de gouvernance (exercices, budget, validations) et gestion des accès.",
  tresorier: 'Comptabilité complète, notes de frais et encaissement des commandes.',
  secretaire: 'Fichier des adhérents, attestations, communication et catalogue boutique.',
  coach: 'Catalogue et commandes de la boutique, consultation des adhérents.',
  communication:
    "Annonces, notifications aux adhérents et site public. Aucun accès aux finances ni au fichier des adhérents.",
  membre: "Socle attribué à un compte sans rôle : tableau de bord et centre d'aide uniquement."
};

/** Socle commun : tout compte admin voit son tableau de bord et l'aide en ligne. */
const BASE = ['dashboard:overview:read', 'help:docs:read'] as const;

/**
 * Lectures transverses nécessaires aux sélecteurs de saison et de catégorie, présents
 * sur presque tous les écrans comptables et boutique.
 */
const ACCOUNTING_CONTEXT = ['accounting:seasons:read', 'accounting:config:read'] as const;

const ACCOUNTING_FULL = [
  'accounting:ledger:read',
  'accounting:ledger:write',
  'accounting:ledger:delete',
  'accounting:invoices:read',
  'accounting:invoices:write',
  'accounting:invoices:delete',
  'accounting:bank:read',
  'accounting:bank:import',
  'accounting:bank:reconcile',
  'accounting:checks:read',
  'accounting:checks:write',
  'accounting:checks:delete',
  'accounting:seasons:read',
  'accounting:seasons:write',
  'accounting:seasons:close',
  'accounting:budget:read',
  'accounting:budget:write',
  'accounting:reports:read',
  'accounting:reports:export',
  'accounting:config:read',
  'accounting:config:write'
] as const;

export const ROLE_PERMISSIONS: Record<Role, readonly Permission[]> = {
  super_admin: ALL_PERMISSIONS,

  president: [
    ...BASE,
    ...ACCOUNTING_CONTEXT,
    // Lecture intégrale : la présidence doit pouvoir tout consulter.
    'members:members:read',
    'members:attestations:read',
    'accounting:ledger:read',
    'accounting:invoices:read',
    'accounting:bank:read',
    'accounting:checks:read',
    'accounting:budget:read',
    'accounting:reports:read',
    'accounting:reports:export',
    'expenses:reports:read',
    'shop:products:read',
    'shop:orders:read',
    'notifications:messages:read',
    'announcements:posts:read',
    // Actes de gouvernance : ouverture et clôture d'exercice, vote du budget.
    'accounting:seasons:write',
    'accounting:seasons:close',
    'accounting:budget:write',
    // Validations : elles engagent l'association, donc relèvent de la présidence.
    'expenses:reports:approve',
    'shop:orders:approve',
    // Communication officielle du club.
    'notifications:messages:send',
    'announcements:posts:write',
    'announcements:posts:delete',
    // Le site public engage l'image du club vis-à-vis de l'extérieur : la présidence
    // y a la main pleine, y compris sur l'arborescence des URL.
    'cms:pages:read',
    'cms:pages:write',
    'cms:pages:delete',
    'cms:posts:read',
    'cms:posts:write',
    'cms:posts:delete',
    'cms:media:read',
    'cms:media:write',
    'cms:media:delete',
    'cms:nav:read',
    'cms:nav:write',
    'schedules:slots:read',
    'schedules:slots:write',
    'events:events:read',
    'events:events:write',
    'events:events:delete',
    // Représentation légale : accorde et révoque les accès.
    'iam:users:read',
    'iam:users:write',
    'iam:users:delete',
    // Lecture seule de la matrice : la présidence décide qui occupe quel poste,
    // sans pouvoir déplacer les limites du poste lui-même.
    'iam:roles:read',
    'settings:hub:read',
    'ai:assistant:use'
    // Pas d'écriture comptable : séparation des tâches. Le trésorier saisit, la
    // présidence contrôle, et le grand livre reste imputable à une seule personne.
  ],

  tresorier: [
    ...BASE,
    ...ACCOUNTING_FULL,
    // Rattacher une écriture à un adhérent, éditer une attestation fiscale CSE.
    'members:members:read',
    'members:attestations:read',
    'members:attestations:write',
    // Notes de frais : saisie, correction et remboursement.
    'expenses:reports:read',
    'expenses:reports:write',
    'expenses:reports:approve',
    // Valider une commande écrit une recette au grand livre : c'est un acte comptable.
    'shop:products:read',
    'shop:orders:read',
    'shop:orders:approve',
    'notifications:messages:read',
    // Consultation seule : la communication du club n'est pas du ressort de la trésorerie.
    'announcements:posts:read',
    'cms:pages:read',
    'cms:posts:read',
    'schedules:slots:read',
    'events:events:read',
    'settings:hub:read',
    'ai:assistant:use'
  ],

  secretaire: [
    ...BASE,
    ...ACCOUNTING_CONTEXT,
    // Cœur du rôle : le fichier des adhérents et les attestations.
    'members:members:read',
    'members:members:write',
    'members:members:import',
    'members:attestations:read',
    'members:attestations:write',
    // Communication du club.
    'notifications:messages:read',
    'notifications:messages:send',
    'announcements:posts:read',
    'announcements:posts:write',
    'announcements:posts:delete',
    // Site public : rédaction, sans la main sur l'arborescence des URL — modifier un
    // menu ou une redirection se paie en référencement, cela reste à la présidence
    // et à la commission Communication.
    'cms:pages:read',
    'cms:pages:write',
    'cms:posts:read',
    'cms:posts:write',
    'cms:media:read',
    'cms:media:write',
    'cms:nav:read',
    'schedules:slots:read',
    'events:events:read',
    'events:events:write',
    // Boutique : catalogue et suivi des commandes, sans encaissement.
    'shop:products:read',
    'shop:products:write',
    'shop:categories:write',
    'shop:orders:read',
    // Consultation seule côté finances.
    'accounting:reports:read',
    'expenses:reports:read',
    'settings:hub:read'
  ],

  coach: [
    ...BASE,
    ...ACCOUNTING_CONTEXT,
    // Suivre et équiper ses joueurs : consultation du fichier, sans modification.
    'members:members:read',
    // La boutique : catalogue, catégories, et passage de commandes pour un adhérent.
    'shop:products:read',
    'shop:products:write',
    'shop:categories:write',
    'shop:orders:read',
    'shop:orders:write',
    // Consultation seule : l'entraîneur suit les annonces et le site sans les rédiger.
    'announcements:posts:read',
    'cms:pages:read',
    'cms:posts:read',
    // L'entraîneur vit les créneaux au quotidien : il les tient à jour.
    'schedules:slots:read',
    'schedules:slots:write',
    'events:events:read',
    // Les catégories de produits vivent dans les réglages : sans cette entrée, l'écran
    // existe mais aucun chemin du menu n'y mène.
    'settings:hub:read'
    // Pas de `shop:orders:approve` : valider une commande écrit une recette au grand
    // livre, c'est un acte comptable qui reste à la trésorerie.
  ],

  /**
   * Communication du club : annonces, notifications et site public.
   *
   * Ce rôle existe pour confier la communication à un bénévole sans lui ouvrir les
   * finances ni le fichier des adhérents — ce qu'imposait jusqu'ici le rôle
   * `secretaire`, seul autre porteur de ces droits.
   *
   * C'est le seul rôle non dirigeant à porter `cms:nav:write` : la commission
   * Communication est celle qui tient le site, arborescence comprise.
   */
  communication: [
    ...BASE,
    'announcements:posts:read',
    'announcements:posts:write',
    'announcements:posts:delete',
    // Diffuser une annonce fait sonner tous les téléphones du club : c'est le cœur
    // du rôle, pas un droit accessoire.
    'notifications:messages:read',
    'notifications:messages:send',
    // Site public : le rôle en a la charge complète, rédaction comme arborescence.
    'cms:pages:read',
    'cms:pages:write',
    'cms:pages:delete',
    'cms:posts:read',
    'cms:posts:write',
    'cms:posts:delete',
    'cms:media:read',
    'cms:media:write',
    'cms:media:delete',
    'cms:nav:read',
    'cms:nav:write',
    'schedules:slots:read',
    'schedules:slots:write',
    'events:events:read',
    'events:events:write',
    'events:events:delete'
  ],

  // Socle du deny-by-default : aucun droit métier. Attribué à un compte créé sans
  // rôle explicite, pour qu'il puisse au moins ouvrir son tableau de bord.
  membre: [...BASE]
};

export function isRole(value: string): value is Role {
  return (ROLES as readonly string[]).includes(value);
}

/**
 * Union des permissions des rôles fournis. Un rôle inconnu (rangé en base par une
 * version antérieure, ou saisi à la main) est ignoré plutôt que de faire échouer la
 * requête : la conséquence est un accès refusé, jamais un accès accordé par erreur.
 */
export function resolvePermissions(roles: readonly string[]): Set<Permission> {
  const permissions = new Set<Permission>();
  for (const role of roles) {
    if (!isRole(role)) {
      console.warn(`[iam] rôle inconnu ignoré : ${role}`);
      continue;
    }
    for (const permission of ROLE_PERMISSIONS[role]) permissions.add(permission);
  }
  return permissions;
}
