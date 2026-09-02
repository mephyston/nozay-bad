/**
 * Version publiée, prête à afficher.
 *
 * Elle arrive de deux endroits qui ne l'écrivent pas pareil : la préproduction la
 * tient de semantic-release (« 1.1.1 »), la production de `git describe`, qui rend le
 * tag tel quel (« v1.1.1 »). Les trois emplacements qui l'affichent — le badge de la
 * barre latérale et les deux écrans de démarrage — préfixaient un « v » sans regarder
 * ce qu'ils avaient reçu : la production annonçait « vv1.1.1 ».
 *
 * Le préfixe est donc posé ici, une fois, après retrait de celui qui traînait déjà.
 *
 * Seul un numéro reçoit ce préfixe. Ce qui n'en est pas un ressort tel quel : les
 * `astro.config.mjs` retombent sur « dev » quand `VITE_APP_VERSION` est absent — toute
 * build hors CI — et l'écran de démarrage annonçait « VDEV » en capitales.
 */
export function formatAppVersion(raw: string | undefined | null): string {
  // Le « v » ne se retire que devant un chiffre : sur un mot, il fait partie du mot.
  const version = (raw ?? '').trim().replace(/^v(?=\d)/i, '');
  if (!version) return 'v0.0.0';
  return /^\d/.test(version) ? `v${version}` : version;
}
