import { describe, it, expect, afterEach } from 'vitest';
import { mount, unmount, flushSync } from 'svelte';
import MatchTransaction from './MatchTransaction.svelte';

let component: any = null;

afterEach(() => {
  if (component) { unmount(component); component = null; }
  document.body.innerHTML = '';
});

const entry = (over: Record<string, any> = {}) => ({
  id: 10, type: 'recette', accountId: 1, amount: 15000, date: '2026-02-16',
  description: 'Cotisation Dupont', bankStatementLineId: null, ...over
});

const member = (over: Record<string, any> = {}) => ({
  id: 42, licence: '0102030', lastName: 'Dupont', firstName: 'Jean', amountRemaining: 0, ...over
});

function render(props: Record<string, any> = {}) {
  const target = document.createElement('div');
  document.body.appendChild(target);
  component = mount(MatchTransaction, {
    target,
    props: {
      glTransactions: [],
      selectedTx: { id: 1, amount: 15000, date: '2026-02-16' },
      suggestions: [],
      isSubmitting: false,
      selectedMemberId: '',
      sortedMembers: [],
      onMatch: () => {},
      ...props
    }
  });
  flushSync();
  return target;
}

describe('MatchTransaction', () => {
  /*
    La liste affichait TOUTES les écritures non pointées — jusqu'à deux mille lignes de tableau —
    tout en annonçant « à ±7 jours » quand elle était vide.
  */
  it('ne montre d\'emblée que les correspondances à ±7 jours', () => {
    const target = render({
      suggestions: [entry({ id: 10, description: 'CANDIDAT EXACT' })],
      glTransactions: [
        entry({ id: 10, description: 'CANDIDAT EXACT' }),
        entry({ id: 11, description: 'ECRITURE LOINTAINE', date: '2025-12-01' })
      ]
    });

    expect(target.innerHTML).toContain('CANDIDAT EXACT');
    expect(target.innerHTML).not.toContain('ECRITURE LOINTAINE');
  });

  it('annonce honnêtement l\'absence de correspondance', () => {
    const target = render({ glTransactions: [entry({ id: 11, description: 'AUTRE' })] });

    expect(target.innerHTML).toContain('Aucune écriture correspondante trouvée à ±7 jours.');
    expect(target.innerHTML).toContain('Autres écritures non pointées (1)');
  });

  it('atteint les autres écritures sur demande explicite', () => {
    const target = render({
      glTransactions: [entry({ id: 11, description: 'ECRITURE LOINTAINE', date: '2025-12-01' })]
    });

    const showAll = Array.from(target.querySelectorAll('button')).find(
      (b) => b.textContent?.includes('Tout afficher')
    ) as HTMLButtonElement;
    expect(showAll).not.toBeUndefined();
    showAll.click();
    flushSync();

    expect(target.innerHTML).toContain('ECRITURE LOINTAINE');
  });

  it('associe la bonne écriture', () => {
    let matched: number | null = null;
    const target = render({
      suggestions: [entry({ id: 77 })],
      glTransactions: [entry({ id: 77 })],
      onMatch: (id: number) => { matched = id; }
    });

    const btn = Array.from(target.querySelectorAll('button')).find(
      (b) => b.textContent?.includes('Associer')
    ) as HTMLButtonElement;
    btn.click();
    flushSync();

    expect(matched).toBe(77);
  });

  it("n'associe rien sur un exercice clôturé", () => {
    const target = render({
      suggestions: [entry({ id: 77 })],
      glTransactions: [entry({ id: 77 })],
      isClosed: true
    });

    const btn = Array.from(target.querySelectorAll('button')).find(
      (b) => b.textContent?.includes('Associer')
    ) as HTMLButtonElement;
    expect(btn.disabled).toBe(true);
  });

  /*
    Le sélecteur d'adhérents était vide en permanence : le composant déclarait `sortedMembers`,
    que le panneau ne lui passait pas. Une prop manquante n'échoue pas — elle arrive `undefined`.
  */
  it('propose les adhérents qu\'on lui passe', () => {
    const target = render({ sortedMembers: [member(), member({ id: 43, lastName: 'Martin', firstName: 'Léa' })] });

    const toggle = Array.from(target.querySelectorAll('button')).find(
      (b) => b.textContent?.includes('Choisir un adhérent')
    ) as HTMLButtonElement;
    expect(toggle).not.toBeUndefined();

    // Fermé, aucun adhérent n'est dans le DOM : le menu est monté, pas masqué en CSS.
    expect(target.innerHTML).not.toContain('Dupont');

    toggle.click();
    flushSync();
    expect(target.innerHTML).toContain('Dupont');
    expect(target.innerHTML).toContain('Martin');
  });

  it('affiche l\'adhérent déjà lié', () => {
    const target = render({ sortedMembers: [member()], selectedMemberId: '42' });

    expect(target.innerHTML).toContain('Dupont Jean');
  });

  /*
    Le bloc « Suggestion de rapprochement IA » affichait ces mêmes écritures en lisant sur chacune
    un champ `reasoning` qu'une écriture ne porte pas, et son bouton appelait une prop jamais
    passée. Il ne doit pas revenir.
  */
  it('ne présente plus les écritures comme des suggestions du modèle', () => {
    const target = render({ suggestions: [entry()], glTransactions: [entry()] });

    expect(target.innerHTML).not.toContain('Suggestion de rapprochement IA');
    expect(target.innerHTML).not.toContain('Appliquer');
  });
});
