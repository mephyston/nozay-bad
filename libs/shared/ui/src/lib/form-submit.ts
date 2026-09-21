import { flashAndReload } from './flash';
import { uiAlert } from '../components/ui/alert-dialog/confirm';

/**
 * Déroulé commun à toutes les soumissions de formulaire de l'admin.
 *
 * Chaque écran refaisait la même séquence à la main — valider, appeler l'API, fermer
 * le sheet, confirmer, rafraîchir la liste — et chacun en oubliait une étape : sheet
 * laissé ouvert, confirmation affichée dans une `<Alert>` qui disparaissait avec la
 * navigation, erreur silencieuse. `submitForm()` fixe l'ordre une bonne fois :
 *
 *  - **échec de validation** : rien n'est envoyé, le formulaire reste ouvert ;
 *  - **échec de l'écriture** : le formulaire reste ouvert avec les saisies, pour que
 *    l'utilisateur corrige au lieu de tout ressaisir ;
 *  - **succès** : on ferme, puis on réaffiche la liste via {@link flashAndReload}.
 *
 * Le message de succès est **facultatif, et l'exception**. Quand la liste réaffichée
 * porte déjà la trace de l'écriture — la ligne créée, modifiée ou disparue —, le
 * message ne fait que répéter ce que l'écran montre, en recouvrant justement l'endroit
 * qu'on vient de regarder. On ne le fournit que lorsque l'effet n'est visible nulle
 * part : un courriel parti, un export lancé, un cache invalidé.
 */
export interface SubmitFormOptions<T> {
  /** L'écriture. Doit lever une erreur si le serveur refuse. */
  submit: () => Promise<T>;
  /**
   * Confirmation à afficher, ou fonction du résultat de `submit`.
   *
   * À omettre lorsque la liste réaffichée porte déjà la trace de l'écriture — c'est
   * le cas courant. Voir l'en-tête du module.
   */
  success?: string | ((result: T) => string);
  /**
   * Contrôles préalables. Renvoie le message à afficher, ou `null` si tout est valide.
   * Aucune requête n'est émise tant qu'un message est renvoyé.
   */
  validate?: () => string | null;
  /** Ferme le sheet / la dialog. Appelé uniquement en cas de succès, avant la navigation. */
  close?: () => void;
  /**
   * Restitution de l'échec. Par défaut une alerte à acquitter ; à surcharger par les
   * écrans qui affichent le message dans le formulaire lui-même, ce qui reste
   * préférable quand il y a un formulaire pour l'accueillir.
   */
  onError?: (message: string) => void;
  /** Écran à afficher ensuite. Par défaut on réaffiche la page courante. */
  url?: string;
}

const DEFAULT_ERROR = 'Une erreur est survenue.';

/**
 * Exécute une soumission de formulaire. Renvoie `true` si l'écriture a abouti — auquel
 * cas une navigation est déjà en cours et l'appelant n'a plus rien à afficher.
 */
export async function submitForm<T>(options: SubmitFormOptions<T>): Promise<boolean> {
  const fail = options.onError ?? ((message: string) => void uiAlert(message));

  const invalid = options.validate?.();
  if (invalid) {
    fail(invalid);
    return false;
  }

  let result: T;
  try {
    result = await options.submit();
  } catch (err: unknown) {
    fail((err instanceof Error && err.message) || DEFAULT_ERROR);
    return false;
  }

  options.close?.();
  // Message vide : `consumeFlash` l'ignore, la liste se réaffiche sans rien annoncer.
  const message = typeof options.success === 'function' ? options.success(result) : (options.success ?? '');
  flashAndReload(message, 'success', options.url);
  return true;
}
