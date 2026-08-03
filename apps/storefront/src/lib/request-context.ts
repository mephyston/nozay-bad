import { env as cfEnv } from 'cloudflare:workers';

// Fusionne l'env `cloudflare:workers` et l'env runtime Astro (même approche que le middleware admin).
export function resolveEnv(locals: any): any {
  let runtimeEnv: any = {};
  try {
    runtimeEnv = locals?.runtime?.env || {};
  } catch {
    // Astro.locals.runtime.env peut throw en prod v6 : on ignore.
  }
  return { ...(cfEnv as any), ...runtimeEnv };
}

export function clientIp(request: Request): string {
  return (
    request.headers.get('CF-Connecting-IP') ||
    request.headers.get('x-real-ip') ||
    '127.0.0.1'
  );
}

export function json(data: any, status = 200, extraHeaders?: Record<string, string>): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...(extraHeaders || {}) }
  });
}

export const IS_DEV = typeof import.meta !== 'undefined' && Boolean((import.meta as any).env?.DEV);
// Les cookies Secure ne sont pas posés par le navigateur en http (localhost).
export const COOKIE_SECURE = !IS_DEV;
