/**
 * Réglages du site, tels que servis.
 *
 * Aucun champ optionnel : le site public rend ces valeurs à chaque page, et un
 * `undefined` s'y traduirait par un trou dans le pied de page. Le handler comble donc
 * l'absence de ligne par les valeurs par défaut, plutôt que de renvoyer `null`.
 */
export interface SiteSettingsView {
  footerDescription: string;
  footerAddress: string;
  /** Nul = réseau non renseigné, donc non affiché. Jamais une chaîne vide. */
  instagramUrl: string | null;
  facebookUrl: string | null;
}

export type GetSiteSettingsOutput = SiteSettingsView;
