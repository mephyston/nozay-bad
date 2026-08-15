/**
 * Emplacements de menu du site public.
 *
 * Vocabulaire partagé entre le domaine, l'administration et le site : l'union était
 * recopiée dans sept fichiers, et ajouter `legal` demandait de les retrouver tous —
 * un oubli côté validateur se serait soldé par un refus 400 sans rapport apparent
 * avec l'écran qui l'a provoqué.
 */
export const NAV_LOCATIONS = ['header', 'footer', 'legal'] as const;

export type NavLocation = (typeof NAV_LOCATIONS)[number];

/** Intitulés d'écran, côté administration comme dans les messages d'erreur. */
export const NAV_LOCATION_LABELS: Record<NavLocation, string> = {
  header: 'En-tête',
  footer: 'Pied de page',
  legal: 'Barre légale'
};
