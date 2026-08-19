import { resolveEnv as resolveRuntimeEnv } from '@nba/runtime-env';
import type { WebsiteEnv } from './cms';
import { attachRenderContext, type RenderContext } from './render-context';

/**
 * Environnement d'exécution du Worker.
 *
 * La fusion `cloudflare:workers` + env runtime Astro (et le piège Astro v6 qui la
 * justifie) vit dans `@nba/runtime-env`, partagé par les trois applications.
 *
 * L'environnement rendu porte en plus le contexte de la requête (`render-context.ts`),
 * pris dans `locals` : c'est ce qui permet à une lecture d'API, appelée depuis
 * n'importe quel composant, de trouver la version de contenu et de signaler un repli
 * sans qu'aucune signature n'ait à le transporter.
 */
export function resolveEnv(locals: unknown): WebsiteEnv {
  const env = resolveRuntimeEnv<WebsiteEnv>(locals);
  const context = (locals as { render?: RenderContext } | undefined)?.render;
  return attachRenderContext(env, context);
}
