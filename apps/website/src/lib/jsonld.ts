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

export function sportsClub(siteUrl: string) {
  return {
    '@context': 'https://schema.org',
    '@type': 'SportsClub',
    '@id': clubId(siteUrl),
    name: SITE_NAME,
    sport: 'Badminton',
    url: siteUrl,
    address: {
      '@type': 'PostalAddress',
      addressLocality: 'Nozay',
      postalCode: '91620',
      addressCountry: 'FR'
    }
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
