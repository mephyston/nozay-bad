import { flashAndReload } from './flash';
import { toast } from '../components/ui/sonner';

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
 *  - **succès** : on ferme *puis* on confirme via {@link flashAndReload}, qui rejoue le
 *    toast après le réaffichage de la liste (cf. `flash.ts` : un `toast()` émis avant la
 *    navigation serait perdu).
 */
export interface SubmitFormOptions<T> {
  /** L'écriture. Doit lever une erreur si le serveur refuse. */
  submit: () => Promise<T>;
  /** Confirmation à afficher, ou fonction du résultat de `submit`. */
  success: string | ((result: T) => string);
  /**
   * Contrôles préalables. Renvoie le message à afficher, ou `null` si tout est valide.
   * Aucune requête n'est émise tant qu'un message est renvoyé.
   */
  validate?: () => string | null;
  /** Ferme le sheet / la dialog. Appelé uniquement en cas de succès, avant la navigation. */
  close?: () => void;
  /**
   * Restitution de l'échec. Par défaut un toast d'erreur ; à surcharger par les écrans
   * qui affichent le message dans le formulaire lui-même.
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
  const fail = options.onError ?? ((message: string) => toast.error(message));

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
  flashAndReload(typeof options.success === 'function' ? options.success(result) : options.success, 'success', options.url);
  return true;
}
