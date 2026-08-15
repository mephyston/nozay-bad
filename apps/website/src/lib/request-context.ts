import { env as cfEnv } from 'cloudflare:workers';
import type { WebsiteEnv } from './cms';
import { attachRenderContext, type RenderContext } from './render-context';

/**
 * Environnement d'exécution du Worker.
 *
 * `Astro.locals.runtime.env` a été **retiré en Astro v6** : y accéder lève, et comme
 * l'accès se fait par un accesseur, même un `locals?.runtime?.env` prudent déclenche
 * l'erreur. La source de vérité est donc `cloudflare:workers` ; la lecture de `locals`
 * n'est conservée que par compatibilité, sous try/catch.
 *
 * Même approche que `apps/storefront/src/lib/request-context.ts`.
 *
 * L'environnement rendu porte en plus le contexte de la requête (`render-context.ts`),
 * pris dans `locals` : c'est ce qui permet à une lecture d'API, appelée depuis
 * n'importe quel composant, de trouver la version de contenu et de signaler un repli
 * sans qu'aucune signature n'ait à le transporter.
 */
export function resolveEnv(locals: unknown): WebsiteEnv {
  let runtimeEnv: Record<string, unknown> = {};
  try {
    runtimeEnv = (locals as { runtime?: { env?: Record<string, unknown> } })?.runtime?.env || {};
  } catch {
    // Attendu en v6 : on s'en remet à `cfEnv`.
  }
  const env = { ...(cfEnv as unknown as WebsiteEnv), ...runtimeEnv } as WebsiteEnv;
  const context = (locals as { render?: RenderContext } | undefined)?.render;
  return attachRenderContext(env, context);
}
