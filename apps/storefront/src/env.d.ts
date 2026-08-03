
/// <reference types="astro/client" />
declare namespace App {
  interface Locals {
    session?: {
      email: string;
      members: Array<{ id: number; firstName: string; lastName: string; licence: string; paid: boolean; expenseAuthorized: boolean }>;
      activeMemberId: number;
    };
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
