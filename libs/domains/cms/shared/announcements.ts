/**
 * L'actualité qui annonce un rendez-vous de l'agenda.
 *
 * Le rattachement est porté par l'actualité (`cms_posts.event_id`), et volontairement
 * sans clé étrangère : le CMS n'a pas à dépendre du domaine `events` pour stocker un
 * numéro. Il se lit donc dans l'autre sens — de l'agenda vers l'article — au moment du
 * rendu, par l'écran qui affiche les deux.
 *
 * D'où cette fonction plutôt qu'une jointure : chaque application compose l'adresse
 * qui lui est propre — le site public a une page par article, l'espace adhérent une
 * ancre dans sa liste — pour une même règle de rapprochement.
 */
export interface EventAnnouncement {
  /** Adresse de l'article, telle que l'application qui affiche sait la composer. */
  href: string;
  title: string;
}

interface AnnouncingPost {
  title: string;
  eventId?: number | null;
}

/**
 * Index « événement → actualité qui l'annonce ».
 *
 * Les listes d'actualités arrivent de la plus récente à la plus ancienne : quand deux
 * articles annoncent le même rendez-vous — une annonce puis un rappel —, c'est donc le
 * plus récent qui gagne, et non le dernier rencontré.
 *
 * Ne rapproche que ce qui lui est donné : un rendez-vous annoncé par un article absent
 * de la liste ne reçoit pas de lien. C'est un raccourci vers l'article, jamais le seul
 * chemin qui y mène.
 */
export function announcementsByEvent<T extends AnnouncingPost>(
  posts: readonly T[],
  hrefOf: (post: T) => string
): Map<number, EventAnnouncement> {
  const index = new Map<number, EventAnnouncement>();
  for (const post of posts) {
    const eventId = post.eventId;
    if (typeof eventId !== 'number' || !Number.isSafeInteger(eventId) || eventId < 1) continue;
    if (index.has(eventId)) continue;
    index.set(eventId, { href: hrefOf(post), title: post.title });
  }
  return index;
}
