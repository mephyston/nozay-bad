import type { SiteSettingsView } from './cms';

/**
 * Comptes officiels du club, dérivés des réglages du site.
 *
 * Les URL vivent en base (écran « Pied de page » de l'administration) ; ce qui reste
 * ici est ce qui n'a pas à être saisi : l'ordre d'affichage, le nom du réseau et son
 * icône. Un réseau non renseigné disparaît — du pied de page **et** du balisage.
 *
 * Une seule liste pour deux usages : les liens du pied de page, et le `sameAs` des
 * données structurées — celui qui dit à Google que ce site, ce compte Instagram et
 * cette page Facebook sont la même entité. Les tenir séparés reviendrait à ajouter un
 * réseau d'un côté en laissant le balisage derrière, sans que rien ne le signale.
 */
export interface SocialLink {
  /** Nom du réseau, tel qu'annoncé aux lecteurs d'écran. */
  name: string;
  href: string;
}

/** Ordre d'affichage, et champ de réglage correspondant. */
const NETWORKS = [
  { name: 'Instagram', field: 'instagramUrl' },
  { name: 'Facebook', field: 'facebookUrl' }
] as const satisfies readonly { name: string; field: keyof SiteSettingsView }[];

export function socialLinks(settings: SiteSettingsView): SocialLink[] {
  const links: SocialLink[] = [];
  for (const network of NETWORKS) {
    const href = settings[network.field];
    // `null` **et** chaîne vide : l'API range `null`, mais un réglage venu d'ailleurs
    // ne doit pas produire un lien vers la page courante.
    if (typeof href === 'string' && href.trim() !== '') links.push({ name: network.name, href });
  }
  return links;
}
