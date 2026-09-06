/**
 * Catalogue des permissions de l'application.
 *
 * Convention : `<domaine>:<ressource>:<action>` — trois segments, vérifiés par test.
 * Actions autorisées : read, write, delete, approve, import, export, close,
 * reconcile, send, use, impersonate.
 *
 * Aucun joker. `can()` est un `Set.has()` : une permission est accordée ou elle ne
 * l'est pas. L'ancienne sémantique `accounting:*` accordait `accounting:x` mais
 * `accounting:invoices` n'accordait pas `accounting:*` — cette asymétrie imposait des
 * chaînes `A || B || C` à chaque point de contrôle, et chacune était un endroit où
 * une permission pouvait être oubliée. Le mapping rôle→permissions vivant désormais
 * en TypeScript (voir `roles.ts`), développer un groupe coûte un spread : les jokers
 * n'ont plus de raison d'être.
 */
export const ALL_PERMISSIONS = [
  // — Adhérents —
  'members:members:read',
  'members:members:write', // autorisation note de frais, édition de fiche
  'members:members:import', // import CSV Poona
  'members:members:export', // fichier des adresses mail : des données personnelles
  'members:attestations:read', // consultation config CSE + génération du PDF
  'members:attestations:write', // modèle et signature

  // — Comptabilité —
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
  'accounting:config:read', // catégories et classes de compte
  'accounting:config:write',

  // — Notes de frais —
  'expenses:reports:read',
  'expenses:reports:write',
  'expenses:reports:approve', // approuver / rejeter / annuler

  // — Boutique —
  'shop:products:read',
  'shop:products:write',
  'shop:categories:write',
  'shop:orders:read',
  'shop:orders:write',
  'shop:orders:approve',

  // — Notifications —
  'notifications:messages:read',
  'notifications:messages:send',

  // — Annonces —
  // Rédiger une annonce et la diffuser sur les téléphones du club sont deux actes
  // distincts : la diffusion reste gouvernée par `notifications:messages:send`.

  // — Site public —
  // Le CMS du site vitrine. Distinct des annonces : une annonce s'adresse aux
  // adhérents connectés, une page du site s'adresse à tout le monde, y compris à
  // Google. Publier engage donc l'image publique du club, pas seulement sa vie interne.
  'cms:pages:read',
  'cms:pages:write',
  'cms:pages:delete',
  'cms:posts:read',
  'cms:posts:write',
  'cms:posts:delete',
  'cms:media:read',
  'cms:media:write',
  'cms:media:delete',
  // Le menu et les redirections gouvernent l'arborescence des URL : une erreur ici se
  // paie en référencement, pas en contenu. Droit séparé de la rédaction.
  'cms:nav:read',
  'cms:nav:write',

  // — Créneaux et agenda —
  // Données du club, pas du contenu : un créneau change quand la mairie réattribue un
  // gymnase. D'où des droits distincts de ceux du site, qui ne fait que les afficher.
  'schedules:slots:read',
  'schedules:slots:write',
  // Séances de jeu libre : des dates, là où les créneaux ne disent qu'une habitude.
  // Droits distincts de la grille hebdomadaire — celle-ci suit la mairie, celles-là
  // suivent les vacances scolaires et l'affluence.
  'schedules:open-play:read',
  'schedules:open-play:write',
  // Lire qui s'est inscrit à une séance, nom par nom, invités compris. Droit distinct
  // de la tenue des séances, sur le modèle d'`events:registrations:read` : une séance
  // est une information de club, la liste de ses inscrits une donnée personnelle — et
  // un invité non licencié n'a jamais rien signé au club.
  'schedules:registrations:read',
  'events:events:read',
  'events:events:write',
  'events:events:delete',
  // Lire qui s'est inscrit à un événement, nom par nom. Droit distinct de la tenue de
  // l'agenda : une fiche d'événement est publique, la liste de ses inscrits est une
  // donnée nominative d'adhérents. Ouvrir ou fermer les inscriptions relève en
  // revanche de `events:events:write` — c'est un champ de l'événement.
  'events:registrations:read',

  // — Interclubs —
  'teams:teams:read',
  'teams:teams:write',
  'teams:teams:delete',
  // Les classements fédéraux et la date à laquelle ils sont arrêtés. Droit distinct de
  // la tenue des équipes : déplacer la date de référence recalcule toutes les valeurs
  // d'équipe de la saison, et donc ce qui est conforme et ce qui ne l'est pas.
  'teams:rankings:read',
  'teams:rankings:write',
  'teams:rankings:import',
  // Les compositions de rencontre. Les capitaines les saisissent depuis l'espace
  // adhérent, sans compte d'administration : ce droit sert au contrôle par le coach.
  'teams:lineups:read',
  'teams:lineups:write',

  // — Assistant IA —
  'ai:assistant:use',

  // — Administration —
  'settings:hub:read',
  // Lire la consommation de la plateforme suppose un jeton d'analytique à portée
  // compte, qui voit tous les Workers hébergés — y compris ceux qui n'ont rien à voir
  // avec le club. Le droit reste donc à part de la configuration fonctionnelle.
  'settings:platform:read',
  'iam:users:read',
  'iam:users:write',
  'iam:users:delete',
  'iam:roles:read',
  // Modifier ce qu'un rôle accorde revient à pouvoir s'accorder n'importe quel droit :
  // il suffit d'ajouter la permission voulue au rôle que l'on porte. Ce droit ne peut
  // donc appartenir qu'à `super_admin`, qui les détient déjà tous — l'accorder à un
  // autre rôle en ferait un super administrateur déguisé, et effacerait la séparation
  // des tâches que le modèle établit.
  'iam:roles:write',
  'iam:sessions:impersonate',

  // — Socle commun à tout compte —
  'dashboard:overview:read',
  'help:docs:read'
] as const;

export type Permission = (typeof ALL_PERMISSIONS)[number];

const ALL = new Set<string>(ALL_PERMISSIONS);

/** Une chaîne quelconque est-elle une permission connue ? (garde de désérialisation) */
export function isPermission(value: string): value is Permission {
  return ALL.has(value);
}

/**
 * Test d'autorisation unique de l'application. Aucun joker, aucune inférence.
 *
 * Accepte un `Set` (chemin serveur, permissions résolues) ou un tableau (props
 * d'îlot Svelte, qui ne survivent pas à la sérialisation sous forme de `Set`).
 */
export function can(
  granted: ReadonlySet<string> | readonly string[],
  required: Permission
): boolean {
  return granted instanceof Set ? granted.has(required) : (granted as readonly string[]).includes(required);
}

/** Vrai si au moins une des permissions requises est accordée. */
export function canAny(
  granted: ReadonlySet<string> | readonly string[],
  required: readonly Permission[]
): boolean {
  return required.some((p) => can(granted, p));
}

/** Vrai si toutes les permissions requises sont accordées. */
export function canAll(
  granted: ReadonlySet<string> | readonly string[],
  required: readonly Permission[]
): boolean {
  return required.every((p) => can(granted, p));
}
