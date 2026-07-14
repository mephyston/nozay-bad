import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mount, flushSync } from 'svelte';
import BankStatementReconciliation from './BankStatementReconciliation.svelte';

describe('BankStatementReconciliation Component', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    global.fetch = vi.fn().mockImplementation((url, init) => {
      if (url === '/admin/compta/import' && init?.body) {
        const body = JSON.parse(init.body);
        if (body.action === 'get-unpaid-invoices') {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({
              success: true,
              data: [
                {
                  id: 101,
                  invoiceNumber: 'FAC-2026-0001',
                  seasonId: '25-26',
                  date: '2026-02-15',
                  dueDate: '2026-03-15',
                  clientName: 'Client Test',
                  clientAddress: null,
                  clientEmail: null,
                  subject: 'Prestation Test',
                  location: null,
                  period: null,
                  attendees: null,
                  status: 'sent',
                  totalAmount: 15600,
                  createdAt: '2026-02-15'
                },
                {
                  id: 102,
                  invoiceNumber: 'FAC-2026-0002',
                  seasonId: '25-26',
                  date: '2026-02-16',
                  dueDate: '2026-03-16',
                  clientName: 'Autre Client',
                  clientAddress: null,
                  clientEmail: null,
                  subject: 'Prestation 2',
                  location: null,
                  period: null,
                  attendees: null,
                  status: 'draft',
                  totalAmount: 5000,
                  createdAt: '2026-02-16'
                }
              ]
            })
          } as Response);
        }
        if (body.action === 'create' && body.invoiceId) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ success: true })
          } as Response);
        }
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ success: true })
      } as Response);
    });
  });

  afterEach(() => {
    global.fetch = originalFetch;
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('renders initial upload zone when no bank transactions are pending', () => {
    const target = document.createElement('div');
    document.body.appendChild(target);

    mount(BankStatementReconciliation, {
      target,
      props: {
        bankTransactions: [],
        glTransactions: [],
        seasonId: '25-26',
        seasons: [{ id: '25-26', name: 'Saison 2025-2026', active: true }],
        members: []
      }
    });

    expect(target.innerHTML).toContain('Importer un relevé Société Générale');
    expect(target.innerHTML).toContain("Lancer l'importation");
  });

  it('renders split-screen list and workspace when bank transactions exist', () => {
    const target = document.createElement('div');
    document.body.appendChild(target);

    mount(BankStatementReconciliation, {
      target,
      props: {
        bankTransactions: [
          {
            id: 1,
            fitid: 'TEST-FITID',
            accountId: 'current',
            amount: -1560,
            date: '2026-02-16',
            name: 'IONOS',
            memo: 'Facture web',
            status: 'pending',
            aiSuggestions: null
          }
        ],
        glTransactions: [
          {
            id: 10,
            type: 'depense',
            accountId: 'current',
            amount: -1560,
            date: '2026-02-16',
            description: 'Facture Ionos',
            category: null,
            bankTransactionId: null
          }
        ],
        seasonId: '25-26',
        seasons: [{ id: '25-26', name: 'Saison 2025-2026', active: true }],
        members: [
          {
            id: 42,
            licence: '0102030',
            lastName: 'Dupont',
            firstName: 'Jean',
            amountRemaining: 15000
          }
        ]
      }
    });

    expect(target.innerHTML).toContain('À rapprocher (1)');
    expect(target.innerHTML).toContain('IONOS');
    expect(target.innerHTML).toContain('-15.60 €');

    // Cliquer sur le bouton de la transaction pour l'activer dans le panneau droit
    const btn = Array.from(target.querySelectorAll('button')).find(b => b.textContent?.includes('IONOS')) as HTMLButtonElement;
    expect(btn).not.toBeNull();
    btn.click();
    flushSync();

    // Focus sur l'input de recherche adhérent pour ouvrir le dropdown
    const input = target.querySelector('input[placeholder="Tapez pour rechercher un adhérent..."]') as HTMLInputElement;
    expect(input).not.toBeNull();
    input.focus();
    flushSync();

    // Maintenant, "Dupont Jean" doit être visible dans le select d'association
    expect(target.innerHTML).toContain('Dupont Jean');
  });

  it('filters out already reconciled GL transactions from suggestions', () => {
    const target = document.createElement('div');
    document.body.appendChild(target);

    mount(BankStatementReconciliation, {
      target,
      props: {
        bankTransactions: [
          {
            id: 1,
            fitid: 'TEST-FITID-1',
            accountId: 'current',
            amount: 3150,
            date: '2026-04-23',
            name: 'VIR RECU 12345',
            memo: 'Achat volants',
            status: 'pending',
            aiSuggestions: null
          }
        ],
        glTransactions: [
          {
            id: 10,
            type: 'recette',
            accountId: 'current',
            amount: 3150,
            date: '2026-04-23',
            description: 'Volants Clement',
            category: null,
            bankTransactionId: 99
          }
        ],
        seasonId: '25-26',
        seasons: [{ id: '25-26', name: 'Saison 2025-2026', active: true }],
        members: []
      }
    });

    const btn = Array.from(target.querySelectorAll('button')).find(b => b.textContent?.includes('VIR RECU 12345')) as HTMLButtonElement;
    expect(btn).not.toBeNull();
    btn.click();
    flushSync();

    // Cliquer sur l'onglet Suggestions pour afficher la liste des suggestions
    const sugTabBtn = Array.from(target.querySelectorAll('button')).find(b => b.textContent?.includes('Suggestions')) as HTMLButtonElement;
    expect(sugTabBtn).not.toBeNull();
    sugTabBtn.click();
    flushSync();

    expect(target.innerHTML).not.toContain('Volants Clement');
    expect(target.innerHTML).toContain('Aucune écriture correspondante trouvée à +/- 7 jours.');
  });

  it('renders unpaid invoices in the invoice tab and handles matching', async () => {
    const target = document.createElement('div');
    document.body.appendChild(target);

    mount(BankStatementReconciliation, {
      target,
      props: {
        bankTransactions: [
          {
            id: 1,
            fitid: 'TEST-FITID-1',
            accountId: 'current',
            amount: 15600, // credit matching invoice totalAmount (15600 cents = 156.00 €)
            date: '2026-02-16',
            name: 'VIR RECU 12345',
            memo: 'Réglement facture',
            status: 'pending',
            aiSuggestions: null
          }
        ],
        glTransactions: [],
        seasonId: '25-26',
        seasons: [{ id: '25-26', name: 'Saison 2025-2026', active: true }],
        members: []
      }
    });

    // Select the bank transaction
    const btn = Array.from(target.querySelectorAll('button')).find(b => b.textContent?.includes('VIR RECU 12345')) as HTMLButtonElement;
    expect(btn).not.toBeNull();
    btn.click();
    flushSync();

    // Click on the Associer Facture tab
    const invoiceTabBtn = Array.from(target.querySelectorAll('button')).find(b => b.textContent?.includes('Associer Facture')) as HTMLButtonElement;
    expect(invoiceTabBtn).not.toBeNull();
    invoiceTabBtn.click();
    flushSync();

    // Wait for the async loadUnpaidInvoices to run and populate the state
    await new Promise(resolve => setTimeout(resolve, 50));
    flushSync();

    // Verify invoice information is displayed
    expect(target.innerHTML).toContain('Client Test');
    expect(target.innerHTML).toContain('FAC-2026-0001');
    expect(target.innerHTML).toContain('156.00 €'); // formatted totalAmount
    expect(target.innerHTML).toContain('Suggestion de Facture');

    // Verify the mock call triggers match
    const associateBtn = Array.from(target.querySelectorAll('button')).find(b => b.textContent?.trim() === 'Associer') as HTMLButtonElement;
    expect(associateBtn).not.toBeNull();

    // Mock window.location
    const reloadMock = vi.fn();
    vi.stubGlobal('location', {
      reload: reloadMock
    });

    associateBtn.click();
    await new Promise(resolve => setTimeout(resolve, 50));
    flushSync();

    expect(global.fetch).toHaveBeenCalledWith('/admin/compta/import', expect.any(Object));
    expect(reloadMock).toHaveBeenCalled();
  });
});
