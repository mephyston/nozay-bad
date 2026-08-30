/// <reference types="astro/client" />
/// <reference types="@cloudflare/workers-types" />

declare namespace App {
  interface Locals {
    /**
     * Canal de la requête en cours, posé par le middleware et lu par `resolveEnv`.
     *
     * Il ne transporte aucune donnée de visiteur — ce site n'en a pas — mais ce dont
     * le cache a besoin : la version de contenu et la santé du rendu.
     */
    render?: import('./lib/render-context').RenderContext;
  }
}
