/**
 * Une actualité réduite à ce qui rattache un rendez-vous à son article.
 *
 * L'espace adhérent affiche, sur chaque ligne d'agenda, un lien vers l'article qui
 * l'annonce. Il n'a besoin pour cela que du titre et de l'adresse — mais il lisait
 * jusqu'ici la liste complète des actualités, corps HTML, couvertures et déclinaisons
 * d'images comprises, pour en extraire trois champs.
 */
export interface AnnouncementPost {
  id: number;
  slug: string;
  path: string;
  title: string;
  eventId: number;
}

export interface ListAnnouncementsInput {
  /** `'public'` restreint aux actualités tout public ; absent, elles sortent toutes. */
  visibility?: 'public' | 'private';
  limit?: number;
}
