export interface ApiClientEnv {
  API_SERVICE: {
    fetch: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;
  };
  INTERNAL_API_KEY?: string;
}

export function createApiClient(env: ApiClientEnv) {
  const apiKey = env?.INTERNAL_API_KEY || '';
  return {
    fetch: (input: RequestInfo | URL, init?: RequestInit) => {
      if (!apiKey && (!init || (Object.keys(init).length === 0 && !init.headers))) {
        return env.API_SERVICE.fetch(input);
      }
      const headers = new Headers(init?.headers);
      if (apiKey) {
        headers.set('Authorization', `Bearer ${apiKey}`);
        headers.set('x-api-key', apiKey);
      }
      return env.API_SERVICE.fetch(input, { ...init, headers });
    }
  };
}
