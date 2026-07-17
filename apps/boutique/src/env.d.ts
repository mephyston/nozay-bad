// deploy: 2026-07-18-3
/// <reference types="astro/client" />
declare namespace App {
  interface Locals {
    user?: {
      email: string;
    };
    runtime: import('@astrojs/cloudflare').Runtime<Env>;
  }
}
interface Env {
  API_SERVICE: import('@cloudflare/workers-types').Fetcher;
  CF_TEAM_DOMAIN?: string;
  CF_AUDIENCE?: string;
  DB: import('@cloudflare/workers-types').D1Database;
}
declare module 'cloudflare:workers' {
  export const env: Env;
}
