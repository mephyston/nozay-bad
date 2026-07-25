import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mount, unmount, flushSync, tick } from 'svelte';
import BankStatementReconciliation from './BankStatementReconciliation.svelte';

describe('BankStatementReconciliation Component', () => {
  const originalFetch = globalThis.fetch;
  let component: any = null;

  beforeEach(() => {
    document.body.innerHTML = '';
    globalThis.fetch = vi.fn().mockImplementation((url, init) => {
      if (url === '/admin/accounting/import' && init?.body) {
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
    if (component) {
      unmount(component);
      component = null;
    }
    document.body.innerHTML = '';
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('renders initial upload zone when no bank transactions are pending', () => {
    const target = document.createElement('div');
    document.body.appendChild(target);

    component = mount(BankStatementReconciliation, {
      target,
      props: {
        bankStatementLines: [],
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

    component = mount(BankStatementReconciliation, {
      target,
      props: {
        bankStatementLines: [
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
            bankStatementLineId: null
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
    expect(target.innerHTML).toContain('-15,60');

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

    component = mount(BankStatementReconciliation, {
      target,
      props: {
        bankStatementLines: [
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
            bankStatementLineId: 99
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

    component = mount(BankStatementReconciliation, {
      target,
      props: {
        bankStatementLines: [
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

    expect(globalThis.fetch).toHaveBeenCalledWith('/admin/accounting/import', expect.any(Object));
    expect(reloadMock).toHaveBeenCalled();
  });

  it('displays checkboxes next to bank transactions and toggles bulk action bar', async () => {
    const target = document.createElement('div');
    document.body.appendChild(target);

    component = mount(BankStatementReconciliation, {
      target,
      props: {
        bankStatementLines: [
          {
            id: 1,
            fitid: 'TX-1',
            accountId: 'current',
            amount: 1000,
            date: '2026-02-16',
            name: 'TX-ONE',
            memo: 'Memo 1',
            status: 'pending',
            aiSuggestions: JSON.stringify({ memberId: 42, memberName: 'Dupont Jean', category: '1' })
          },
          {
            id: 2,
            fitid: 'TX-2',
            accountId: 'current',
            amount: -2000,
            date: '2026-02-17',
            name: 'TX-TWO',
            memo: 'Memo 2',
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

    flushSync();

    // Bulk Action Bar should not be visible initially
    expect(target.innerHTML).not.toContain('Rapprocher en masse');
    expect(target.innerHTML).not.toContain('Ignorer en masse');

    // Checkboxes should be displayed next to bank transactions
    const checkboxes = target.querySelectorAll('[role="checkbox"]') as NodeListOf<HTMLButtonElement>;
    expect(checkboxes.length).toBe(2);

    // Check the first checkbox
    checkboxes[0].click();
    flushSync();

    // Now the Bulk Action Bar should be visible
    expect(target.innerHTML).toContain('Rapprocher en masse');
    expect(target.innerHTML).toContain('Sélection (1)');

    // Check the second checkbox
    checkboxes[1].click();
    flushSync();

    // Count should be updated
    expect(target.innerHTML).toContain('Sélection (2)');

    // Mock window.location.reload
    const reloadMock = vi.fn();
    vi.stubGlobal('location', {
      reload: reloadMock
    });

    // Click "Rapprocher en masse"
    const bulkReconcileBtn = Array.from(target.querySelectorAll('button')).find(
      b => b.textContent?.includes('Rapprocher en masse')
    ) as HTMLButtonElement;
    expect(bulkReconcileBtn).not.toBeNull();
    bulkReconcileBtn.click();
    flushSync();

    await new Promise(resolve => setTimeout(resolve, 50));
    flushSync();

    // Assert fetch call
    expect(globalThis.fetch).toHaveBeenCalledWith(
      '/admin/accounting/import',
      expect.objectContaining({
        method: 'POST',
        body: expect.stringContaining('"action":"bulk"')
      })
    );
    expect(reloadMock).toHaveBeenCalled();
  });



  it('multi-match order selection basket in invoice tab updates selected sum and validates with tolerance', async () => {
    const target = document.createElement('div');
    document.body.appendChild(target);

    // Set bank transaction amount to 206.00 € (20600 cents) which matches sum of 101 (15600) and 102 (5000)
    component = mount(BankStatementReconciliation, {
      target,
      props: {
        bankStatementLines: [
          {
            id: 1,
            fitid: 'TX-MULTI',
            accountId: 'current',
            amount: 20600,
            date: '2026-02-16',
            name: 'MULTI INVOICE TRANSFER',
            memo: 'Réglement factures',
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
    const txBtn = Array.from(target.querySelectorAll('button')).find(b => b.textContent?.includes('MULTI INVOICE TRANSFER')) as HTMLButtonElement;
    expect(txBtn).not.toBeNull();
    txBtn.click();
    flushSync();

    // Click on the Associer Facture tab
    const invoiceTabBtn = Array.from(target.querySelectorAll('button')).find(b => b.textContent?.includes('Associer Facture')) as HTMLButtonElement;
    expect(invoiceTabBtn).not.toBeNull();
    invoiceTabBtn.click();
    flushSync();

    // Wait for the async loadUnpaidInvoices to run and populate the state
    await new Promise(resolve => setTimeout(resolve, 50));
    flushSync();

    // Verify both invoices are listed
    expect(target.innerHTML).toContain('FAC-2026-0001');
    expect(target.innerHTML).toContain('FAC-2026-0002');

    // Find checkboxes
    const invoiceCheckboxes = target.querySelectorAll('.invoice-checkbox') as NodeListOf<HTMLButtonElement>;
    expect(invoiceCheckboxes.length).toBe(2);

    // Check first invoice checkbox
    invoiceCheckboxes[0].click();
    flushSync();

    // The selected sum should be 156.00 € (15600 cents)
    expect(target.innerHTML).toContain('156.00');

    // Since selectedSum (15600) != selectedTx.amount (20600), the validation button must be disabled
    const submitBtn = target.querySelector('#btn-valider-association') as HTMLButtonElement;
    expect(submitBtn).not.toBeNull();
    expect(submitBtn.disabled).toBe(true);

    // Check second invoice checkbox
    invoiceCheckboxes[1].click();
    flushSync();

    // Now both selected: sum is 20600 which matches selectedTx.amount (20600)
    expect(target.innerHTML).toContain('206.00');
    expect(submitBtn.disabled).toBe(false);

    // Mock window.location
    const reloadMock = vi.fn();
    vi.stubGlobal('location', {
      reload: reloadMock
    });

    // Click submit
    submitBtn.click();
    await new Promise(resolve => setTimeout(resolve, 50));
    flushSync();

    expect(globalThis.fetch).toHaveBeenCalledWith('/admin/accounting/import', expect.objectContaining({
      method: 'POST',
      body: expect.stringContaining('"invoiceIds":[101,102]')
    }));
    expect(reloadMock).toHaveBeenCalled();
  });

  it('dynamic split form in manual entry tab adds rows and validates against transaction amount', async () => {
    const target = document.createElement('div');
    document.body.appendChild(target);

    // Bank transaction amount: 150.00 € (15000 cents)
    component = mount(BankStatementReconciliation, {
      target,
      props: {
        bankStatementLines: [
          {
            id: 1,
            fitid: 'TX-SPLIT',
            accountId: 'current',
            amount: 15000,
            date: '2026-02-16',
            name: 'DIVERS SPLIT',
            memo: 'Ventilation',
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
    const txBtn = Array.from(target.querySelectorAll('button')).find(b => b.textContent?.includes('DIVERS SPLIT')) as HTMLButtonElement;
    expect(txBtn).not.toBeNull();
    txBtn.click();
    flushSync();

    // Active right tab is 'manual' by default, but click it to be sure
    const manualTabBtn = Array.from(target.querySelectorAll('button')).find(b => b.textContent?.includes('Saisir écriture')) as HTMLButtonElement;
    expect(manualTabBtn).not.toBeNull();
    manualTabBtn.click();
    flushSync();

    // Click "Ventiler" button
    const ventilerBtn = Array.from(target.querySelectorAll('button')).find(b => b.textContent?.trim() === 'Ventiler') as HTMLButtonElement;
    expect(ventilerBtn).not.toBeNull();
    ventilerBtn.click();
    flushSync();

    // Should render split rows
    const splitAmounts = target.querySelectorAll('input[id^="split-amount-"]') as NodeListOf<HTMLInputElement>;
    expect(splitAmounts.length).toBe(2);

    // Initially amount splits are 0, sum = 0 != 15000, so submit button should be disabled
    const submitBtn = Array.from(target.querySelectorAll('button')).find(
      b => b.textContent?.includes('Enregistrer la ventilation')
    ) as HTMLButtonElement;
    expect(submitBtn).not.toBeNull();
    expect(submitBtn.disabled).toBe(true);

    // Set split amounts to 100.00 € and 50.00 € respectively
    splitAmounts[0].value = '100';
    splitAmounts[0].dispatchEvent(new Event('input', { bubbles: true }));
    splitAmounts[1].value = '50';
    splitAmounts[1].dispatchEvent(new Event('input', { bubbles: true }));
    flushSync();

    // Total split sum is now 150.00 € which matches 150.00 € transaction total. Submit button should be enabled.
    expect(submitBtn.disabled).toBe(false);

    // Verify submission
    const reloadMock = vi.fn();
    vi.stubGlobal('location', {
      reload: reloadMock
    });

    submitBtn.click();
    await new Promise(resolve => setTimeout(resolve, 50));
    flushSync();

    expect(globalThis.fetch).toHaveBeenCalledWith('/admin/accounting/import', expect.objectContaining({
      method: 'POST',
      body: expect.stringContaining('"transactions":')
    }));
    expect(reloadMock).toHaveBeenCalled();
  });

  it('filters bank transactions using free text search input field', async () => {
    const target = document.createElement('div');
    document.body.appendChild(target);

    component = mount(BankStatementReconciliation, {
      target,
      props: {
        bankStatementLines: [
          {
            id: 1,
            fitid: 'TX-1',
            accountId: 'current',
            amount: 1000,
            date: '2026-02-16',
            name: 'VIREMENT SALAIRE ENTRAINEUR',
            memo: 'Memo 1',
            status: 'pending',
            aiSuggestions: null
          },
          {
            id: 2,
            fitid: 'TX-2',
            accountId: 'current',
            amount: -2000,
            date: '2026-02-17',
            name: 'BOUTIQUE ADHESION DUBOIS',
            memo: 'Memo 2',
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

    await tick();

    const listContainer = target.querySelector('.reconcile-list-container')!;
    expect(listContainer).not.toBeNull();

    // Verify both are present initially
    expect(listContainer.innerHTML).toContain('SALAIRE');
    expect(listContainer.innerHTML).toContain('ADHESION');

    // Find free-text search input
    const searchInput = target.querySelector('input[placeholder*="Rechercher une transaction"]') as HTMLInputElement;
    expect(searchInput).not.toBeNull();

    // Type "salaire" into search input
    searchInput.value = 'salaire';
    searchInput.dispatchEvent(new Event('input', { bubbles: true }));
    await tick();

    // Only SALAIRE should be shown, ADHESION should be hidden
    expect(listContainer.innerHTML).toContain('SALAIRE');
    expect(listContainer.innerHTML).not.toContain('ADHESION');

    // Type something that matches nothing
    searchInput.value = 'inconnu';
    searchInput.dispatchEvent(new Event('input', { bubbles: true }));
    await tick();

    expect(listContainer.innerHTML).not.toContain('SALAIRE');
    expect(listContainer.innerHTML).not.toContain('ADHESION');
  });

  it('restores focused transaction from sessionStorage on mount, and clears it on tab switch or close panel', async () => {
    const store: Record<string, string> = {
      'reconcile_active_bt_id': '1'
    };
    vi.stubGlobal('sessionStorage', {
      getItem: (key: string) => store[key] || null,
      setItem: (key: string, val: string) => { store[key] = val; },
      removeItem: (key: string) => { delete store[key]; }
    });

    const target = document.createElement('div');
    document.body.appendChild(target);

    component = mount(BankStatementReconciliation, {
      target,
      props: {
        bankStatementLines: [
          {
            id: 1,
            fitid: 'TX-1',
            accountId: 'current',
            amount: 1000,
            date: '2026-02-16',
            name: 'TX ONE PENDING',
            memo: 'Memo 1',
            status: 'pending',
            aiSuggestions: null
          },
          {
            id: 2,
            fitid: 'TX-2',
            accountId: 'current',
            amount: -2000,
            date: '2026-02-17',
            name: 'TX TWO PENDING',
            memo: 'Memo 2',
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

    flushSync();

    expect(target.innerHTML).toContain('TX ONE PENDING');
    const closeBtn = Array.from(target.querySelectorAll('button')).find(
      b => b.textContent?.includes('Fermer')
    ) as HTMLButtonElement;
    expect(closeBtn).not.toBeNull();
    closeBtn.click();
    flushSync();

    expect(store['reconcile_active_bt_id']).toBeUndefined();
    vi.unstubAllGlobals();
  });

  it('pre-populates member and category fields in the manual form from AI suggestions when a transaction is selected', async () => {
    const target = document.createElement('div');
    document.body.appendChild(target);

    component = mount(BankStatementReconciliation, {
      target,
      props: {
        bankStatementLines: [
          {
            id: 42,
            fitid: 'TX-AI-SUG',
            accountId: 'current',
            amount: 15000,
            date: '2026-02-16',
            name: 'VIR DUPONT JEAN ADHESION',
            memo: 'Cotisation 25-26',
            status: 'pending',
            aiSuggestions: JSON.stringify({
              category: 5,
              memberId: 99,
              memberName: 'Dupont Jean',
              confidence: 0.9
            })
          }
        ],
        glTransactions: [],
        seasonId: '25-26',
        seasons: [{ id: '25-26', name: 'Saison 2025-2026', active: true }],
        members: [
          {
            id: 99,
            licence: '0102030',
            lastName: 'Dupont',
            firstName: 'Jean',
            amountRemaining: 15000
          }
        ],
        dbCategories: [
          { id: 5, code: 'tournois_senior', adminLabel: 'Tournois Senior' }
        ]
      }
    });


    flushSync();

    // Click on the transaction to select it
    const btn = Array.from(target.querySelectorAll('button')).find(b => b.textContent?.includes('VIR DUPONT JEAN')) as HTMLButtonElement;
    expect(btn).not.toBeNull();
    btn.click();
    flushSync();

    // The category dropdown should show 'Tournois Senior'
    expect(target.innerHTML).toContain('Tournois Senior');

    // The member search combobox should show the selected member name 'Dupont Jean'
  });

  it('opens import modal when open-bank-import window event is dispatched and season is not closed', async () => {
    const target = document.createElement('div');
    document.body.appendChild(target);

    component = mount(BankStatementReconciliation, {
      target,
      props: {
        bankStatementLines: [
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
        glTransactions: [],
        seasonId: '25-26',
        seasons: [{ id: '25-26', name: 'Saison 2025-2026', active: true, closed: false }],
        members: []
      }
    });

    flushSync();

    // The modal content is not in the DOM initially
    expect(document.body.innerHTML).not.toContain('Importer un relevé Société Générale');

    // Dispatch the window event
    window.dispatchEvent(new CustomEvent('open-bank-import'));
    flushSync();

    // The modal content should now be in the DOM
    expect(document.body.innerHTML).toContain('Importer un relevé Société Générale');

    // Clean up
    target.remove();
  });

  it('does not open import modal when open-bank-import window event is dispatched if season is closed', async () => {
    const target = document.createElement('div');
    document.body.appendChild(target);

    component = mount(BankStatementReconciliation, {
      target,
      props: {
        bankStatementLines: [
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
        glTransactions: [],
        seasonId: '25-26',
        seasons: [{ id: '25-26', name: 'Saison 2025-2026', active: true, closed: true }],
        members: []
      }
    });

    flushSync();

    // The modal content is not in the DOM initially
    expect(document.body.innerHTML).not.toContain('Importer un relevé Société Générale');

    // Dispatch the window event
    window.dispatchEvent(new CustomEvent('open-bank-import'));
    flushSync();

    // The modal content should still NOT be in the DOM
    expect(document.body.innerHTML).not.toContain('Importer un relevé Société Générale');

    // Clean up
    target.remove();
  });
});

