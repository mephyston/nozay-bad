import { describe, it, expect, beforeEach } from 'vitest';
import { setupMockDb } from '@nba/db/test-utils';
import { type Db } from '@nba/db';
import { getContentVersion } from '../../shared/cache-version';
import {
  CmsRedirectNotFoundError,
  CmsRedirectLoopError,
  CmsRedirectChainError
} from '../../shared/errors';
import { createRedirect } from '../create-redirect/handler';
import { updateRedirect } from './handler';

describe('updateRedirect', () => {
  let db: Db;

  beforeEach(async () => {
    ({ db } = await setupMockDb());
  });

  it('refuse un identifiant inconnu', async () => {
    await expect(updateRedirect(db, { redirectId: 999_999, toPath: '/cible/' })).rejects.toThrow(
      CmsRedirectNotFoundError
    );
  });

  it('change la cible, en normalisant le chemin saisi', async () => {
    const redirect = await createRedirect(db, { fromPath: '/test-source/', toPath: '/avant/' });

    const updated = await updateRedirect(db, { redirectId: redirect.id, toPath: 'Apres' });

    expect(updated).toMatchObject({ fromPath: '/test-source/', toPath: '/apres/', statusCode: 301 });
  });

  it('bascule en 410 quand la cible est retirée, et revient en 301', async () => {
    // Le code est dérivé de la cible : la résolution d'URL décide du 410 sur la
    // nullité de `toPath`, un code saisi librement pourrait la contredire.
    const redirect = await createRedirect(db, { fromPath: '/test-source/', toPath: '/avant/' });

    const gone = await updateRedirect(db, { redirectId: redirect.id, toPath: null });
    expect(gone).toMatchObject({ toPath: null, statusCode: 410 });

    const back = await updateRedirect(db, { redirectId: redirect.id, toPath: '/retour/' });
    expect(back).toMatchObject({ toPath: '/retour/', statusCode: 301 });
  });

  it('refuse la boucle : une redirection ne peut pas se viser elle-même', async () => {
    const redirect = await createRedirect(db, { fromPath: '/test-source/', toPath: '/cible/' });

    await expect(updateRedirect(db, { redirectId: redirect.id, toPath: '/test-source/' })).rejects.toThrow(
      CmsRedirectLoopError
    );
  });

  it('refuse la chaîne : viser une adresse elle-même redirigée', async () => {
    const maillon = await createRedirect(db, { fromPath: '/test-maillon/', toPath: '/test-finale/' });
    const redirect = await createRedirect(db, { fromPath: '/test-source/', toPath: '/cible/' });

    await expect(
      updateRedirect(db, { redirectId: redirect.id, toPath: maillon.fromPath })
    ).rejects.toThrow(CmsRedirectChainError);
  });

  it('met la note à jour sans toucher au reste, et la garde quand elle est omise', async () => {
    const redirect = await createRedirect(db, {
      fromPath: '/test-source/',
      toPath: '/cible/',
      note: 'Posée à la main.'
    });

    const annotated = await updateRedirect(db, {
      redirectId: redirect.id,
      toPath: '/cible/',
      note: 'Nouvelle note.'
    });
    expect(annotated).toMatchObject({ toPath: '/cible/', note: 'Nouvelle note.' });

    const kept = await updateRedirect(db, { redirectId: redirect.id, toPath: '/ailleurs/' });
    expect(kept).toMatchObject({ toPath: '/ailleurs/', note: 'Nouvelle note.' });
  });

  it('invalide le cache du site public', async () => {
    const redirect = await createRedirect(db, { fromPath: '/test-source/', toPath: '/cible/' });
    const before = await getContentVersion(db);

    await updateRedirect(db, { redirectId: redirect.id, toPath: '/ailleurs/' });

    expect(await getContentVersion(db)).toBeGreaterThan(before);
  });
});
