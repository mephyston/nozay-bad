/// <reference types="astro/client" />

interface ImportMetaEnv {
  readonly PUBLIC_APP_ENV: string;
  readonly PUBLIC_TURNSTILE_SITE_KEY: string;
}

declare namespace App {
  interface Locals {
    /** La carte ouverte sur cet appareil, lue dans le cookie signé. */
    card?: { cardId: number; deviceId: string };
    club?: import('@nba/club/context').ClubContext;
  }
}

interface Env {
  API_SERVICE: import('@cloudflare/workers-types').Fetcher;
  INTERNAL_API_KEY?: string;
  API_URL?: string;
  RATE_LIMIT_KV: import('@cloudflare/workers-types').KVNamespace;
  SESSION_SECRET?: string;
  TURNSTILE_SECRET_KEY?: string;
  AUTH_RATE_LIMIT_DISABLED?: string;
  RESEND_API_KEY?: string;
  EMAIL_FROM?: string;
  EMAIL_MODE?: string;
  EMAIL_ALLOWLIST?: string;
  EMAIL_TEST_INBOX?: string;
}

declare module 'cloudflare:workers' {
  export const env: Env;
}
