import type { SiteSettingsView } from '../get-site-settings/dto';

export interface SaveSiteSettingsInput {
  footerDescription: string;
  footerAddress: string;
  /** Chaîne vide ou nulle : le réseau cesse d'être affiché. */
  instagramUrl?: string | null;
  facebookUrl?: string | null;
  /** Adresse de l'utilisateur, pour la traçabilité de la dernière modification. */
  actorEmail: string;
}

export type SaveSiteSettingsOutput = SiteSettingsView;
