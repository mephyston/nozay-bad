import { richTextToPlain, CMS_PROFILE } from '@nba/html';
import type { BlockPayload } from '@nba/cms/public';

/**
 * Métadonnées de référencement.
 *
 * L'ancien site n'avait **aucune** meta description, aucune balise Open Graph et
 * aucune donnée structurée. C'est le gain le plus direct de la refonte, donc rien
 * n'est laissé optionnel : chaque page sort d'ici avec un titre, une description et
 * une image de partage, même si le rédacteur n'a rien saisi.
 */

/**
 * Ce que le référencement dit du club : son nom, son slogan, où il est.
 *
 * Tout vient de la configuration du club (`club_settings`), lue par le middleware.
 * La région en toutes lettres compte : deux communes peuvent porter le même nom — deux
 * « Nozay », et l'autre a aussi son club de badminton — et un code postal seul ne
 * parle qu'à qui connaît déjà la réponse. « Nozay, Essonne (91) » situe avant de nommer.
 */
export interface SiteIdentity {
  name: string;
  shortName: string;
  tagline: string;
  city: string;
  postalCode: string;
  region: string;
  /** « Nozay, Essonne (91) » — ville, région et numéro de département. */
  locality: string;
  /** Fuseau du club, pour dater ses événements avec le bon décalage. */
  timezone: string;
}

export function siteIdentityOf(club: { settings: { name: string; shortName: string; tagline: string; city: string; postalCode: string; region: string; department: string; timezone?: string } } | undefined): SiteIdentity {
  const s = club?.settings;
  const city = s?.city ?? '';
  const region = s?.region ?? '';
  const department = s?.department ?? '';
  return {
    name: s?.name ?? '',
    shortName: s?.shortName ?? '',
    tagline: s?.tagline ?? '',
    city,
    postalCode: s?.postalCode ?? '',
    region,
    locality: [city, region ? `${region}${department ? ` (${department})` : ''}` : ''].filter(Boolean).join(', '),
    timezone: s?.timezone || 'Europe/Paris'
  };
}

/** Google tronque au-delà ; couper nous-mêmes évite une ellipse au milieu d'un mot. */
const TITLE_MAX = 60;
const DESCRIPTION_MAX = 155;

function truncate(text: string, max: number): string {
  const clean = text.replace(/\s+/g, ' ').trim();
  if (clean.length <= max) return clean;
  const cut = clean.slice(0, max - 1);
  const lastSpace = cut.lastIndexOf(' ');
  return `${(lastSpace > max / 2 ? cut.slice(0, lastSpace) : cut).trimEnd()}…`;
}

export function pageTitle(seoTitle: string | null, title: string, site: SiteIdentity): string {
  if (seoTitle) return truncate(seoTitle, TITLE_MAX);
  // Le nom du club n'est ajouté que s'il reste de la place : un titre tronqué au
  // milieu du suffixe est pire que pas de suffixe du tout.
  const suffixed = site.name ? `${title} — ${site.name}` : title;
  return suffixed.length <= TITLE_MAX ? suffixed : truncate(title, TITLE_MAX);
}

/**
 * Titre de la page d'accueil, à défaut d'un titre de référencement saisi.
 *
 * Le titre éditorial de l'accueil est « Bienvenue » : suffixé du nom du club, il ne dit
 * ni ce que fait le club ni où. C'est pourtant le titre le plus lu du site — celui du
 * résultat de recherche sur « nozay badminton ». La forme fixe tient sous `TITLE_MAX`
 * avec le nom complet, le sport et le département.
 */
export function homeTitle(seoTitle: string | null, site: SiteIdentity): string {
  if (seoTitle) return truncate(seoTitle, TITLE_MAX);
  const where = site.city ? ` à ${site.city}${site.region ? ` (${site.region})` : ''}` : '';
  return truncate(`${site.name} — Badminton${where}`, TITLE_MAX);
}

/**
 * Description, en cascade : la saisie du rédacteur, sinon le premier texte de la page.
 *
 * Se rabattre sur le contenu vaut mieux que de ne rien émettre — Google fabrique
 * alors son propre extrait, souvent à partir du menu.
 */
export function pageDescription(seoDescription: string | null, blocks: BlockPayload[], site: SiteIdentity): string {
  if (seoDescription) return truncate(seoDescription, DESCRIPTION_MAX);

  for (const block of blocks) {
    if (block.type === 'richtext') {
      const plain = richTextToPlain(block.html, DESCRIPTION_MAX, CMS_PROFILE);
      if (plain) return plain;
    }
    if (block.type === 'hero' && block.subtitle) return truncate(block.subtitle, DESCRIPTION_MAX);
  }
  // Le repli situe le club avant de le nommer : la description est le second texte du
  // résultat de recherche, et c'est là qu'un lecteur du 44 voit qu'il n'est pas chez lui.
  return `Club de badminton${site.locality ? ` à ${site.locality}` : ''}.${site.tagline ? ` ${site.tagline}` : ''}`;
}

/** URL absolue, seule forme acceptée en canonique et en Open Graph. */
export function absoluteUrl(siteUrl: string, path: string): string {
  return new URL(path, siteUrl).toString();
}
