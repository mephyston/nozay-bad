/**
 * Pages de l'espace adhérent proposées comme destination d'une notification.
 *
 * Source unique et fermée : l'émetteur choisit dans cette liste plutôt que de
 * saisir un chemin, ce qui rend un lien cassé impossible par construction. Les URL
 * externes restent refusées par le schéma d'envoi — une notification du club ne
 * doit jamais renvoyer vers un site tiers.
 *
 * À maintenir en phase avec les pages réelles de `apps/storefront/src/pages`.
 */
export const STOREFRONT_PAGES = [
  { path: '/', label: "Accueil de l'espace adhérent" },
  { path: '/annonces', label: 'Annonces du club' },
  { path: '/agenda', label: 'Calendrier du club' },
  { path: '/jeu-libre', label: 'Calendrier — jeu libre' },
  { path: '/mon-compte', label: 'Mon compte' },
  { path: '/boutique', label: 'Boutique' },
  { path: '/note-de-frais', label: 'Notes de frais' },
  { path: '/attestation', label: 'Attestation CSE' },
  { path: '/notifications', label: 'Réglages des notifications' }
] as const;

export type StorefrontPagePath = (typeof STOREFRONT_PAGES)[number]['path'];

export function isStorefrontPage(path: string): path is StorefrontPagePath {
  return STOREFRONT_PAGES.some((page) => page.path === path);
}
