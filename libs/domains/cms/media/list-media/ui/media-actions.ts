import { readApiError } from '@nba/ui';
import { prepareUpload } from './media-upload';
import type { PickableMedia } from './media-types';

/**
 * Écritures de la médiathèque, adressées au relais de la médiathèque.
 *
 * La destination est nommée, et c'est tout l'intérêt : ces trois fonctions servent le
 * sélecteur de médias, qui s'ouvre depuis la médiathèque, depuis les actualités et
 * depuis l'éditeur de pages. Tant qu'elles visaient « la page courante » (`fetch('')`),
 * **chacun de ces trois écrans** devait savoir lire un `multipart/form-data` pour que le
 * même bouton « Déposer » fonctionne chez lui — trois ponts à tenir pour une seule
 * fonctionnalité, et un quatrième à écrire au prochain écran qui ouvrirait le sélecteur.
 *
 * Le relais reste, comme la page avant lui, le seul à parler à l'API interne, avec
 * l'identité tirée du jeton Cloudflare Access.
 */
const RELAIS = '/admin/api/cms/media';

/**
 * Dépose un fichier et renvoie le média, **avec ce qui lui est arrivé**.
 *
 * `cree` vaut faux quand l'empreinte du fichier était déjà connue : l'API déduplique par
 * contenu, et redéposer la même image rend la ligne existante au lieu d'en créer une
 * seconde. L'appelant doit le dire — annoncer « ajouté » quand rien ne l'a été envoie
 * chercher une vignette qui n'apparaîtra jamais.
 */
export async function uploadFile(
  file: File,
  alt: string
): Promise<{ media: PickableMedia; cree: boolean }> {
  const prepared = await prepareUpload(file);

  const form = new FormData();
  form.append('file', new File([prepared.blob], prepared.fileName, { type: prepared.blob.type }));
  form.append('alt', alt);
  if (prepared.width) form.append('width', String(prepared.width));
  if (prepared.height) form.append('height', String(prepared.height));

  const response = await fetch(RELAIS, { method: 'POST', body: form });
  if (!response.ok) throw new Error(await readApiError(response, 'Le dépôt a échoué.'));

  const body = (await response.json()) as { data?: PickableMedia; cree?: boolean };
  // Le fichier est déposé quoi qu'il arrive : le dire, plutôt que de laisser croire à un
  // échec qui pousserait l'utilisateur à recommencer et à créer un doublon.
  if (!body.data) throw new Error('Le fichier est déposé, mais la médiathèque ne l’a pas renvoyé : rouvrez le sélecteur.');
  // Un relais ancien qui ne transmettrait pas le drapeau vaut « créé » : c'est le cas de
  // loin le plus fréquent, et le message reste alors celui d'avant.
  return { media: body.data, cree: body.cree !== false };
}

/**
 * Reprend le texte alternatif d'un média.
 *
 * C'est le seul champ modifiable, et il en porte deux : ce que lit un lecteur d'écran
 * sur le site public, et le libellé sous lequel la médiathèque retrouve le fichier —
 * la recherche n'a que lui et une empreinte de seize caractères.
 */
export async function updateMediaAlt(id: number, alt: string): Promise<void> {
  const response = await fetch(RELAIS, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'update', id, alt })
  });
  if (!response.ok) throw new Error(await readApiError(response, 'La modification a échoué.'));
}

export async function deleteMedia(id: number): Promise<void> {
  const response = await fetch(RELAIS, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'delete', id })
  });
  if (!response.ok) throw new Error(await readApiError(response, 'La suppression a échoué.'));
}
