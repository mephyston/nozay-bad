export interface ApiClientEnv {
  API_SERVICE?: {
    fetch: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;
  };
  INTERNAL_API_KEY?: string;
  API_URL?: string;
  ENVIRONMENT?: string;
}

export function createApiClient(env?: ApiClientEnv) {
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
