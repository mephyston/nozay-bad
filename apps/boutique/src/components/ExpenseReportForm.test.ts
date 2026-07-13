import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mount, flushSync } from 'svelte';
import ExpenseReportForm from './ExpenseReportForm.svelte';

describe('ExpenseReportForm Component', () => {
  let originalFetch: typeof global.fetch;

  const members = [
    { id: 1, firstName: 'Jean', lastName: 'Dupont', licence: '123456' },
    { id: 2, firstName: 'Marie', lastName: 'Curie', licence: '654321' }
  ];

  beforeEach(() => {
    originalFetch = global.fetch;
    global.fetch = vi.fn().mockImplementation(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ success: true, data: { id: 100 } })
      } as any)
    );
  });

  afterEach(() => {
    global.fetch = originalFetch;
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
});
