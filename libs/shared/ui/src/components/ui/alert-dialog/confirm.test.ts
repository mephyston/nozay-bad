import { describe, it, expect } from 'vitest';
import { get } from 'svelte/store';
import { uiConfirm, confirmStore, uiAlert } from './confirm';

/**
 * Ce module n'a pas de test tant qu'il n'accepte qu'une chaîne — mais huit écrans lui
 * passaient un objet, et la boîte affichait « [object Object] » sans que rien n'échoue :
 * `tsc --noEmit` ne lit pas les `.svelte`, où vivent tous les appels.
 *
 * D'où ces cas, qui vérifient la **normalisation** : c'est elle qui garantit que la
 * boîte a toujours un titre, un intitulé de bouton et une description en clair, quelle
 * que soit la forme employée par l'appelant.
 */
function request() {
  const current = get(confirmStore);
  if (!current) throw new Error('aucune demande de confirmation en attente');
  return current;
}

describe('uiConfirm', () => {
  it('accepte une question courte, et la complète', () => {
    void uiConfirm('Supprimer ce chèque ?');
    expect(request()).toMatchObject({
      title: 'Confirmation',
      description: 'Supprimer ce chèque ?',
      confirmLabel: 'Confirmer',
      cancelLabel: 'Annuler',
      destructive: false
    });
  });

  it("garde le titre et l'intitulé de l'action quand on les fournit", () => {
    void uiConfirm({
      title: 'Retirer ce bloc ?',
      description: 'Son contenu sera perdu au prochain enregistrement.',
      confirmLabel: 'Retirer',
      destructive: true
    });
    expect(request()).toMatchObject({
      title: 'Retirer ce bloc ?',
      description: 'Son contenu sera perdu au prochain enregistrement.',
      confirmLabel: 'Retirer',
      cancelLabel: 'Annuler',
      destructive: true
    });
  });

  it('ne laisse jamais un objet atteindre la description', () => {
    void uiConfirm({ title: 'Titre', description: 'Texte' });
    expect(typeof request().description).toBe('string');
    expect(request().description).not.toContain('[object');
  });

  it('se dénoue sur la réponse de l’utilisateur', async () => {
    const answer = uiConfirm('Continuer ?');
    request().resolve(true);
    await expect(answer).resolves.toBe(true);
  });

  describe('uiAlert', () => {
    it('n’offre qu’un acquittement, jamais un refus', () => {
      void uiAlert('La saison est clôturée : plus aucune écriture ne peut y être ajoutée.');
      expect(request().mode).toBe('alert');
      expect(request().title).toBe('Action impossible');
      expect(request().confirmLabel).toBe("J'ai compris");
    });

    it('se dénoue quand le message a été lu', async () => {
      const lu = uiAlert('Refusé.');
      request().resolve(true);
      await expect(lu).resolves.toBeUndefined();
    });
  });
});
