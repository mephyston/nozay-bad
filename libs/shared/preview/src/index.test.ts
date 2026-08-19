import { describe, it, expect } from 'vitest';
import { createPreviewToken, verifyPreviewToken, PREVIEW_TTL_SECONDS } from './index';

const SECRET = 'secret-de-test-suffisamment-long';
const NOW = 1_786_000_000_000;

describe('jeton d’aperçu', () => {
  it('accepte un jeton qu’il vient d’émettre', async () => {
    const token = await createPreviewToken('/chantier/', SECRET, NOW);
    expect(await verifyPreviewToken(token, '/chantier/', SECRET, NOW)).toBe(true);
  });

  it('n’ouvre que la page pour laquelle il a été émis', async () => {
    // Sinon un lien de relecture donnerait accès à tous les brouillons du site.
    const token = await createPreviewToken('/chantier/', SECRET, NOW);
    expect(await verifyPreviewToken(token, '/autre-page/', SECRET, NOW)).toBe(false);
  });

  it('expire', async () => {
    const token = await createPreviewToken('/chantier/', SECRET, NOW);
    const after = NOW + (PREVIEW_TTL_SECONDS + 60) * 1000;
    expect(await verifyPreviewToken(token, '/chantier/', SECRET, after)).toBe(false);
  });

  it('refuse une signature falsifiée', async () => {
    const token = await createPreviewToken('/chantier/', SECRET, NOW);
    const tampered = `${token.slice(0, -3)}aaa`;
    expect(await verifyPreviewToken(tampered, '/chantier/', SECRET, NOW)).toBe(false);
  });

  it('refuse une échéance repoussée à la main', async () => {
    const token = await createPreviewToken('/chantier/', SECRET, NOW);
    const forged = `9999999999.${token.split('.')[1]}`;
    expect(await verifyPreviewToken(forged, '/chantier/', SECRET, NOW)).toBe(false);
  });

  it('refuse un autre secret', async () => {
    const token = await createPreviewToken('/chantier/', SECRET, NOW);
    expect(await verifyPreviewToken(token, '/chantier/', 'un-autre-secret', NOW)).toBe(false);
  });

  it('échoue en fermeture quand le secret n’est pas configuré', async () => {
    // Le contraire ouvrirait tous les brouillons dès qu'une variable manque au
    // déploiement.
    const token = await createPreviewToken('/chantier/', SECRET, NOW);
    expect(await verifyPreviewToken(token, '/chantier/', undefined, NOW)).toBe(false);
  });

  it('refuse l’absence de jeton et les formes malformées', async () => {
    expect(await verifyPreviewToken(null, '/x/', SECRET, NOW)).toBe(false);
    expect(await verifyPreviewToken('', '/x/', SECRET, NOW)).toBe(false);
    expect(await verifyPreviewToken('sans-point', '/x/', SECRET, NOW)).toBe(false);
    expect(await verifyPreviewToken('.abc', '/x/', SECRET, NOW)).toBe(false);
  });
});
