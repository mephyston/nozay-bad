/// <reference types="astro/client" />
/// <reference types="vite-plugin-pwa/info" />
/// <reference types="vite-plugin-pwa/client" />
declare namespace App {
  interface Locals {
    user?: {
      email: string;
      name?: string;
      roles: import('@nba/iam-ui').Role[];
      /**
       * Permissions effectives, en tableau et non en `Set` : elles sont passées en
       * props aux îlots Svelte, où un `Set` ne survivrait pas à la sérialisation.
       */
      permissions: import('@nba/iam-ui').Permission[];
    };
    /**
     * Compte réellement connecté. Diffère de `user` pendant une usurpation, ce qui
     * permet d'afficher un bandeau et de savoir qui a agi.
     */
    realUser?: {
      email: string;
      name?: string;
      /**
       * Droits du compte réellement connecté. Pendant une usurpation, `user.permissions`
       * sont ceux de l'identité empruntée : s'en servir pour garder l'usurpation
       * elle-même enferme l'usurpateur dans l'identité qu'il vient de prendre.
       */
      permissions?: import('@nba/iam-ui').Permission[];
    };
    /**
     * L'identité du club et l'état de ses fonctionnalités, résolus par le middleware
     * (`lib/club.ts`). Absent au build des pages figées, qui ne passent pas par lui.
     */
    club?: import('./lib/club').ClubContexte;
    runtime: import('@astrojs/cloudflare').Runtime<Env>;
  }
}
interface Env {
  API_SERVICE: import('@cloudflare/workers-types').Fetcher;
  INTERNAL_API_KEY?: string;
  CF_TEAM_DOMAIN?: string;
  CF_AUDIENCE?: string;
  DB: import('@cloudflare/workers-types').D1Database;
  APP_ENV?: string;
  /** Développement : rôle appliqué quand l'adresse n'a pas de compte en base. */
  DEV_ROLE?: string;
  /** Développement : adresse utilisée à défaut de cookie d'usurpation. */
  DEV_EMAIL?: string;
}
declare module 'cloudflare:workers' {
  export const env: Env;
}
// deploy: 2026-07-18-4
