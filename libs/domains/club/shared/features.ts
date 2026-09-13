/**
 * Catalogue des fonctionnalités qu'un club peut allumer ou éteindre.
 *
 * Jusqu'ici, ce qu'un club utilisait ou non se décidait dans les `wrangler.json`
 * (`OPEN_PLAY_ENABLED`, `INDIV_ENABLED`, `PUSH_*_ENABLED`) : un réglage de déploiement,
 * le même pour tous, invisible du bureau. Un club qui n'a pas de boutique, pas d'équipes
 * d'interclubs ou qui tient sa comptabilité ailleurs se retrouvait avec des rubriques
 * vides dans son menu et des cartes sans objet dans l'espace adhérent.
 *
 * Ce catalogue est la liste fermée de ce qui se règle. Le choix du club vit en base
 * (`club_features`, une ligne par clé) ; ce fichier ne porte que la nomenclature, les
 * libellés et le regroupement, comme `permissions.ts` le fait pour les droits. Le menu
 * d'administration, les pages de l'espace adhérent, les routes de l'API et les envois
 * programmés lisent tous **la même clé** : éteindre « boutique » fait disparaître la
 * rubrique, rend ses pages introuvables et refuse ses routes, sans redéploiement.
 *
 * Distinct des **drapeaux de livraison** (`*_ENABLED` dans les `wrangler.json`), qui
 * gardent une fonctionnalité inachevée hors de la production : ceux-là relèvent du
 * dépôt, ceux-ci du club. Une fonctionnalité visible est celle que le dépôt a livrée
 * **et** que le club a gardée.
 */

export const FEATURES = [
  // — Adhérents —
  'attestations',
  'member_directory',
  'birthdays',
  // — Comptabilité —
  'accounting',
  'invoices',
  'checks',
  'badnet',
  'cash',
  'expenses',
  // — Boutique —
  'shop',
  // — Communication —
  'push',
  'schedules',
  'events',
  // — Activités —
  'open_play',
  'indiv',
  'teams',
  // — Site public —
  'website',
  // — Envois programmés —
  'reminder_unpaid',
  'reminder_rankings',
  'reminder_lineups',
  'reminder_open_play'
] as const;

export type Feature = (typeof FEATURES)[number];

export function isFeature(value: unknown): value is Feature {
  return typeof value === 'string' && (FEATURES as readonly string[]).includes(value);
}

export const FEATURE_GROUPS = [
  'Adhérents',
  'Comptabilité',
  'Boutique',
  'Communication',
  'Activités',
  'Site public',
  'Envois programmés'
] as const;

export type FeatureGroup = (typeof FEATURE_GROUPS)[number];

export interface FeatureInfo {
  label: string;
  /** Ce que le club perd en l'éteignant, dit du point de vue du bureau. */
  description: string;
  group: FeatureGroup;
}

export const FEATURE_CATALOG: Record<Feature, FeatureInfo> = {
  attestations: {
    label: 'Attestations CSE',
    description: "Attestation de paiement de la cotisation, téléchargeable par l'adhérent et générée par le secrétariat.",
    group: 'Adhérents'
  },
  member_directory: {
    label: 'Annuaire des adhérents',
    description: "Fiche de chaque adhérent consultable par les autres adhérents connectés. Éteint, chacun ne voit que son foyer.",
    group: 'Adhérents'
  },
  birthdays: {
    label: 'Anniversaires',
    description: "Anniversaires du jour sur l'accueil de l'espace adhérent, et annonce au club chaque matin si les notifications sont actives.",
    group: 'Adhérents'
  },
  accounting: {
    label: 'Comptabilité',
    description: 'Grand livre, rapports financiers, rapprochement bancaire et exercices. Éteint, la rubrique disparaît du menu.',
    group: 'Comptabilité'
  },
  invoices: {
    label: 'Factures',
    description: 'Factures émises par le club (sponsors, locations, prestations).',
    group: 'Comptabilité'
  },
  checks: {
    label: 'Remises de chèques',
    description: 'Lecture des chèques en photo, bordereaux de remise et suivi de leur encaissement.',
    group: 'Comptabilité'
  },
  badnet: {
    label: 'Porte-monnaie Badnet',
    description: 'Suivi du compte Badnet du club, alimenté et débité par les inscriptions aux tournois.',
    group: 'Comptabilité'
  },
  cash: {
    label: 'Caisse',
    description: 'Compte de caisse en espèces (buvette, ventes sur place).',
    group: 'Comptabilité'
  },
  expenses: {
    label: 'Notes de frais',
    description: "Notes de frais déposées par les adhérents autorisés et validées par la trésorerie.",
    group: 'Comptabilité'
  },
  shop: {
    label: 'Boutique',
    description: "Catalogue (volants, textile, cordages) et commandes des adhérents.",
    group: 'Boutique'
  },
  push: {
    label: 'Notifications',
    description: "Notifications envoyées sur le téléphone des adhérents, et les envois automatiques qui en dépendent.",
    group: 'Communication'
  },
  schedules: {
    label: 'Créneaux',
    description: "Grille hebdomadaire des créneaux d'entraînement et de jeu, affichée sur le site et dans l'espace adhérent.",
    group: 'Communication'
  },
  events: {
    label: 'Agenda',
    description: "Événements du club (tournois, stages, assemblée) avec inscriptions.",
    group: 'Communication'
  },
  open_play: {
    label: 'Jeu libre',
    description: 'Séances de jeu libre : inscriptions des adhérents, invités et bénévoles ouvreurs.',
    group: 'Activités'
  },
  indiv: {
    label: 'Séances individuelles',
    description: "Soirées d'indiv ouvertes aux compétiteurs, candidatures et choix de l'entraîneur.",
    group: 'Activités'
  },
  teams: {
    label: 'Interclubs',
    description: 'Équipes engagées, classements, compositions et contrôle des journées.',
    group: 'Activités'
  },
  website: {
    label: 'Site public',
    description: 'Le site internet du club : pages, actualités, médiathèque, menus. Éteint, le site ne répond plus.',
    group: 'Site public'
  },
  reminder_unpaid: {
    label: 'Rappel de cotisation',
    description: 'Le lundi, aux foyers dont la cotisation reste due, et aux commandes boutique à régler.',
    group: 'Envois programmés'
  },
  reminder_rankings: {
    label: 'Rappel des classements',
    description: "Avant une journée d'interclubs régional, aux fonctions du club : mettre à jour les classements.",
    group: 'Envois programmés'
  },
  reminder_lineups: {
    label: 'Rappel des compositions',
    description: "De la veille d'une journée jusqu'à la rencontre, aux capitaines dont la composition n'est pas validée.",
    group: 'Envois programmés'
  },
  reminder_open_play: {
    label: 'Rappel des ouvreurs',
    description: 'Chaque matin, aux ouvreurs désignés, les séances de jeu libre des sept prochains jours sans personne pour ouvrir.',
    group: 'Envois programmés'
  }
};

/**
 * Ce qu'une fonctionnalité suppose d'une autre.
 *
 * Un rappel de cotisation sans notifications ne part nulle part ; des factures sans
 * comptabilité n'ont pas de grand livre où s'écrire. Le calcul de `enabledFeatures`
 * éteint ce dont le préalable est éteint, pour que l'écran n'ait pas à le redire.
 */
export const FEATURE_PREREQUISITES: Partial<Record<Feature, readonly Feature[]>> = {
  invoices: ['accounting'],
  checks: ['accounting'],
  badnet: ['accounting'],
  cash: ['accounting'],
  reminder_unpaid: ['push'],
  reminder_rankings: ['push', 'teams'],
  reminder_lineups: ['push', 'teams'],
  reminder_open_play: ['push', 'open_play']
};

export type FeatureState = Record<Feature, boolean>;

/**
 * L'état effectif : ce que le club a réglé, moins ce que les préalables éteignent.
 *
 * Les clés absentes de `stored` sont **allumées** : une fonctionnalité ajoutée au
 * catalogue après la création du club ne disparaît pas des menus faute d'une ligne
 * en base — on ne dit pas à un club qu'il a perdu quelque chose qu'il n'a jamais
 * éteint.
 */
export function effectiveFeatures(stored: Partial<Record<Feature, boolean>>): FeatureState {
  const state = Object.fromEntries(FEATURES.map((f) => [f, stored[f] ?? true])) as FeatureState;
  for (const feature of FEATURES) {
    const required = FEATURE_PREREQUISITES[feature] ?? [];
    if (required.some((r) => !state[r])) state[feature] = false;
  }
  return state;
}

export const ALL_FEATURES_ON: FeatureState = effectiveFeatures({});
