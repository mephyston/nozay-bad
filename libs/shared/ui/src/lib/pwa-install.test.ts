import { describe, it, expect } from 'vitest';
import { detectInstallTarget, chromeIntentUrl, isIOS } from './pwa-install';

const UA = {
  chromeAndroid:
    'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Mobile Safari/537.36',
  samsung:
    'Mozilla/5.0 (Linux; Android 14; SAMSUNG SM-S928B) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/27.0 Chrome/125.0.0.0 Mobile Safari/537.36',
  firefoxAndroid: 'Mozilla/5.0 (Android 14; Mobile; rv:130.0) Gecko/130.0 Firefox/130.0',
  edgeAndroid:
    'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Mobile Safari/537.36 EdgA/151.0.0.0',
  operaAndroid:
    'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Mobile Safari/537.36 OPR/89.0.0.0',
  webview:
    'Mozilla/5.0 (Linux; Android 14; Pixel 8; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/151.0.0.0 Mobile Safari/537.36',
  safariIOS:
    'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1',
  chromeIOS:
    'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/130.0.0.0 Mobile/15E148 Safari/604.1',
  ipadOS: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15',
  chromeDesktop:
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/151.0.0.0 Safari/537.36'
};

describe('detectInstallTarget', () => {
  it('laisse Chrome sur Android suivre la voie normale', () => {
    expect(detectInstallTarget(UA.chromeAndroid)).toBe('default');
  });

  it('renvoie vers Chrome depuis Samsung Internet, dont le WebAPK est bloqué par Android 14+', () => {
    expect(detectInstallTarget(UA.samsung)).toBe('android-other');
  });

  it.each([
    ['Firefox', UA.firefoxAndroid],
    ['Edge', UA.edgeAndroid],
    ['Opera', UA.operaAndroid],
    ['WebView', UA.webview]
  ])('renvoie vers Chrome depuis %s sur Android', (_, ua) => {
    expect(detectInstallTarget(ua)).toBe('android-other');
  });

  it('distingue Safari des autres navigateurs sur iOS', () => {
    expect(detectInstallTarget(UA.safariIOS)).toBe('ios-safari');
    expect(detectInstallTarget(UA.chromeIOS)).toBe('ios-other');
  });

  it("reconnaît l'iPad qui se fait passer pour un Mac grâce au tactile", () => {
    expect(isIOS(UA.ipadOS, 5)).toBe(true);
    expect(isIOS(UA.ipadOS, 0)).toBe(false);
    expect(detectInstallTarget(UA.ipadOS, 5)).toBe('ios-safari');
  });

  it('ne touche pas au bureau', () => {
    expect(detectInstallTarget(UA.chromeDesktop)).toBe('default');
  });
});

describe('chromeIntentUrl', () => {
  it('rouvre la page courante dans Chrome, avec repli vers le Play Store', () => {
    const url = chromeIntentUrl('https://my.nozaybad.fr/agenda?semaine=36');
    expect(url).toBe(
      'intent://my.nozaybad.fr/agenda?semaine=36#Intent;scheme=https;package=com.android.chrome;' +
        'S.browser_fallback_url=https%3A%2F%2Fplay.google.com%2Fstore%2Fapps%2Fdetails%3Fid%3Dcom.android.chrome;end'
    );
  });

  it("abandonne le fragment, que l'intent ne sait pas transporter", () => {
    expect(chromeIntentUrl('https://my.nozaybad.fr/#haut')).toMatch(/^intent:\/\/my\.nozaybad\.fr\/#Intent;/);
  });
});
