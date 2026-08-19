import { describe, it, expect, beforeEach } from 'vitest';
import { setupMockDb } from '@nba/db/test-utils';
import { type Db } from '@nba/db';
import { getContentVersion } from '../../shared/cache-version';
import {
  CmsRedirectLoopError,
  CmsRedirectChainError,
  CmsRedirectSourceConflictError,
  CmsRedirectShadowedError
} from '../../shared/errors';
import { createPage } from '../../pages/create-page/handler';
import { createRedirect } from './handler';

const AUTHOR = 'communication@nozaybad.fr';

describe('createRedirect', () => {
  let db: Db;

  beforeEach(async () => {
    ({ db } = await setupMockDb());
  });

  it('pose une redirection 301, chemins normalisés', async () => {
    const created = await createRedirect(db, { fromPath: 'Ancienne-Adresse', toPath: '/nouvelle' });

    expect(created).toMatchObject({
      fromPath: '/ancienne-adresse/',
      toPath: '/nouvelle/',
      statusCode: 301,
      hitCount: 0
    });
  });

  it('pose un 410 quand la page n’a pas de successeur', async () => {
    const created = await createRedirect(db, { fromPath: '/test-disparue/', toPath: null });

    expect(created).toMatchObject({ toPath: null, statusCode: 410 });
  });

  it('refuse une source déjà redirigée : il faut modifier la ligne existante', async () => {
    await createRedirect(db, { fromPath: '/test-source/', toPath: '/cible/' });

    await expect(createRedirect(db, { fromPath: '/test-source/', toPath: '/autre/' })).rejects.toThrow(
      CmsRedirectSourceConflictError
    );
  });

  it('refuse une source qui est l’adresse d’une page : elle ne serait jamais empruntée', async () => {
    // La résolution d'URL sert la page avant de consulter les redirections.
    await createPage(db, { title: 'Présentation', slug: 'presentation' }, AUTHOR);

    await expect(createRedirect(db, { fromPath: '/presentation/', toPath: '/' })).rejects.toThrow(
      CmsRedirectShadowedError
    );
  });

  it('refuse la boucle et la chaîne', async () => {
    await createRedirect(db, { fromPath: '/test-maillon/', toPath: '/test-finale/' });

    await expect(createRedirect(db, { fromPath: '/test-boucle/', toPath: '/test-boucle/' })).rejects.toThrow(
      CmsRedirectLoopError
    );
    await expect(createRedirect(db, { fromPath: '/test-amont/', toPath: '/test-maillon/' })).rejects.toThrow(
      CmsRedirectChainError
    );
  });

  it('invalide le cache du site public : l’adresse servait peut-être un 404 mis en cache', async () => {
    const before = await getContentVersion(db);

    await createRedirect(db, { fromPath: '/test-source/', toPath: '/cible/' });

    expect(await getContentVersion(db)).toBeGreaterThan(before);
  });
});
