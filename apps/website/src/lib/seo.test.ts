import { describe, it, expect } from 'vitest';
import { pageTitle, pageDescription, absoluteUrl, SITE_NAME } from './seo';
import { serialiseJsonLd, sportsClub, breadcrumbList } from './jsonld';
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

  it('a toujours un repli, même sans contenu', () => {
    expect(pageDescription(null, [])).toContain(SITE_NAME);
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
    expect(sportsClub('https://nozaybad.fr')['@id']).toBe('https://nozaybad.fr/#club');
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
