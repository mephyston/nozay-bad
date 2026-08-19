import { writable } from 'svelte/store';

/**
 * Demande de confirmation, sous ses deux formes.
 *
 * La forme **objet** existait déjà chez les appelants — huit écrans la passaient, avec
 * un titre propre à l'action et un bouton nommé d'après elle — mais `uiConfirm` ne
 * déclarait qu'une chaîne : l'objet arrivait tel quel dans la description, et la
 * boîte affichait « [object Object] ». Rien ne l'avait signalé, `tsc` ne lisant pas
 * les fichiers `.svelte`, d'où le test qui accompagne ce module.
 *
 * La forme **chaîne** reste servie telle quelle : dix-sept appels s'en contentent, et
 * une question courte n'a pas besoin d'un titre distinct de son texte.
 */
export interface ConfirmOptions {
  /** Titre de la boîte. À défaut, « Confirmation ». */
  title?: string;
  /** La question elle-même, et ses conséquences. */
  description: string;
  /**
   * Intitulé du bouton d'action.
   *
   * Nommer l'acte — « Supprimer », « Restaurer » — plutôt que « Confirmer » : c'est le
   * dernier endroit où l'utilisateur peut encore comprendre ce qu'il déclenche.
   */
  confirmLabel?: string;
  cancelLabel?: string;
  /** Rend le bouton d'action rouge, pour une action sans retour. */
  destructive?: boolean;
}

export interface ConfirmRequest extends Required<ConfirmOptions> {
  resolve: (value: boolean) => void;
}

export const confirmStore = writable<ConfirmRequest | null>(null);

const DEFAULTS = {
  title: 'Confirmation',
  confirmLabel: 'Confirmer',
  cancelLabel: 'Annuler',
  destructive: false
};

export function uiConfirm(input: string | ConfirmOptions): Promise<boolean> {
  const options: ConfirmOptions = typeof input === 'string' ? { description: input } : input;
  return new Promise((resolve) => {
    confirmStore.set({ ...DEFAULTS, ...options, resolve });
  });
}
