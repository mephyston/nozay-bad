import type { BlockPayload, BlockType } from '../../../shared/blocks';

/**
 * Catalogue des blocs pour l'éditeur.
 *
 * Il porte le libellé, l'explication et la charge utile de départ de chaque type.
 * Séparer cette table des composants permet au sélecteur « ajouter un bloc » de rester
 * une simple boucle, et met les valeurs par défaut à un seul endroit.
 */

export interface BlockKind {
  type: BlockType;
  label: string;
  /** Ce que le bloc sert à faire, en une phrase, pour un bénévole non technicien. */
  hint: string;
  create: () => BlockPayload;
}

export const BLOCK_KINDS: BlockKind[] = [
  {
    type: 'richtext',
    label: 'Texte',
    hint: 'Paragraphes, titres, listes, tableaux et liens.',
    create: () => ({ type: 'richtext', html: '<p></p>' })
  },
  {
    type: 'columns',
    label: 'Colonnes',
    hint: 'Deux ou trois contenus côte à côte, empilés sur téléphone.',
    create: () => ({ type: 'columns', items: [{ html: '<p></p>' }, { html: '<p></p>' }] })
  },
  {
    type: 'hero',
    label: 'Accroche',
    hint: "Grand titre en tête de page, avec jusqu'à quatre boutons.",
    create: () => ({ type: 'hero', title: '', ctas: [] })
  },
  {
    type: 'cta_grid',
    label: 'Grille de liens',
    hint: 'Boutons ou logos en colonnes — partenaires, raccourcis.',
    create: () => ({ type: 'cta_grid', columns: 3, items: [] })
  },
  {
    type: 'carousel',
    label: 'Carrousel',
    hint: 'Bandeau pleine largeur : les images se succèdent, texte et bouton devant.',
    create: () => ({ type: 'carousel', slides: [] })
  },
  {
    type: 'gallery',
    label: 'Galerie',
    hint: 'Plusieurs images de la médiathèque, en grille.',
    create: () => ({ type: 'gallery', mediaIds: [], layout: 'grid' })
  },
  {
    type: 'pdf_link',
    label: 'Document',
    hint: 'Lien de téléchargement vers un PDF de la médiathèque.',
    create: () => ({ type: 'pdf_link', mediaId: 0, label: '' })
  },
  {
    type: 'embed',
    label: 'Intégration',
    hint: 'Vidéo YouTube, agenda ou feuille de calcul Google.',
    create: () => ({ type: 'embed', provider: 'youtube', resourceId: '', title: '', aspect: '16/9' })
  },
  {
    type: 'person_cards',
    label: 'Personnes',
    hint: 'Cartes de contact — bureau, commissions, encadrants.',
    create: () => ({ type: 'person_cards', people: [] })
  },
  {
    type: 'events',
    label: 'Agenda',
    hint: 'Les prochains rendez-vous du club, mis à jour tout seuls.',
    create: () => ({ type: 'events', limit: 6, categories: [], showArchiveLink: true })
  },
  {
    type: 'posts_feed',
    label: 'Actualités',
    hint: 'Les dernières actualités du site, en cartes.',
    create: () => ({ type: 'posts_feed', limit: 6, showImages: true, showArchiveLink: true })
  },
  {
    type: 'schedule',
    label: 'Créneaux',
    hint: 'Tableau des créneaux, tenu à jour depuis la rubrique dédiée.',
    create: () => ({ type: 'schedule', audiences: [] })
  }
];

export function labelOf(type: BlockType): string {
  return BLOCK_KINDS.find((kind) => kind.type === type)?.label ?? type;
}
