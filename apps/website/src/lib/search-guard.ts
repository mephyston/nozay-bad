/**
 * La recherche est la première porte du site qui calcule à chaque requête : tout le
 * reste est servi depuis le cache de page, et un robot qui martèle `?q=` y trouverait
 * la seule dépense qu'on ne mutualise pas. Trois gardes, dans l'ordre du moins cher :
 *
 *  - une saisie trop courte ou trop longue ne coûte rien — elle ne part pas ;
 *  - un limiteur de débit du Worker (`ratelimits`, compté par Cloudflare au bord) :
 *    trente demandes par minute et par adresse, ce qu'un humain n'atteint pas en
 *    tapant, débounce compris. Absent en local, le garde laisse passer ;
 *  - l'API elle-même garde ses sources une minute en mémoire : au pire, un
 *    assaillant paye du CPU, pas des lectures de base.
 *
 * Les réponses sont `no-store` : rien de tout cela n'entre dans le cache de page,
 * dont la clé ignore `?q=` et se ferait sinon empoisonner par la première recherche.
 */
export interface SearchGuardEnv {
  SEARCH_LIMITER?: { limit(options: { key: string }): Promise<{ success: boolean }> };
}

export const SEARCH_MIN_LENGTH = 2;
export const SEARCH_MAX_LENGTH = 80;

export function cleanQuery(raw: string | null): string {
  return (raw ?? '').replace(/\s+/g, ' ').trim().slice(0, SEARCH_MAX_LENGTH);
}

export function clientIp(request: Request): string {
  return request.headers.get('cf-connecting-ip') ?? request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? '0.0.0.0';
}

/** `true` si la demande peut passer. */
export async function allowSearch(env: SearchGuardEnv, request: Request): Promise<boolean> {
  if (!env.SEARCH_LIMITER) return true;
  try {
    const { success } = await env.SEARCH_LIMITER.limit({ key: clientIp(request) });
    return success;
  } catch {
    // Un limiteur en panne ne doit pas fermer la recherche : on laisse passer, et
    // les journaux du Worker diront pourquoi.
    return true;
  }
}

export const NO_STORE = { 'Cache-Control': 'private, no-store' } as const;
