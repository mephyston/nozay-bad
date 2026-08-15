import { describe, it, expect, beforeEach } from 'vitest';
import { setupMockDb } from '@nba/db/test-utils';
import { type Db } from '@nba/db';
import { saveSiteSettings } from './handler';
import { getSiteSettings, SITE_SETTINGS_DEFAULTS } from '../get-site-settings/handler';
import { getContentVersion } from '../../shared/cache-version';

/**
 * Ces réglages sont rendus sur **toutes** les pages du site : ce sont les seules
 * valeurs du CMS dont une modification touche toutes les entrées du cache à la fois.
 * D'où les deux invariants tenus ici — l'invalidation, et le refus d'un lien mort.
 */
describe('saveSiteSettings', () => {
  let db: Db;

  const input = {
    footerDescription: 'Le club de badminton de Nozay',
    footerAddress: 'Place de la Mairie, 91620 Nozay',
    instagramUrl: 'https://www.instagram.com/nozaybad/',
    facebookUrl: 'https://www.facebook.com/nozaybad/',
    actorEmail: 'president@nozaybad.fr'
  };

  beforeEach(async () => {
    ({ db } = await setupMockDb());
  });

  it('sert ce qui vient d’être enregistré', async () => {
    await saveSiteSettings(db, input);
    const settings = await getSiteSettings(db);
    expect(settings.footerDescription).toBe('Le club de badminton de Nozay');
    expect(settings.footerAddress).toBe('Place de la Mairie, 91620 Nozay');
  });

  it('invalide le cache du site : sans cela la correction resterait invisible une heure', async () => {
    const before = await getContentVersion(db);
    await saveSiteSettings(db, input);
    expect(await getContentVersion(db)).toBeGreaterThan(before);
  });

  it('range un réseau vidé en `null`, et non en chaîne vide', async () => {
    await saveSiteSettings(db, { ...input, instagramUrl: '   ' });
    // Le rendu teste la nullité pour décider d'afficher l'icône : une chaîne vide
    // produirait un lien vers la page courante.
    expect((await getSiteSettings(db)).instagramUrl).toBeNull();
  });

  it('refuse une adresse qui n’est pas un lien web', async () => {
    await expect(
      saveSiteSettings(db, { ...input, facebookUrl: 'javascript:alert(1)' })
    ).rejects.toThrow(/http/);
  });

  it('sert des valeurs par défaut tant que rien n’a été enregistré', async () => {
    // Une base montée sans la migration de semis ne doit pas vider le pied de page.
    expect(await getSiteSettings(db)).toEqual(SITE_SETTINGS_DEFAULTS);
  });
});
