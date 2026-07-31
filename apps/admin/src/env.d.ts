
/// <reference types="astro/client" />
declare namespace App {
  interface Locals {
    user?: {
      email: string;
      name?: string;
      permissions: string[];
    };
    runtime: import('@astrojs/cloudflare').Runtime<Env>;
  }
}
interface Env {
  API_SERVICE: import('@cloudflare/workers-types').Fetcher;
  INTERNAL_API_KEY?: string;
  CF_TEAM_DOMAIN?: string;
  CF_AUDIENCE?: string;
  DB: import('@cloudflare/workers-types').D1Database;
}
declare module 'cloudflare:workers' {
  export const env: Env;
}
// deploy: 2026-07-18-4
