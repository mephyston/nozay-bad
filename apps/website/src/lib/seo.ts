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

export const SITE_NAME = 'Nozay Badminton Association';
export const SITE_TAGLINE = "Plus qu'une Tribu !";

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

export function pageTitle(seoTitle: string | null, title: string): string {
  if (seoTitle) return truncate(seoTitle, TITLE_MAX);
  // Le nom du club n'est ajouté que s'il reste de la place : un titre tronqué au
  // milieu du suffixe est pire que pas de suffixe du tout.
  const suffixed = `${title} — ${SITE_NAME}`;
  return suffixed.length <= TITLE_MAX ? suffixed : truncate(title, TITLE_MAX);
}

/**
 * Description, en cascade : la saisie du rédacteur, sinon le premier texte de la page.
 *
 * Se rabattre sur le contenu vaut mieux que de ne rien émettre — Google fabrique
 * alors son propre extrait, souvent à partir du menu.
 */
export function pageDescription(seoDescription: string | null, blocks: BlockPayload[]): string {
  if (seoDescription) return truncate(seoDescription, DESCRIPTION_MAX);

  for (const block of blocks) {
    if (block.type === 'richtext') {
      const plain = richTextToPlain(block.html, DESCRIPTION_MAX, CMS_PROFILE);
      if (plain) return plain;
    }
    if (block.type === 'hero' && block.subtitle) return truncate(block.subtitle, DESCRIPTION_MAX);
  }
  return `${SITE_NAME} — ${SITE_TAGLINE}`;
}

/** URL absolue, seule forme acceptée en canonique et en Open Graph. */
export function absoluteUrl(siteUrl: string, path: string): string {
  return new URL(path, siteUrl).toString();
}
