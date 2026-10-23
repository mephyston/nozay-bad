import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mount, flushSync } from 'svelte';
import ExpenseReportForm from './ExpenseReportForm.svelte';

describe('ExpenseReportForm Component', () => {
  let originalFetch: typeof globalThis.fetch;

  const members = [
    { id: 1, firstName: 'Jean', lastName: 'Dupont', licence: '123456' },
    { id: 2, firstName: 'Marie', lastName: 'Curie', licence: '654321' }
  ];

  beforeEach(() => {
    vi.useFakeTimers();
    originalFetch = globalThis.fetch;
    globalThis.fetch = vi.fn().mockImplementation(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ success: true, data: { id: 100 } })
      } as any)
    );
  });

  afterEach(() => {
    vi.runAllTimers();
    vi.useRealTimers();
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it('renders form elements correctly', () => {
    const target = document.createElement('div');
    document.body.appendChild(target);

    mount(ExpenseReportForm, {
      target,
      props: {
        activeSeasonId: '25-26',
        members
      }
    });
    flushSync();

    expect(target.innerHTML).toContain("Saisir une note de frais");
    expect(target.innerHTML).toContain("Demandeur (Adhérent)");
    expect(target.innerHTML).toContain("Catégorie de dépense");
    expect(target.innerHTML).toContain("Montant (€)");
    expect(target.innerHTML).toContain("Description / Motif des frais");
  });

  it('uses design system components from @nba/ui', () => {
    const target = document.createElement('div');
    document.body.appendChild(target);

    mount(ExpenseReportForm, {
      target,
      props: {
        activeSeasonId: '25-26',
        members
      }
    });
    flushSync();

    // Check for Card component (represented by data-slot="card")
    expect(target.querySelector('[data-slot="card"]')).not.toBeNull();
    expect(target.querySelector('[data-slot="card-header"]')).not.toBeNull();
    expect(target.querySelector('[data-slot="card-title"]')).not.toBeNull();
    expect(target.querySelector('[data-slot="card-content"]')).not.toBeNull();

    // Check for Input component (data-slot="input")
    const inputs = target.querySelectorAll('[data-slot="input"]');
    expect(inputs.length).toBeGreaterThanOrEqual(1);

    // Les listes de sélection utilisent désormais SearchableCombobox (role=combobox)
    expect(target.querySelector('[role="combobox"]')).not.toBeNull();

    // Check for Label component (data-slot="label")
    expect(target.querySelector('[data-slot="label"]')).not.toBeNull();
  });

  it('remplace le formulaire par une confirmation une fois la note envoyée, PDF compris', async () => {
    // FileReader s'appuie sur les vraies minuteries de jsdom ; jsdom ne fait pas défiler.
    vi.useRealTimers();
    Element.prototype.scrollIntoView = vi.fn();
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ success: true })
    } as any);
    const target = document.createElement('div');
    document.body.appendChild(target);
    mount(ExpenseReportForm, {
      target,
      props: { activeSeasonId: '25-26', members, lockToMembers: true, initialMemberId: '1' }
    });
    flushSync();

    const saisir = (selecteur: string, valeur: string) => {
      const champ = target.querySelector<HTMLInputElement>(selecteur)!;
      champ.value = valeur;
      champ.dispatchEvent(new Event('input', { bubbles: true }));
    };
    saisir('#amount', '12.5');
    saisir('#description', 'Volants');
    const fichier = target.querySelector<HTMLInputElement>('#receipt')!;
    expect(fichier.accept).toContain('application/pdf');
    Object.defineProperty(fichier, 'files', {
      value: [new File([new Uint8Array(20)], 'facture.pdf', { type: 'application/pdf' })]
    });
    fichier.dispatchEvent(new Event('change', { bubbles: true }));
    await vi.waitFor(() => expect(target.textContent).toContain('facture.pdf'));

    target.querySelector('form')!.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    await vi.waitFor(() => expect(target.textContent).toContain('Note de frais envoyée'));

    const corps = JSON.parse((globalThis.fetch as any).mock.calls[0][1].body);
    expect(corps.data.photoUrl.startsWith('data:application/pdf;base64,')).toBe(true);
    expect(target.textContent).toContain('12,50 €');
    expect(target.textContent).toContain('Volants');
    expect(target.querySelector('form')).toBeNull();

    target.querySelector<HTMLButtonElement>('[role="status"] button')!.click();
    flushSync();
    expect(target.querySelector('form')).not.toBeNull();
    vi.useFakeTimers(); // attendu par l'afterEach
  });
});
