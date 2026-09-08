/**
 * En-têtes de sécurité HTTP, partagés par les trois applications.
 *
 * Chaque application portait sa copie de `applySecurityHeaders`, et les copies
 * avaient déjà divergé : CSP appliquée sur le site public, seulement observée
 * ailleurs, HSTS à deux durées différentes. Le mécanisme vit désormais ici ; les
 * applications ne déclarent plus que leur *politique* (directives CSP, cache par
 * défaut, Permissions-Policy), si bien qu'un durcissement futur s'applique partout
 * ou nulle part — plus jamais « partout sauf une ».
 */

export interface SecurityPolicy {
  /** Directives CSP, déjà jointes par `; `. */
  csp: string;
  /**
   * Poser la CSP en observation (`Content-Security-Policy-Report-Only`) plutôt
   * qu'en application. À réserver au calibrage d'une politique nouvelle : une CSP
   * observée ne bloque rien.
   */
  reportOnly?: boolean;
  /** Durée HSTS en secondes (avec `includeSubDomains; preload`). */
  hstsMaxAge: number;
  permissionsPolicy: string;
  /**
   * `Cache-Control` posé seulement si la réponse n'en porte pas déjà un — les
   * routes qui décident de leur cache (PDF, médias) gardent la main. Omis : aucun
   * en-tête de cache n'est posé.
   */
  defaultCacheControl?: string;
  /** Ajoute `X-Robots-Tag: noindex, nofollow` (pages d'aperçu, environnements de test). */
  noindex?: boolean;
}

/**
 * Renvoie la réponse elle-même si ses en-têtes sont modifiables, sinon une copie.
 *
 * Une réponse relayée telle quelle depuis un service binding a des en-têtes
 * **immuables** dans workerd : les muter lève `TypeError: Can't modify immutable
 * headers`, l'erreur remonte au middleware et Astro répond 500 au corps vide —
 * côté client, l'échec (« Unexpected end of JSON input ») masque une écriture qui a
 * pourtant bien eu lieu. Le corps est transmis tel quel, sans être bufferisé.
 */
export function withMutableHeaders(response: Response): Response {
  try {
    response.headers.set('x-headers-probe', '1');
    response.headers.delete('x-headers-probe');
    return response;
  } catch {
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: new Headers(response.headers)
    });
  }
}

/**
 * Un document (PDF) peut être encadré par l'application qui le sert, et par elle seule.
 *
 * Les pages interdisent tout encadrement (`frame-ancestors 'none'`, `X-Frame-Options:
 * DENY`) : c'est la parade au clickjacking. Posée aussi sur un PDF, l'interdiction
 * frappe l'aperçu intégré de l'attestation CSE, un `<iframe>` de même origine — Chrome y
 * affiche « Ce contenu est bloqué » à la place du document. Un PDF n'a ni formulaire ni
 * bouton à détourner : l'encadrer depuis sa propre origine ne présente aucun risque, et
 * c'est ce que fait l'aperçu.
 */
function frameAncestorsForDocument(csp: string): string {
  return csp.replace(/frame-ancestors [^;]+/, "frame-ancestors 'self'");
}

function isDocument(response: Response): boolean {
  return (response.headers.get('Content-Type') ?? '').split(';', 1)[0].trim() === 'application/pdf';
}

/** Applique la politique sur une réponse (idempotent). */
export function applySecurityHeaders(input: Response, policy: SecurityPolicy): Response {
  const response = withMutableHeaders(input);
  const h = response.headers;
  const document = isDocument(response);

  h.set(
    policy.reportOnly ? 'Content-Security-Policy-Report-Only' : 'Content-Security-Policy',
    document ? frameAncestorsForDocument(policy.csp) : policy.csp
  );
  h.set('Strict-Transport-Security', `max-age=${policy.hstsMaxAge}; includeSubDomains; preload`);
  h.set('X-Content-Type-Options', 'nosniff');
  h.set('X-Frame-Options', document ? 'SAMEORIGIN' : 'DENY');
  h.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  h.set('Permissions-Policy', policy.permissionsPolicy);

  if (policy.defaultCacheControl !== undefined && !h.has('Cache-Control')) {
    h.set('Cache-Control', policy.defaultCacheControl);
  }
  if (policy.noindex) h.set('X-Robots-Tag', 'noindex, nofollow');

  return response;
}
