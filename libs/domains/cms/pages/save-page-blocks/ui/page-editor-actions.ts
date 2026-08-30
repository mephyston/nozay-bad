import type { BlockPayload } from '../../../shared/blocks';

/**
 * Écritures de l'éditeur, adressées au relais de la rubrique.
 *
 * L'éditeur porte sur une page précise : chaque écriture nomme donc son identifiant,
 * là où elle le tirait autrefois de l'URL de la page hôte. Le relais le valide avant
 * de le laisser rejoindre un chemin d'API.
 */
const RELAIS = '/admin/api/cms/page';

async function post(body: unknown, fallback: string): Promise<unknown> {
  const response = await fetch(RELAIS, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  if (!response.ok) {
    let message = fallback;
    try {
      const parsed = (await response.json()) as { error?: string };
      if (parsed.error) message = parsed.error;
    } catch {
      // Réponse illisible : le message générique fera l'affaire.
    }
    throw new Error(message);
  }
  return response.json();
}

export function saveBlocks(id: number, blocks: BlockPayload[]): Promise<unknown> {
  // L'état complet part à chaque enregistrement : c'est ce que le serveur attend, et
  // ce qui rend l'écriture atomique.
  return post({ action: 'saveBlocks', id, blocks: blocks.map((b) => ({ type: b.type, payload: b })) },
    "L'enregistrement a échoué.");
}

export function saveMeta(id: number, meta: Record<string, unknown>): Promise<unknown> {
  return post({ action: 'updateMeta', id, ...meta }, 'La mise à jour a échoué.');
}

export function setPublished(id: number, published: boolean): Promise<unknown> {
  return post({ action: 'publish', id, published }, published ? 'La publication a échoué.' : 'Le retrait a échoué.');
}

export function restoreRevision(id: number, revisionId: number): Promise<unknown> {
  return post({ action: 'restore', id, revisionId }, 'La restauration a échoué.');
}
