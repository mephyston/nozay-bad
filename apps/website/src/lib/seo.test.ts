import { describe, it, expect } from 'vitest';
import { pageTitle, homeTitle, pageDescription, absoluteUrl, SITE_NAME, SITE_REGION } from './seo';
import { readFile } from 'node:fs/promises';
import {
  serialiseJsonLd,
  sportsClub,
  clubOpeningHours,
  webSite,
  breadcrumbList,
  clubEvent,
  eventDate,
  matchVenue,
  place
} from './jsonld';
import { socialLinks } from './social';
import { SITE_SETTINGS_FALLBACK } from './cms';
import { applySecurityHeaders } from './security-headers';
import type { BlockPayload } from '@nba/cms/public';

describe('pageTitle', () => {
  it('suffixe du nom du club quand la place le permet', () => {
    expect(pageTitle(null, 'Présentation')).toBe(`Présentation — ${SITE_NAME}`);
  });

  it('abandonne le suffixe plutôt que de le tronquer au milieu', () => {
    const long = 'Ecole Française de Badminton et dispositif jeunes du club';
    const out = pageTitle(null, long);
    expect(out.length).toBeLessThanOrEqual(60);
    expect(out).not.toContain('Nozay Badminton Associ—');
  });

  it('respecte un titre de référencement saisi', () => {
    expect(pageTitle('Créneaux 2026', 'Créneaux')).toBe('Créneaux 2026');
  });
});

describe('homeTitle', () => {
  /*
    Deux communes s'appellent Nozay, chacune avec son club de badminton. Le titre de
    l'accueil est la ligne que lit un habitant de Loire-Atlantique dans ses résultats :
    c'est là que le département doit apparaître, et en toutes lettres — pas « 91 ».
  */
  it('situe le club en Essonne, en toutes lettres et sous la limite de Google', () => {
    const out = homeTitle(null);
    expect(out).toContain(SITE_NAME);
    expect(out).toContain(SITE_REGION);
    expect(out.length).toBeLessThanOrEqual(60);
  });

  it('respecte un titre de référencement saisi', () => {
    expect(homeTitle('Accueil du club')).toBe('Accueil du club');
  });
});

describe('pageDescription', () => {
  const richtext = (html: string): BlockPayload => ({ type: 'richtext', html });

  it('se rabat sur le premier texte de la page', () => {
    // L'ancien site n'avait aucune meta description : ne rien émettre laisserait
    // Google fabriquer son extrait, souvent à partir du menu.
    const out = pageDescription(null, [richtext('<p>Le club de Nozay a été créé en 1996.</p>')]);
    expect(out).toBe('Le club de Nozay a été créé en 1996.');
  });

  it('ignore un bloc vide et prend le suivant', () => {
    const out = pageDescription(null, [richtext('<p> </p>'), richtext('<p>Contenu réel.</p>')]);
    expect(out).toBe('Contenu réel.');
  });

  it('tronque sur un mot entier', () => {
    const out = pageDescription(null, [richtext(`<p>${'mot '.repeat(80)}</p>`)]);
    expect(out.length).toBeLessThanOrEqual(155);
    expect(out.endsWith('…')).toBe(true);
  });

  it('a toujours un repli, même sans contenu, et ce repli situe le club', () => {
    expect(pageDescription(null, [])).toContain(SITE_REGION);
  });
});

describe('absoluteUrl', () => {
  it('produit une URL absolue, seule forme acceptée en canonique', () => {
    expect(absoluteUrl('https://nozaybad.fr', '/presentation/')).toBe('https://nozaybad.fr/presentation/');
  });
});

describe('JSON-LD', () => {
  it('échappe < pour qu’un titre ne puisse pas refermer la balise script', () => {
    const out = serialiseJsonLd({ name: '</script><img onerror=alert(1)>' });
    expect(out).not.toContain('</script>');
    expect(out).toContain('\\u003c');
  });

  it('ancre le club sur un identifiant stable', () => {
    expect(sportsClub('https://nozaybad.fr', [])['@id']).toBe('https://nozaybad.fr/#club');
  });

  it('déclare les comptes du club en sameAs', () => {
    // Le pied de page et le balisage lisent la même liste : ajouter un réseau à l'un
    // sans l'autre est l'oubli que ce cas rend impossible.
    const links = socialLinks(SITE_SETTINGS_FALLBACK);
    expect(links.length).toBeGreaterThan(0);
    expect(sportsClub('https://nozaybad.fr', links.map((l) => l.href)).sameAs).toEqual(
      links.map((l) => l.href)
    );
  });

  it('rattache le site au club par le même identifiant', () => {
    // Les deux nœuds sont émis côte à côte sur l'accueil. Si `publisher` cessait de
    // viser l'ancre du club, Google verrait deux entités sans lien là où il doit en
    // voir une seule — exactement ce que le balisage est là pour éviter.
    expect(webSite('https://nozaybad.fr').publisher['@id']).toBe(
      sportsClub('https://nozaybad.fr', [])['@id']
    );
  });

  it('donne un logo d’au moins 112 px, seuil en deçà duquel Google l’écarte', async () => {
    const { logo } = sportsClub('https://nozaybad.fr', []);
    // Le petit `logo.webp` fait 108 px : la seule relecture ne distingue pas les deux
    // fichiers, la mesure si.
    const file = new URL(logo).pathname;
    const bytes = await readFile(new URL(`../../public${file}`, import.meta.url));
    // Les deux logos sont des WebP étendus (`VP8X`), seul format où les dimensions du
    // canevas se lisent directement : largeur et hauteur moins un, sur 24 bits, aux
    // octets 24 et 27. Le format est vérifié plutôt que supposé — la lecture d'un
    // `VP8 ` simple au même endroit rend un nombre arbitraire, qui passerait le seuil
    // sans rien mesurer.
    expect(bytes.subarray(12, 16).toString('latin1')).toBe('VP8X');
    expect(1 + bytes.readUIntLE(24, 3)).toBeGreaterThanOrEqual(112);
  });

  it('situe le club en Essonne, ce que le code postal seul ne dit pas à un moteur', () => {
    const club = sportsClub('https://nozaybad.fr', []);
    expect(club.address.addressRegion).toBe('Essonne');
    expect(club.address.postalCode).toBe('91620');
    expect(club.areaServed.name).toBe('Essonne');
  });

  it('ne retient en alternateName que des formes réellement employées', () => {
    // « NBA » seul serait noyé par la ligue de basket, et ne distinguerait pas plus
    // les deux Nozay.
    expect(sportsClub('https://nozaybad.fr', []).alternateName).not.toContain('NBA');
  });

  it('liste les gymnases avec leur adresse, et leurs coordonnées quand elles existent', () => {
    const club = sportsClub('https://nozaybad.fr', [], { venues: [DUPUIS, HALLE] });
    expect(club.location).toHaveLength(2);
    expect(club.location?.[0]).toMatchObject({
      '@type': 'Place',
      name: 'Gymnase Pierre Dupuis',
      address: { streetAddress: '1 rue du Petit Gobert', postalCode: '91620', addressLocality: 'Nozay', addressRegion: 'Essonne' },
      geo: { '@type': 'GeoCoordinates', latitude: '48.66', longitude: '2.24' }
    });
    // Coordonnées manquantes : pas de `geo` du tout, plutôt qu'un point à moitié vide
    // que le validateur refuserait.
    expect(club.location?.[1]).not.toHaveProperty('geo');
  });

  it('tait la liste des lieux quand il n’y en a pas, plutôt que d’émettre un tableau vide', () => {
    expect(sportsClub('https://nozaybad.fr', [])).not.toHaveProperty('location');
    expect(sportsClub('https://nozaybad.fr', [])).not.toHaveProperty('openingHoursSpecification');
  });

  it('rattache les horaires au même club, par le même identifiant', () => {
    // La page « Créneaux » émettait un second `SportsClub` sans `@id` ni adresse : un
    // club de plus, anonyme, à confondre avec l'homonyme de Loire-Atlantique.
    const hours = clubOpeningHours('https://nozaybad.fr', [{ weekday: 1, startTime: '20:00', endTime: '22:00' }]);
    expect(hours['@id']).toBe(sportsClub('https://nozaybad.fr', [])['@id']);
    expect(hours.openingHoursSpecification[0].dayOfWeek).toBe('https://schema.org/Monday');
  });

  it('numérote le fil d’Ariane à partir de 1', () => {
    const crumbs = breadcrumbList('https://nozaybad.fr', [
      { name: 'Accueil', path: '/' },
      { name: 'Présentation', path: '/presentation/' }
    ]);
    expect(crumbs.itemListElement[0].position).toBe(1);
    expect(crumbs.itemListElement[1].item).toBe('https://nozaybad.fr/presentation/');
  });
});

describe('comptes sociaux', () => {
  it('ignore un réseau non renseigné plutôt que de produire un lien mort', () => {
    const links = socialLinks({ ...SITE_SETTINGS_FALLBACK, instagramUrl: null, facebookUrl: '  ' });
    expect(links).toEqual([]);
  });

  it('conserve l’ordre d’affichage, indépendant de l’ordre des réglages', () => {
    expect(socialLinks(SITE_SETTINGS_FALLBACK).map((l) => l.name)).toEqual(['Instagram', 'Facebook']);
  });

  it('ne retient que des URL de profil canoniques dans les valeurs de repli', () => {
    // `?locale=fr_FR` traîne sur toute page Facebook copiée depuis un navigateur :
    // c'est un réglage d'affichage, et il n'affirme aucune identité.
    for (const { href } of socialLinks(SITE_SETTINGS_FALLBACK)) {
      const url = new URL(href);
      expect(url.protocol).toBe('https:');
      expect(url.search).toBe('');
    }
  });
});

describe('en-têtes de sécurité', () => {
  it('applique la CSP au lieu de seulement la rapporter', () => {
    const headers = applySecurityHeaders(new Response('ok')).headers;
    expect(headers.get('Content-Security-Policy')).toContain("default-src 'self'");
    expect(headers.get('Content-Security-Policy-Report-Only')).toBeNull();
  });

  it('interdit toute image distante', () => {
    const csp = applySecurityHeaders(new Response('ok')).headers.get('Content-Security-Policy') ?? '';
    expect(csp).toContain("img-src 'self' data:");
  });

  it('n’autorise en cadre que les fournisseurs du bloc embed', () => {
    const csp = applySecurityHeaders(new Response('ok')).headers.get('Content-Security-Policy') ?? '';
    expect(csp).toContain('youtube-nocookie.com');
    expect(csp).toContain("frame-ancestors 'none'");
  });

  it('marque la préproduction hors index', () => {
    const headers = applySecurityHeaders(new Response('ok'), { noindex: true }).headers;
    expect(headers.get('X-Robots-Tag')).toBe('noindex, nofollow');
  });
});

const DUPUIS = {
  name: 'Gymnase Pierre Dupuis',
  streetAddress: '1 rue du Petit Gobert',
  postalCode: '91620',
  city: 'Nozay',
  latitude: '48.66',
  longitude: '2.24'
};
const HALLE = { name: 'Halle des Sports', streetAddress: null, postalCode: null, city: null, latitude: null, longitude: null };

describe('matchVenue', () => {
  it('reconnaît un gymnase par son nom, en entier ou en partie', () => {
    expect(matchVenue([DUPUIS, HALLE], 'Gymnase Pierre Dupuis')).toBe(DUPUIS);
    expect(matchVenue([DUPUIS, HALLE], '  pierre DUPUIS ')).toBe(DUPUIS);
    expect(matchVenue([DUPUIS, HALLE], 'Halle des sports')).toBe(HALLE);
    // La forme que porte l'agenda : le nom suivi de la commune.
    expect(matchVenue([DUPUIS, HALLE], 'Gymnase Pierre Dupuis, Nozay')).toBe(DUPUIS);
    expect(matchVenue([DUPUIS, HALLE], 'Halle des Sports (Nozay)')).toBe(HALLE);
  });

  it('ne devine rien pour un lieu qui n’est pas un gymnase du club', () => {
    // Un match à l'extérieur ne doit pas hériter d'une adresse à Nozay.
    expect(matchVenue([DUPUIS, HALLE], 'Gymnase de Marcoussis')).toBeNull();
    expect(matchVenue([DUPUIS, HALLE], 'Halle des Sports de Marcoussis')).toBeNull();
    expect(matchVenue([DUPUIS, HALLE], null)).toBeNull();
    expect(matchVenue([DUPUIS, HALLE], 'de')).toBeNull();
  });
});

describe('place', () => {
  it('retombe sur la commune du siège quand le gymnase n’en porte pas', () => {
    expect(place(HALLE).address).toMatchObject({ addressLocality: 'Nozay', postalCode: '91620', addressRegion: 'Essonne' });
    expect(place(HALLE).address).not.toHaveProperty('streetAddress');
  });
});

describe('clubEvent', () => {
  const base = {
    title: 'Raclette party',
    category: 'vie_du_club',
    startsAt: '2026-10-23T19:30',
    endsAt: null,
    allDay: false,
    venueLabel: 'Arthur Rimbaud',
    status: 'published',
    url: '/agenda/'
  };

  it('choisit le type schema.org selon la catégorie', () => {
    expect(clubEvent('https://x.fr', base)['@type']).toBe('SocialEvent');
    expect(clubEvent('https://x.fr', { ...base, category: 'interclubs' })['@type']).toBe('SportsEvent');
    expect(clubEvent('https://x.fr', { ...base, category: 'assemblee' })['@type']).toBe('BusinessEvent');
    // Une catégorie ajoutée en base sans passer par ici reste un événement valide.
    expect(clubEvent('https://x.fr', { ...base, category: 'inconnue' })['@type']).toBe('Event');
  });

  it('date le rendez-vous dans le fuseau de Paris, heure d’été comprise', () => {
    expect(eventDate('2026-10-23T19:30', false)).toBe('2026-10-23T19:30:00+02:00');
    expect(eventDate('2026-12-12T19:30', false)).toBe('2026-12-12T19:30:00+01:00');
  });

  it('rend une journée entière en date seule, sans heure de minuit', () => {
    expect(eventDate('2026-09-05T00:00', true)).toBe('2026-09-05');
  });

  /*
    La description saisie en administration n'est affichée nulle part sur le site :
    l'émettre reviendrait à baliser un contenu que le lecteur ne voit pas. Ce test est
    le garde-fou de cette décision — la rebrancher demande d'abord de l'afficher.
  */
  it('n’émet jamais de description, ni d’offre', () => {
    const json = clubEvent('https://x.fr', base);
    expect(json).not.toHaveProperty('description');
    expect(json).not.toHaveProperty('offers');
  });

  it('tait ce que le rendez-vous n’a pas, plutôt que de l’inventer', () => {
    const json = clubEvent('https://x.fr', base);
    expect(json).not.toHaveProperty('image');
    expect(json).not.toHaveProperty('endDate');
    expect(json).not.toHaveProperty('performer');
  });

  it('situe un rendez-vous dans un gymnase du club, et seulement là', () => {
    // `location` est conditionnel dans le type de retour : on interroge l'objet entier.
    const home = clubEvent('https://x.fr', { ...base, venueLabel: 'Pierre Dupuis', venue: DUPUIS });
    expect(home).toMatchObject({ location: { name: 'Gymnase Pierre Dupuis', address: { addressRegion: 'Essonne' } } });
    expect(home).toHaveProperty('location.geo');
    // Sans gymnase reconnu, le lieu reste un nom et un pays : c'est peut-être la salle
    // d'un club adverse, et une adresse à Nozay serait fausse.
    const away = clubEvent('https://x.fr', { ...base, venueLabel: 'Gymnase de Marcoussis' });
    expect(away).toHaveProperty('location', {
      '@type': 'Place',
      name: 'Gymnase de Marcoussis',
      address: { '@type': 'PostalAddress', addressCountry: 'FR' }
    });
  });

  it('rend l’adresse de la page qui décrit, en absolu', () => {
    expect(clubEvent('https://x.fr', { ...base, url: '/actualites/raclette/' }).url).toBe(
      'https://x.fr/actualites/raclette/'
    );
  });
});
