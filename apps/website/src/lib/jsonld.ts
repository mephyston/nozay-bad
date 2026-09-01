import { SITE_NAME } from './seo';

/**
 * Données structurées.
 *
 * L'ancien site n'en émettait aucune : ni `SportsClub`, ni `Event`, ni fil d'Ariane.
 * C'est ce qui prive aujourd'hui le club des résultats enrichis alors qu'il a
 * exactement le profil pour en bénéficier — une association sportive locale, avec des
 * lieux, des horaires et des événements.
 */

/** Ancre stable du club, réutilisée par `organizer` et `publisher` ailleurs. */
export function clubId(siteUrl: string): string {
  return new URL('/#club', siteUrl).toString();
}

/**
 * @param sameAs Comptes officiels du club, tels que réglés dans l'administration.
 *   Rattache ces comptes à cette fiche : sans `sameAs`, la page Facebook et le site
 *   restent deux entités sans lien pour un moteur, et c'est souvent le réseau qui
 *   l'emporte dans les résultats sur le nom du club. Le paramètre est **requis** — un
 *   défaut à `[]` aurait rendu l'oubli silencieux, et l'oubli est ici invisible à la
 *   relecture comme au rendu.
 */
export function sportsClub(siteUrl: string, sameAs: readonly string[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'SportsClub',
    '@id': clubId(siteUrl),
    name: SITE_NAME,
    sport: 'Badminton',
    url: siteUrl,
    // `logo-large.webp` et non `logo.webp` : Google écarte un logo sous 112 px, et le
    // petit fait 108. L'écart est invisible à l'œil et disqualifiant à la lecture.
    logo: new URL('/logo-large.webp', siteUrl).toString(),
    sameAs: [...sameAs],
    address: {
      '@type': 'PostalAddress',
      addressLocality: 'Nozay',
      postalCode: '91620',
      addressCountry: 'FR'
    }
  };
}

/**
 * Le site lui-même, distinct du club qui l'édite.
 *
 * C'est de ce nœud que Google tire le **nom de site** affiché au-dessus du résultat.
 * Faute de le trouver, il le déduit du `<title>` — ce qu'il fait aujourd'hui, et qui
 * marche par chance : la refonte change tout le balisage de la page d'un coup, et
 * c'est précisément le moment où une déduction peut basculer sur autre chose.
 *
 * `alternateName` couvre le sigle, absent du `<title>`. « NBA 91 » et non « NBA » :
 * c'est la forme que le club écrit lui-même — README, titres des pages de l'espace
 * adhérent, domaine Cloudflare Access `nba91` — et c'est aussi la seule des deux qui
 * serve à quelque chose. « NBA » seul est noyé par la ligue de basket, et ne
 * distinguerait pas non plus Nozay (91) de son homonyme de Loire-Atlantique.
 *
 * Ce champ nomme, il ne référence pas : n'y mettre qu'une forme réellement employée.
 */
export function webSite(siteUrl: string) {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': new URL('/#site', siteUrl).toString(),
    name: SITE_NAME,
    alternateName: 'NBA 91',
    url: siteUrl,
    inLanguage: 'fr-FR',
    publisher: { '@id': clubId(siteUrl) }
  };
}

export function breadcrumbList(siteUrl: string, trail: { name: string; path: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: trail.map((step, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: step.name,
      item: new URL(step.path, siteUrl).toString()
    }))
  };
}

export function webPage(siteUrl: string, params: { title: string; description: string; path: string }) {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: params.title,
    description: params.description,
    url: new URL(params.path, siteUrl).toString(),
    isPartOf: { '@id': clubId(siteUrl) }
  };
}

/**
 * Sérialisation sûre pour un `<script type="application/ld+json">`.
 *
 * `<` est échappé : une chaîne contenant `</script>` — un titre de page y suffit —
 * refermerait la balise et injecterait le reste comme du balisage.
 */
export function serialiseJsonLd(value: unknown): string {
  return JSON.stringify(value).replace(/</g, '\\u003c');
}

export function article(
  siteUrl: string,
  params: {
    title: string;
    description: string;
    path: string;
    publishedAt: string | null;
    updatedAt: string | null;
    authorName: string;
    image?: string;
  }
) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: params.title,
    description: params.description,
    mainEntityOfPage: new URL(params.path, siteUrl).toString(),
    ...(params.publishedAt ? { datePublished: params.publishedAt } : {}),
    ...(params.updatedAt ? { dateModified: params.updatedAt } : {}),
    author: { '@type': 'Person', name: params.authorName },
    publisher: { '@id': clubId(siteUrl) },
    ...(params.image ? { image: params.image } : {})
  };
}

export function itemList(siteUrl: string, items: { name: string; path: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      url: new URL(item.path, siteUrl).toString()
    }))
  };
}

/**
 * Horaires d'ouverture dérivés des créneaux.
 *
 * C'est ce qui rend la page « Créneaux » lisible par une machine — ce que l'iframe
 * Google Sheets de l'ancien site n'a jamais été.
 */
const ISO_DAYS = ['', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export function openingHours(slots: { weekday: number; startTime: string; endTime: string }[]) {
  return slots.map((slot) => ({
    '@type': 'OpeningHoursSpecification',
    dayOfWeek: `https://schema.org/${ISO_DAYS[slot.weekday]}`,
    opens: slot.startTime,
    closes: slot.endTime
  }));
}

/**
 * Type schema.org d'un rendez-vous, par catégorie d'agenda.
 *
 * `SportsEvent` pour tout, c'était décrire une soirée raclette comme une rencontre
 * sportive. Google le lit littéralement : c'est ce qui lui fait réclamer un
 * `performer` — l'équipe qui joue — sur un forum des associations où personne ne joue.
 * Un type juste ne « corrige » pas un avertissement, il cesse de promettre ce que
 * l'événement n'est pas.
 */
const EVENT_TYPES: Record<string, string> = {
  competition: 'SportsEvent',
  interclubs: 'SportsEvent',
  tournoi: 'SportsEvent',
  stage: 'SportsEvent',
  vie_du_club: 'SocialEvent',
  assemblee: 'BusinessEvent'
};

/**
 * Décalage horaire de Paris à une date locale donnée, sous la forme « +02:00 ».
 *
 * L'agenda stocke des heures locales sans fuseau (« 2026-10-23T19:30 »). Émises
 * telles quelles, Google les rattache au fuseau du lieu — qu'il déduit d'une adresse
 * réduite ici au pays. Un rendez-vous de 19 h 30 peut donc s'afficher à 17 h 30 dans
 * un résultat de recherche, ce que personne ne verrait jamais en relisant la page.
 *
 * L'instant approché sert seulement à savoir de quel côté du changement d'heure on se
 * trouve : l'erreur possible se limite aux deux heures qui suivent la bascule d'un
 * dernier dimanche de mars ou d'octobre, à 2 h du matin.
 */
function parisOffset(local: string): string {
  const label = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/Paris',
    timeZoneName: 'longOffset'
  }).format(new Date(`${local.slice(0, 16)}:00Z`));
  return /GMT([+-]\d{2}:\d{2})/.exec(label)?.[1] ?? '+01:00';
}

/**
 * Date d'un rendez-vous, dans la forme que Google attend.
 *
 * Une journée entière sort en date seule : « 2026-09-05T00:00 » annoncerait un
 * rendez-vous à minuit, et c'est exactement ce qu'un moteur en ferait.
 */
export function eventDate(local: string, allDay: boolean): string {
  const day = local.slice(0, 10);
  if (allDay || local.length < 16) return day;
  return `${day}T${local.slice(11, 16)}:00${parisOffset(local)}`;
}

/**
 * Un rendez-vous de l'agenda.
 *
 * @param url Page qui parle du rendez-vous — l'actualité qui l'annonce quand il y en
 *   a une, la page qui porte l'agenda sinon. Requis : une adresse codée en dur ici
 *   survivrait au déplacement du bloc, et pointerait vers une page où le rendez-vous
 *   ne figure pas.
 * @param image Visuel du rendez-vous, en absolu — la couverture de cette actualité.
 *   Absent tant qu'aucun article n'annonce le rendez-vous : une image de repli
 *   identique sur tous ne dirait rien de celui qu'elle illustre.
 *
 * Pas de `description` ici, et c'est délibéré : celle que porte l'agenda n'est
 * affichée nulle part sur le site public. Google demande de ne baliser que ce qu'un
 * lecteur voit, et un texte présent dans le seul balisage est précisément ce qu'une
 * action manuelle sanctionne. Le jour où la carte l'affichera, elle aura sa place ici.
 *
 * Pas d'`offers` non plus : l'inscription à un rendez-vous se prend dans l'espace
 * adhérent, derrière l'authentification. Une offre pointant vers une page que
 * Googlebot ne peut pas atteindre ne vaut pas mieux que pas d'offre du tout.
 */
export function clubEvent(
  siteUrl: string,
  event: {
    title: string;
    category: string;
    startsAt: string;
    endsAt: string | null;
    allDay: boolean;
    venueLabel: string | null;
    status: string;
    url: string;
    image?: string | null;
  }
) {
  return {
    '@context': 'https://schema.org',
    '@type': EVENT_TYPES[event.category] ?? 'Event',
    name: event.title,
    startDate: eventDate(event.startsAt, event.allDay),
    ...(event.endsAt ? { endDate: eventDate(event.endsAt, event.allDay) } : {}),
    // La route ne sert que les événements publiés : un annulé n'arrive pas jusqu'ici.
    // La correspondance est conservée pour rester juste si cette règle change — c'est
    // le vocabulaire attendu par Google, pas une décision de ce fichier.
    eventStatus:
      event.status === 'cancelled' ? 'https://schema.org/EventCancelled' : 'https://schema.org/EventScheduled',
    eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
    ...(event.venueLabel
      ? { location: { '@type': 'Place', name: event.venueLabel, address: { '@type': 'PostalAddress', addressCountry: 'FR' } } }
      : {}),
    ...(event.image ? { image: event.image } : {}),
    organizer: { '@id': clubId(siteUrl) },
    url: new URL(event.url, siteUrl).toString()
  };
}
