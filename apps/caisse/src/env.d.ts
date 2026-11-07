/// <reference types="astro/client" />

declare namespace App {
  interface Locals {
    /** L'adresse du bénévole, validée par Cloudflare Access. */
    email: string;
  }
}

interface Env {
  API_SERVICE: import('@cloudflare/workers-types').Fetcher;
  INTERNAL_API_KEY?: string;
  API_URL?: string;
  CF_TEAM_DOMAIN?: string;
  CF_AUDIENCE?: string;
  DEV_EMAIL?: string;
  RESEND_API_KEY?: string;
  EMAIL_FROM?: string;
  EMAIL_MODE?: string;
  EMAIL_ALLOWLIST?: string;
  EMAIL_TEST_INBOX?: string;
}

declare module 'cloudflare:workers' {
  export const env: Env;
}
