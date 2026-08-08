import { prepareUpload } from './media-upload';

/**
 * Écritures de la médiathèque, adressées à la page elle-même.
 *
 * Même convention que les autres écrans : la page d'administration est le seul point
 * d'entrée, et c'est elle qui parle à l'API avec l'identité de l'utilisateur.
 */

export async function uploadFile(file: File, alt: string): Promise<void> {
  const prepared = await prepareUpload(file);

  const form = new FormData();
  form.append('file', new File([prepared.blob], prepared.fileName, { type: prepared.blob.type }));
  form.append('alt', alt);
  if (prepared.width) form.append('width', String(prepared.width));
  if (prepared.height) form.append('height', String(prepared.height));

  const response = await fetch('', { method: 'POST', body: form });
  if (!response.ok) throw new Error(await extractError(response, 'Le dépôt a échoué.'));
}

export async function deleteMedia(id: number): Promise<void> {
  const response = await fetch('', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'delete', id })
  });
  if (!response.ok) throw new Error(await extractError(response, 'La suppression a échoué.'));
}

async function extractError(response: Response, fallback: string): Promise<string> {
  try {
    const body = (await response.json()) as { error?: string };
    return body.error ?? fallback;
  } catch {
    return fallback;
  }
}
