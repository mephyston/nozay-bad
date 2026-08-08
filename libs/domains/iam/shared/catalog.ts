import { ALL_PERMISSIONS, type Permission } from './permissions';

/**
 * Libellés lisibles du catalogue de permissions.
 *
 * `accounting:ledger:delete` dit ce que fait le code ; « Supprimer une écriture »
 * dit ce qu'on accorde à quelqu'un. Un bénévole qui attribue un rôle doit pouvoir
 * juger sur le second. Un test vérifie que chaque permission a son libellé, pour
 * qu'aucune n'apparaisse à l'écran sous sa forme technique.
 */
export const PERMISSION_LABELS: Record<Permission, string> = {
  'members:members:read': 'Consulter les adhérents',
  'members:members:write': 'Modifier une fiche adhérent',
  'members:members:import': 'Importer les licences (Poona)',
  'members:attestations:read': 'Consulter et générer les attestations CSE',
  'members:attestations:write': "Modifier le modèle et la signature d'attestation",

  'accounting:ledger:read': 'Consulter le grand livre',
  'accounting:ledger:write': 'Saisir une écriture',
  'accounting:ledger:delete': 'Supprimer une écriture',
  'accounting:invoices:read': 'Consulter les factures',
  'accounting:invoices:write': 'Créer et modifier une facture',
  'accounting:invoices:delete': 'Supprimer une facture',
  'accounting:bank:read': 'Consulter les relevés bancaires',
  'accounting:bank:import': 'Importer un relevé bancaire',
  'accounting:bank:reconcile': 'Rapprocher les opérations bancaires',
  'accounting:checks:read': 'Consulter les chèques et remises',
  'accounting:checks:write': 'Enregistrer un chèque ou une remise',
  'accounting:checks:delete': 'Supprimer un chèque ou une remise',
  'accounting:seasons:read': 'Consulter les exercices',
  'accounting:seasons:write': 'Créer et modifier un exercice',
  'accounting:seasons:close': 'Clôturer ou rouvrir un exercice',
  'accounting:budget:read': 'Consulter le budget',
  'accounting:budget:write': 'Voter et modifier le budget',
  'accounting:reports:read': 'Consulter les rapports financiers',
  'accounting:reports:export': 'Exporter les rapports (PDF, archive)',
  'accounting:config:read': 'Consulter le plan comptable et les catégories',
  'accounting:config:write': 'Modifier le plan comptable et les catégories',

  'expenses:reports:read': 'Consulter les notes de frais',
  'expenses:reports:write': 'Saisir et modifier une note de frais',
  'expenses:reports:approve': 'Valider, refuser ou annuler une note de frais',

  'shop:products:read': 'Consulter le catalogue',
  'shop:products:write': 'Créer et modifier un produit',
  'shop:categories:write': 'Gérer les catégories de produits',
  'shop:orders:read': 'Consulter les commandes',
  'shop:orders:write': 'Créer et modifier une commande',
  'shop:orders:approve': 'Valider et encaisser une commande',

  'notifications:messages:read': "Consulter l'historique des notifications",
  'notifications:messages:send': 'Envoyer une notification au club',

  'ai:assistant:use': "Utiliser l'assistant IA",

  'settings:hub:read': 'Accéder aux réglages',
  'iam:users:read': 'Consulter les accès',
  'iam:users:write': 'Créer un accès et attribuer des rôles',
  'iam:users:delete': 'Supprimer un accès',
  'iam:roles:read': "Consulter les droits accordés par chaque rôle",
  'iam:roles:write': "Modifier les droits accordés par un rôle",
  'iam:sessions:impersonate': "Consulter l'application sous l'identité d'un autre compte",

  'dashboard:overview:read': 'Consulter le tableau de bord',
  'help:docs:read': "Consulter le centre d'aide"
};

/** Regroupement d'affichage, dans l'ordre où les rubriques apparaissent au menu. */
export const PERMISSION_GROUPS: { domain: string; label: string }[] = [
  { domain: 'dashboard', label: 'Tableau de bord' },
  { domain: 'members', label: 'Adhérents' },
  { domain: 'accounting', label: 'Comptabilité' },
  { domain: 'expenses', label: 'Notes de frais' },
  { domain: 'shop', label: 'Boutique' },
  { domain: 'notifications', label: 'Communication' },
  { domain: 'ai', label: 'Assistant IA' },
  { domain: 'settings', label: 'Réglages' },
  { domain: 'iam', label: 'Accès et rôles' },
  { domain: 'help', label: 'Assistance' }
];

export interface PermissionGroup {
  label: string;
  permissions: Permission[];
}

/** Catalogue regroupé par domaine, prêt à afficher. */
export function groupedPermissions(): PermissionGroup[] {
  return PERMISSION_GROUPS.map(({ domain, label }) => ({
    label,
    permissions: ALL_PERMISSIONS.filter((p) => p.split(':')[0] === domain)
  })).filter((g) => g.permissions.length > 0);
}
