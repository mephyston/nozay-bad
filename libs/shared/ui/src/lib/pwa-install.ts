/**
 * Où et comment une PWA peut s'installer, d'après le user-agent.
 *
 * Trois familles, trois marches à suivre :
 * - iOS : seul Safari a le menu « Sur l'écran d'accueil » ; les autres navigateurs
 *   n'installent rien.
 * - Android hors Chrome : l'installation passe par un WebAPK que le navigateur fait
 *   fabriquer par SON serveur. Celui de Samsung Internet produit des paquets visant une
 *   API trop ancienne : Android 14+ les bloque (« Appli non sécurisée bloquée »,
 *   SamsungInternet/support#123). Firefox, Opera, DuckDuckGo, Huawei, Mi, UC… posent au
 *   mieux un raccourci sans mode autonome, donc sans push. Dans tous ces cas, on renvoie
 *   vers Chrome, dont le serveur produit des paquets à jour.
 * - Chrome sur Android (et le bureau) : `beforeinstallprompt`, rien à expliquer.
 *
 * Brave et les navigateurs qui se déguisent en Chrome ne sont pas distinguables ici :
 * ils passent par la voie normale.
 */

export type InstallTarget = 'ios-safari' | 'ios-other' | 'android-other' | 'default';

/** Play Store : de là où Chrome est absent, l'intent y renvoie. */
const CHROME_PACKAGE = 'com.android.chrome';
const CHROME_STORE_URL = `https://play.google.com/store/apps/details?id=${CHROME_PACKAGE}`;

export function isIOS(ua: string, maxTouchPoints = 0): boolean {
  const lower = ua.toLowerCase();
  if (/iphone|ipad|ipod/.test(lower)) return true;
  // iPadOS 13+ s'annonce comme un Mac de bureau ; seul maxTouchPoints le trahit.
  return /macintosh/.test(lower) && maxTouchPoints > 1;
}

/** Navigateurs Android dont l'installation ne passe pas par le serveur de Chrome. */
const ANDROID_OTHER_BROWSERS =
  /samsungbrowser|firefox|fennec|opr\/|opt\/|edga\/|yabrowser|duckduckgo|huaweibrowser|miuibrowser|ucbrowser|vivaldi|; wv\)/;

export function detectInstallTarget(ua: string, maxTouchPoints = 0): InstallTarget {
  const lower = ua.toLowerCase();
  if (isIOS(ua, maxTouchPoints)) {
    return /crios|fxios|edgios|opios|opt\//.test(lower) ? 'ios-other' : 'ios-safari';
  }
  if (/android/.test(lower)) {
    // Un Chrome authentique porte « Chrome/ » sans aucune des marques ci-dessus.
    if (ANDROID_OTHER_BROWSERS.test(lower) || !/chrome\//.test(lower)) return 'android-other';
  }
  return 'default';
}

/**
 * Lien qui rouvre la page courante dans Chrome sur Android, ou mène au Play Store s'il
 * n'est pas installé. C'est un `intent://` : Samsung Internet, Firefox et consorts le
 * délèguent au système, qui choisit l'application nommée par `package`.
 */
export function chromeIntentUrl(href: string): string {
  const url = new URL(href);
  const rest = url.host + url.pathname + url.search; // sans le fragment, que l'intent ne transporte pas
  return `intent://${rest}#Intent;scheme=${url.protocol.slice(0, -1)};package=${CHROME_PACKAGE};S.browser_fallback_url=${encodeURIComponent(CHROME_STORE_URL)};end`;
}
