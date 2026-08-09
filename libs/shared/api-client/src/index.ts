export interface ApiClientEnv {
  API_SERVICE?: {
    fetch: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;
  };
  INTERNAL_API_KEY?: string;
  API_URL?: string;
  ENVIRONMENT?: string;
}

/**
 * Qui appelle l'API, et pour le compte de qui.
 *
 * L'API n'accepte plus de liste de permissions toute faite : elle résout elle-même
 * l'adresse en rôles puis en droits. Ce qui transite ici est donc une *identité*, pas
 * une *décision* — l'autorisation reste dans une seule base de code.
 */
export type CallerIdentity = {
  // `website` est le site public : aucune identité, aucune permission, et il ne doit
  // jamais voir un brouillon. Il est distingué de `storefront` pour que les routes
  // puissent décider au cas par cas — l'espace adhérent est authentifié, pas lui.
  caller: 'admin' | 'storefront' | 'website';
  /** Adresse de l'utilisateur, exigée par l'API pour tout appel `admin`. */
  userEmail?: string;
  /**
   * Le site public affirme avoir vérifié un jeton d'aperçu valide.
   *
   * C'est le seul cas où il peut lire un brouillon. La vérification cryptographique
   * vit dans le Worker du site — un domaine métier ne dépend pas de
   * l'authentification — et l'API s'en remet à lui sur la même base que
   * `x-user-email` : la clé interne, que seuls les Workers détiennent.
   */
  previewVerified?: boolean;
};

export function createApiClient(env?: ApiClientEnv, identity?: CallerIdentity) {
  // C-01 : aucune clé en dur. La valeur vient du binding env (secret Worker) ou, en
  // local, de .dev.vars via `process.env`. Si absente, l'appel partira sans clé et
  // l'API répondra 401 (fail-closed) — plutôt qu'un secret devinable embarqué.
  const apiKey =
    env?.INTERNAL_API_KEY ||
    (typeof process !== 'undefined' && process.env?.INTERNAL_API_KEY) ||
    '';

  return {
    fetch: (input: RequestInfo | URL, init?: RequestInit) => {
      const headers = new Headers(init?.headers);
      if (apiKey) {
        headers.set('Authorization', `Bearer ${apiKey}`);
        headers.set('x-api-key', apiKey);
      }

      // Les proxies catch-all de l'admin recopient les en-têtes de la requête
      // entrante : sans cette réécriture systématique, un navigateur pourrait
      // injecter `x-user-email` et se faire passer pour n'importe quel compte. On
      // repose donc toujours ces deux en-têtes, et on efface l'identité quand
      // l'appelant n'en fournit pas.
      //
      // À défaut d'identité déclarée, l'appelant est réputé `storefront`, le moins
      // privilégié : un site d'appel oublié se voit refuser les routes réservées à
      // l'administration plutôt que de les obtenir sans contrôle.
      headers.set('x-caller', identity?.caller ?? 'storefront');
      if (identity?.userEmail) headers.set('x-user-email', identity.userEmail);
      else headers.delete('x-user-email');
      headers.delete('x-user-permissions');
      // Toujours réécrit, jamais relayé : sans cela, un en-tête entrant ouvrirait les
      // brouillons à n'importe quel visiteur.
      if (identity?.caller === 'website' && identity.previewVerified) {
        headers.set('x-preview-verified', '1');
      } else {
        headers.delete('x-preview-verified');
      }

      if (env?.API_SERVICE && typeof env.API_SERVICE.fetch === 'function') {
        return env.API_SERVICE.fetch(input, { ...init, headers });
      }

      if (typeof globalThis.fetch === 'function') {
        let urlStr = typeof input === 'string' ? input : input.toString();
        if (urlStr.startsWith('http://localhost/') || urlStr.startsWith('http://localhost:80/')) {
          const devBase =
            env?.API_URL ||
            (typeof process !== 'undefined' && process.env?.API_URL) ||
            'http://127.0.0.1:8787';
          urlStr = urlStr.replace(/^http:\/\/localhost(:80)?/, devBase.replace(/\/$/, ''));
        }
        return globalThis.fetch(urlStr, { ...init, headers });
      }

      throw new Error('Aucun service HTTP (API_SERVICE ou fetch) disponible.');
    }
  };
}
