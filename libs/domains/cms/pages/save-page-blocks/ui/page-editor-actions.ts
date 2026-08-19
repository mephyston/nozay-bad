import type { BlockPayload } from '../../../shared/blocks';

/**
 * Écritures de l'éditeur, adressées à la page d'administration elle-même.
 *
 * Même convention que les autres écrans : la page est le seul point d'entrée, et
 * c'est elle qui parle à l'API avec l'identité de l'utilisateur.
 */

async function post(body: unknown, fallback: string): Promise<unknown> {
  const response = await fetch('', {
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

export function saveBlocks(blocks: BlockPayload[]): Promise<unknown> {
  // L'état complet part à chaque enregistrement : c'est ce que le serveur attend, et
  // ce qui rend l'écriture atomique.
  return post({ action: 'saveBlocks', blocks: blocks.map((b) => ({ type: b.type, payload: b })) },
    "L'enregistrement a échoué.");
}

export function saveMeta(meta: Record<string, unknown>): Promise<unknown> {
  return post({ action: 'updateMeta', ...meta }, 'La mise à jour a échoué.');
}

export function setPublished(published: boolean): Promise<unknown> {
  return post({ action: 'publish', published }, published ? 'La publication a échoué.' : 'Le retrait a échoué.');
}

export function restoreRevision(revisionId: number): Promise<unknown> {
  return post({ action: 'restore', revisionId }, 'La restauration a échoué.');
}
