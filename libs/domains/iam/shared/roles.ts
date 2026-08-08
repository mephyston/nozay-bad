import { ALL_PERMISSIONS, type Permission } from './permissions';

/**
 * Rôles métier de l'association. Le mapping rôle→permissions vit ici, en TypeScript :
 * il est versionné, typé, et toute modification passe par une revue de code. La base
 * ne stocke que la liaison compte↔rôle (`admin_user_roles`).
 *
 * Deny-by-default : un compte sans rôle n'a aucune permission. `membre` est le rôle
 * par défaut et ne donne accès qu'au tableau de bord et au centre d'aide.
 */
export const ROLES = ['super_admin', 'president', 'tresorier', 'secretaire', 'membre'] as const;

export type Role = (typeof ROLES)[number];

export const DEFAULT_ROLE: Role = 'membre';

export const ROLE_LABELS: Record<Role, string> = {
  super_admin: 'Super administrateur',
  president: 'Président·e',
  tresorier: 'Trésorier·ère',
  secretaire: 'Secrétaire',
  membre: 'Membre'
};

export const ROLE_DESCRIPTIONS: Record<Role, string> = {
  super_admin: "Tous les droits, y compris la configuration technique et l'usurpation de compte.",
  president: "Consultation de l'ensemble du club, actes de gouvernance (exercices, budget, validations) et gestion des accès.",
  tresorier: 'Comptabilité complète, notes de frais et encaissement des commandes.',
  secretaire: 'Fichier des adhérents, attestations, communication et catalogue boutique.',
  membre: "Tableau de bord et centre d'aide uniquement."
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
    // Actes de gouvernance : ouverture et clôture d'exercice, vote du budget.
    'accounting:seasons:write',
    'accounting:seasons:close',
    'accounting:budget:write',
    // Validations : elles engagent l'association, donc relèvent de la présidence.
    'expenses:reports:approve',
    'shop:orders:approve',
    // Communication officielle du club.
    'notifications:messages:send',
    // Représentation légale : accorde et révoque les accès.
    'iam:users:read',
    'iam:users:write',
    'iam:users:delete',
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

  // Rôle par défaut : aucun droit métier. C'est le socle du deny-by-default.
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
