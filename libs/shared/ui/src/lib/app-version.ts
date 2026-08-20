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
 */
export function formatAppVersion(raw: string | undefined | null): string {
  const version = (raw ?? '').trim().replace(/^v/i, '');
  return `v${version || '0.0.0'}`;
}
