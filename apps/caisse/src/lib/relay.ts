import { createApiClient } from '@nba/api-client';
import { resolveEnv } from './http';

/** Relaie un appel vers les routes de la buvette, sous l'identité du bénévole connecté. */
export function relay(locals: App.Locals, path: string, init?: RequestInit): Promise<Response> {
  const env = resolveEnv<any>(locals);
  const api = createApiClient(env, { caller: 'caisse', userEmail: locals.email });
  return api.fetch(`http://localhost/buvette/${path}`, init);
}
