import { describe, expect, it } from 'vitest';
import { notSignedInPage, reconnectPage } from './access-reconnect';

describe('sortie de secours Cloudflare Access de la caisse', () => {
  it('efface les cookies Access, avec et sans domaine, puis renvoie vers l\'accueil', async () => {
    const res = reconnectPage(new Request('https://caisse.example/reconnexion'));
    const cookies = res.headers.getSetCookie();
    for (const name of ['CF_Authorization', 'CF_AppSession', 'CF_Binding']) {
      expect(cookies).toContain(`${name}=; Path=/; Max-Age=0; Secure; HttpOnly; SameSite=Lax`);
      expect(cookies).toContain(`${name}=; Domain=caisse.example; Path=/; Max-Age=0; Secure; HttpOnly; SameSite=Lax`);
    }
    expect(res.headers.get('Refresh')).toBe('2; url=/');
    expect(res.headers.get('Cache-Control')).toBe('no-store');
    expect(await res.text()).toContain('Reconnexion à la caisse');
  });

  it('une page sans connexion valable propose la reconnexion', async () => {
    const res = notSignedInPage();
    expect(res.status).toBe(401);
    expect(await res.text()).toContain('href="/reconnexion"');
  });
});
