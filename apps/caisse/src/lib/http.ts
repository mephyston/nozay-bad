export { resolveEnv } from '@nba/runtime-env';

export function json(data: unknown, status = 200, extraHeaders?: Record<string, string>): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...(extraHeaders ?? {}) }
  });
}

export const IS_DEV = Boolean((import.meta as any).env?.DEV);
export const COOKIE_SECURE = !IS_DEV;

/** Un navigateur annonce son origine sur les écritures : on refuse celles venues d'ailleurs. */
export function isSameOrigin(request: Request, url: URL): boolean {
  if (request.method === 'GET' || request.method === 'HEAD') return true;
  return request.headers.get('origin') === url.origin;
}
