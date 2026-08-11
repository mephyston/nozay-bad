import type { PickableMedia } from './media-types';

/**
 * Médias déposés depuis un sélecteur, le temps de la page.
 *
 * La liste que reçoit un sélecteur est chargée par la page d'administration au rendu :
 * un fichier déposé ensuite n'y figure pas. Recharger la page le ferait apparaître,
 * mais emporterait le brouillon en cours — c'est précisément ce que le dépôt sur place
 * cherche à éviter.
 *
 * D'où cette liste partagée par tous les sélecteurs de la page : le fichier déposé
 * depuis le bloc texte est aussi visible depuis le choix de couverture, sans qu'aucun
 * écran n'ait à faire redescendre quoi que ce soit à ses enfants.
 */
const uploads = $state<PickableMedia[]>([]);

/** Ajoute un média fraîchement déposé, en tête — c'est celui qu'on vient de choisir. */
export function rememberUpload(media: PickableMedia): void {
  if (!uploads.some((item) => item.id === media.id)) uploads.unshift(media);
}

export function recentUploads(): PickableMedia[] {
  return uploads;
}

/**
 * Choix d'un média, exposé sous forme de promesse.
 *
 * `RichTextEditor` appartient à `@nba/ui` et ignore tout de la médiathèque : il réclame
 * un média et attend une réponse. Côté domaine, il faut donc ouvrir un sheet et dénouer
 * la promesse au choix de l'utilisateur — mécanique identique pour l'image et pour le
 * document, dans les actualités comme dans les pages. Elle vit ici une seule fois.
 *
 * Chaque appel produit un sélecteur **indépendant** : deux sélecteurs ouverts par le
 * même écran ne peuvent pas se dénouer l'un l'autre.
 */
export function createMediaPick<T>(toValue: (media: PickableMedia) => T) {
  let open = $state(false);
  let resolve: ((value: T | null) => void) | null = null;

  return {
    get open() {
      return open;
    },
    set open(value: boolean) {
      open = value;
      // Fermeture sans choix : la promesse doit être dénouée, sinon l'éditeur attend
      // indéfiniment et son bouton ne répond plus.
      if (!value && resolve) {
        resolve(null);
        resolve = null;
      }
    },
    /** Ouvre le sélecteur et attend le choix. `null` si l'utilisateur renonce. */
    request(): Promise<T | null> {
      open = true;
      return new Promise((r) => {
        resolve = r;
      });
    },
    /** À brancher sur `onSelect` du `MediaPicker`. */
    choose(media: PickableMedia) {
      resolve?.(toValue(media));
      resolve = null;
      open = false;
    }
  };
}

/** Chemin public d'un média. */
export const mediaHref = (media: PickableMedia) => `/media/${media.key.replace(/^media\//, '')}`;

/** Valeur attendue par `onPickImage` de `RichTextEditor`. */
export const asImage = (media: PickableMedia) => ({
  src: mediaHref(media),
  alt: media.alt,
  width: media.width,
  height: media.height
});

/** Valeur attendue par `onPickFile` de `RichTextEditor`. */
export const asFileLink = (media: PickableMedia) => ({
  href: mediaHref(media),
  label: media.alt || media.key.split('/').pop() || 'Document'
});
