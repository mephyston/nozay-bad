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

/**
 * Où est le club, en toutes lettres.
 *
 * Deux communes s'appellent Nozay, et l'autre — en Loire-Atlantique — a aussi son club
 * de badminton. Le site sort en tête sur « nozay badminton » quel que soit le lieu de
 * la recherche, et des habitants du 44 nous écrivent en croyant s'adresser à leur club.
 * Le mot « Essonne » n'apparaissait nulle part : « 91620 » et « (91) » ne parlent
 * qu'à qui connaît déjà la réponse.
 *
 * Constantes pour ce que le rédacteur ne voit pas — titre d'accueil par défaut, replis
 * de description, données structurées. Le pied de page, lui, se règle depuis
 * l'administration (phrase de présentation et adresse) : c'est le choix de David, ces
 * champs existent pour ça.
 */
export const SITE_REGION = 'Essonne';
export const SITE_LOCALITY = 'Nozay, Essonne (91)';

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
 * Titre de la page d'accueil, à défaut d'un titre de référencement saisi.
 *
 * Le titre éditorial de l'accueil est « Bienvenue » : suffixé du nom du club, il ne dit
 * ni ce que fait le club ni où. C'est pourtant le titre le plus lu du site — celui du
 * résultat de recherche sur « nozay badminton ». La forme fixe tient sous `TITLE_MAX`
 * avec le nom complet, le sport et le département.
 */
export function homeTitle(seoTitle: string | null): string {
  if (seoTitle) return truncate(seoTitle, TITLE_MAX);
  return `${SITE_NAME} — Badminton à Nozay (${SITE_REGION})`;
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
  // Le repli situe le club avant de le nommer : la description est le second texte du
  // résultat de recherche, et c'est là qu'un lecteur du 44 voit qu'il n'est pas chez lui.
  return `Club de badminton à ${SITE_LOCALITY}. ${SITE_TAGLINE}`;
}

/** URL absolue, seule forme acceptée en canonique et en Open Graph. */
export function absoluteUrl(siteUrl: string, path: string): string {
  return new URL(path, siteUrl).toString();
}
