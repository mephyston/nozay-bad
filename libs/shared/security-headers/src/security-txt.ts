/**
 * `/.well-known/security.txt` (RFC 9116) : où signaler une faille.
 *
 * C'est là qu'un chercheur en sécurité cherche d'abord un contact, pas dans le dépôt,
 * qui est privé. Le contact vient de la configuration (`SECURITY_CONTACT`) : les failles
 * concernent la plateforme, pas le club, et le code ne nomme personne.
 *
 * `Expires` est recalculé à chaque réponse : le fichier ne périme jamais, tant que le
 * contact est configuré. La RFC le veut à moins d'un an.
 */
export function securityTxt(contact: string, canonical: string, now: Date = new Date()): string {
  const expires = new Date(now.getTime() + 180 * 24 * 3600 * 1000);
  return [
    `Contact: ${contact.includes(':') ? contact : `mailto:${contact}`}`,
    `Expires: ${expires.toISOString().replace(/\.\d{3}Z$/, 'Z')}`,
    'Preferred-Languages: fr, en',
    `Canonical: ${canonical}`,
    ''
  ].join('\n');
}

/** La réponse complète, ou un 404 si aucun contact n'est configuré. */
export function securityTxtResponse(contact: string | undefined, url: URL): Response {
  if (!contact) return new Response('Introuvable', { status: 404 });
  return new Response(securityTxt(contact, new URL('/.well-known/security.txt', url.origin).toString()), {
    headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'public, max-age=86400' }
  });
}
