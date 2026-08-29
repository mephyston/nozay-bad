import { prepareUpload } from './media-upload';
import type { PickableMedia } from './media-types';

/**
 * Écritures de la médiathèque, adressées à la page elle-même.
 *
 * Même convention que les autres écrans : la page d'administration est le seul point
 * d'entrée, et c'est elle qui parle à l'API avec l'identité de l'utilisateur.
 *
 * Corollaire à ne pas perdre de vue : `fetch('')` vise **la page courante**. Tout écran
 * qui déclenche un dépôt doit donc savoir lire un `multipart/form-data`, sinon la
 * requête tombe dans son pont JSON et échoue. C'est ce qu'ont ajouté les écrans des
 * actualités et des pages, pour pouvoir déposer sans quitter le formulaire.
 */

/** Renvoie le média créé : le sélecteur l'affiche et le choisit sans recharger la page. */
export async function uploadFile(file: File, alt: string): Promise<PickableMedia> {
  const prepared = await prepareUpload(file);

  const form = new FormData();
  form.append('file', new File([prepared.blob], prepared.fileName, { type: prepared.blob.type }));
  form.append('alt', alt);
  if (prepared.width) form.append('width', String(prepared.width));
  if (prepared.height) form.append('height', String(prepared.height));

  const response = await fetch('', { method: 'POST', body: form });
  if (!response.ok) throw new Error(await extractError(response, 'Le dépôt a échoué.'));

  const body = (await response.json()) as { data?: PickableMedia };
  // Le fichier est déposé quoi qu'il arrive : le dire, plutôt que de laisser croire à un
  // échec qui pousserait l'utilisateur à recommencer et à créer un doublon.
  if (!body.data) throw new Error('Le fichier est déposé, mais la médiathèque ne l’a pas renvoyé : rouvrez le sélecteur.');
  return body.data;
}

/**
 * Reprend le texte alternatif d'un média.
 *
 * C'est le seul champ modifiable, et il en porte deux : ce que lit un lecteur d'écran
 * sur le site public, et le libellé sous lequel la médiathèque retrouve le fichier —
 * la recherche n'a que lui et une empreinte de seize caractères.
 */
export async function updateMediaAlt(id: number, alt: string): Promise<void> {
  const response = await fetch('', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'update', id, alt })
  });
  if (!response.ok) throw new Error(await extractError(response, 'La modification a échoué.'));
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
