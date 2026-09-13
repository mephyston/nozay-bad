
/// <reference types="astro/client" />
/// <reference types="vite-plugin-pwa/info" />
/// <reference types="vite-plugin-pwa/client" />

interface ImportMetaEnv {
  /** Environnement inliné au build : 'development' | 'staging' | 'production'. */
  readonly PUBLIC_APP_ENV: string;
  /** Clé publique VAPID, inlinée au build. Vide = notifications push désactivées. */
  readonly PUBLIC_VAPID_PUBLIC_KEY: string;
}

declare namespace App {
  interface Locals {
    session?: {
      email: string;
      members: Array<{ id: number; firstName: string; lastName: string; licence: string; paid: boolean; expenseAuthorized: boolean }>;
      activeMemberId: number;
      /** Saison (code) au titre de laquelle l'accès a été accordé — voir `lib/season.ts`. */
      seasonCode: string;
    };
    /** L'identité du club et ses fonctionnalités, posées par le middleware sur chaque page. */
    club?: import('@nba/club/context').ClubContext;
    runtime: import('@astrojs/cloudflare').Runtime<Env>;
  }
}
interface Env {
  API_SERVICE: import('@cloudflare/workers-types').Fetcher;
  INTERNAL_API_KEY?: string;
  RATE_LIMIT_KV: import('@cloudflare/workers-types').KVNamespace;
  RESEND_API_KEY?: string;
  SESSION_SECRET?: string;
  EMAIL_FROM?: string;
  EMAIL_MODE?: string;
  EMAIL_ALLOWLIST?: string;
  EMAIL_TEST_INBOX?: string;
  TURNSTILE_SECRET_KEY?: string;
}
declare module 'cloudflare:workers' {
  export const env: Env;
}
// deploy: 2026-07-18-4
