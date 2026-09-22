import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mount, flushSync, unmount } from 'svelte';
import InvoicesManager from './InvoicesManager.svelte';

describe('InvoicesManager Component', () => {
  const seasons = [
    { id: '25-26', name: 'Saison 2025-2026', active: true },
    { id: '24-25', name: 'Saison 2024-2025', active: false }
  ];

  const invoices = [
    {
      id: 1,
      invoiceNumber: 'FAC-2526-NBA91-0001',
      seasonId: '25-26',
      date: '2026-07-14',
      dueDate: '2026-08-14',
      clientName: 'Mairie de Nozay',
      clientAddress: '1 Rue de la Mairie, 91620 Nozay',
      clientEmail: 'compta@nozay.fr',
      subject: 'Subvention 2026',
      location: 'Nozay',
      period: 'Année 2026',
      attendees: 'Association NBA 91',
      status: 'draft' as const,
      totalAmount: 150000, // 1500.00 €
      createdAt: '2026-07-14T10:00:00.000Z'
    }
  ];

  let originalFetch: typeof globalThis.fetch;
  let component: any;
  let targets: HTMLDivElement[] = [];

  beforeEach(() => {
    vi.useFakeTimers();
    originalFetch = globalThis.fetch;
    globalThis.fetch = vi.fn().mockImplementation(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ success: true })
      } as any)
    );
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    if (component) {
      unmount(component);
      component = undefined;
    }
    targets.forEach(t => {
      if (t.parentNode) {
        t.parentNode.removeChild(t);
      }
    });
    targets = [];
    vi.runAllTimers();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('renders invoices list correctly', () => {
    const target = document.createElement('div');
    document.body.appendChild(target);
    targets.push(target);

    component = mount(InvoicesManager, {
      target,
      props: {
        invoices,
        seasonId: '25-26',
        seasons
      }
    });
    flushSync();

    expect(target.innerHTML).toContain('FAC-2526-NBA91-0001');
    expect(target.innerHTML).toContain('Mairie de Nozay');
    expect(target.innerHTML.replace(/&nbsp;|[\u00a0\u202f]/g, ' ')).toContain('1 500,00');
    expect(target.innerHTML).toContain('Brouillon');
  });

  it('opens the create invoice modal when the button is clicked', async () => {
    const target = document.createElement('div');
    document.body.appendChild(target);
    targets.push(target);

    component = mount(InvoicesManager, {
      target,
      props: {
        invoices,
        seasonId: '25-26',
        seasons
      }
    });
    flushSync();

    // Verify modal is not showing initially
    expect(document.body.innerHTML).not.toContain('Informations Client');

    const createButton = Array.from(target.querySelectorAll('button')).find(
      b => b.textContent?.includes('Nouvelle facture')
    );
    expect(createButton).toBeDefined();

    createButton?.click();
    flushSync();

    // Verify modal is now displayed
    expect(document.body.innerHTML).toContain('Créer une facture');
    expect(document.body.innerHTML).toContain('Informations Client');
    expect(document.body.innerHTML).toContain('Nom du Client *');
    expect(document.body.innerHTML).toContain('Lignes de facturation');
  });
  /*
    La vue au doigt. Cette table n'en avait aucune : six colonnes défilaient
    horizontalement, ce que la doctrine interdit — et le menu d'actions se trouvait au
    bout de ce défilement, donc hors d'atteinte sans le chercher.
  */
  function monter(props: Record<string, unknown> = {}) {
    const target = document.createElement('div');
    document.body.appendChild(target);
    targets.push(target);
    component = mount(InvoicesManager, {
      target,
      props: { invoices, seasonId: '25-26', seasons, ...props }
    });
    flushSync();
    return target;
  }

  const libellesDeBalayage = (target: HTMLElement, rang = 0) => {
    const pistes = Array.from(target.querySelectorAll('[data-swipe-track]'));
    if (pistes.length <= rang) return [];
    return Array.from(pistes[rang].querySelectorAll('button')).map((b) => (b.textContent || '').trim());
  };

  it('projette une facture en rangée : client, numéro, date et montant', () => {
    const target = monter();

    const rangees = Array.from(target.querySelectorAll('[data-list-row]'));
    expect(rangees.length, 'la vue au doigt doit rendre une rangée par facture').toBe(1);
    const texte = (rangees[0].textContent ?? '').replace(/[\u00a0\u202f]/g, ' ');
    expect(texte).toContain('Mairie de Nozay');
    expect(texte).toContain('FAC-2526-NBA91-0001 · 2026-07-14');
    expect(texte).toContain('1 500,00');
    expect(texte).toContain('Brouillon');
  });

  it("révèle au balayage l'avancement d'abord, puis ce qui est sans retour", () => {
    const target = monter();
    // Un brouillon : avancer, modifier, imprimer, annuler, supprimer — les trois
    // premières révélées, le reste derrière « Plus… », règle de `ListRow`.
    expect(libellesDeBalayage(target).slice(0, 2)).toEqual([
      'Marquer en attente de règlement',
      'Modifier'
    ]);
  });

  it("ne laisse qu'imprimer sur une facture payée", () => {
    const target = monter({ invoices: [{ ...invoices[0], status: 'paid' as const }] });
    expect(libellesDeBalayage(target)).toEqual(['Imprimer']);
  });

  it('ne propose plus rien que la lecture sur une saison clôturée', () => {
    const target = monter({
      seasons: [{ id: '25-26', name: 'Saison 2025-2026', active: true, closed: true }]
    });
    expect(libellesDeBalayage(target)).toEqual(['Imprimer']);
  });
});
