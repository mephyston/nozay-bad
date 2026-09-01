import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mount, unmount, flushSync, tick } from 'svelte';
import BankStatementReconciliation from './BankStatementReconciliation.svelte';

/**
 * La ligne ne s'ouvre plus en cliquant sur son libellé.
 *
 * L'écran était un maître-détail : cliquer une ligne à gauche peuplait un panneau à droite. La
 * décision se prend désormais dans la ligne elle-même, et le formulaire ne s'ouvre en place que
 * si l'on refuse la proposition — par « Modifier ».
 */
function rowFor(target: HTMLElement, label: string): HTMLElement {
  const row = Array.from(target.querySelectorAll('[data-line-id]')).find(
    (r) => r.textContent?.includes(label)
  ) as HTMLElement;
  if (!row) throw new Error(`Ligne introuvable dans la file : ${label}`);
  return row;
}

function expandRow(target: HTMLElement, label: string) {
  const btn = rowFor(target, label).querySelector('[data-action="expand"]') as HTMLButtonElement;
  if (!btn) throw new Error(`Aucun bouton d'ouverture sur la ligne : ${label}`);
  btn.click();
  flushSync();
}

/** La sélection multiple est un mode, pas l'état par défaut : les cases s'obtiennent. */
function enableMultiSelect(target: HTMLElement) {
  const btn = Array.from(target.querySelectorAll('button')).find(
    (b) => b.textContent?.trim() === 'Sélection'
  ) as HTMLButtonElement;
  btn.click();
  flushSync();
}

describe('BankStatementReconciliation Component', () => {
  const originalFetch = globalThis.fetch;
  let component: any = null;

  beforeEach(() => {
    document.body.innerHTML = '';
    globalThis.fetch = vi.fn().mockImplementation((url, init) => {
      if (url === '/admin/api/accounting/reconciliation' && init?.body) {
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

  /*
   * Le sélecteur d'exercice, et les garde-fous de clôture qui vont avec.
   *
   * Le sélecteur avait été retiré au motif que « consulter un exercice clos n'a aucun objet,
   * sa file est vide ». Sa file, oui — mais pas son archive ni son écart, et les relire
   * imposait de changer le drapeau `active` du référentiel : un réglage global pour un besoin
   * de lecture.
   */
  it("porte un sélecteur d'exercice", () => {
    const target = document.createElement('div');
    document.body.appendChild(target);

    component = mount(BankStatementReconciliation, {
      target,
      props: {
        bankStatementLines: [],
        glTransactions: [],
        seasonId: '25-26',
        seasons: [
          { id: '24-25', code: '24-25', name: 'Saison 2024-2025', closed: true },
          { id: '25-26', code: '25-26', name: 'Saison 2025-2026', active: true, closed: false }
        ],
        members: []
      }
    });

    // `unknown` en pivot : dans ce fichier `Element` est celui de @cloudflare/workers-types
    // (HTMLRewriter), qui ne recouvre pas le DOM — le cast direct est refusé.
    const select = target.querySelector('select[aria-label="Saison"]') as unknown as HTMLSelectElement;
    expect(select).toBeTruthy();
    expect(Array.from(select.options).map((o) => o.value)).toContain('24-25');
  });

  /*
   * Et la conséquence de leur avoir enfin donné un `closed` qui existe.
   *
   * L'interface cherchait ce booléen partout, mais le référentiel ne rendait que `closed_at` :
   * elle lisait donc `undefined`, et se comportait comme si aucun exercice n'était jamais
   * clôturé. L'alerte ne s'affichait pas, l'import restait actif. Le fond tenait — l'API
   * refuse en phase 3 — mais on ne l'apprenait qu'au moment de valider.
   */
  it("passe en lecture seule sur un exercice clôturé", () => {
    const target = document.createElement('div');
    document.body.appendChild(target);

    component = mount(BankStatementReconciliation, {
      target,
      props: {
        bankStatementLines: [],
        glTransactions: [],
        seasonId: '24-25',
        seasons: [{ id: '24-25', code: '24-25', name: 'Saison 2024-2025', closed: true }],
        members: []
      }
    });

    expect(target.innerHTML).toContain('Saison clôturée');

    const importer = Array.from(target.querySelectorAll('button')).find(
      (b) => b.textContent?.includes('Importer (OFX)')
    ) as HTMLButtonElement;
    expect(importer.disabled).toBe(true);
  });

  it('rend la file, et ouvre une ligne sur demande', () => {
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

    expect(target.innerHTML).toContain('1 opération à rapprocher');
    expect(target.innerHTML).toContain('IONOS');
    expect(target.innerHTML).toContain('-15,60');

    // Cliquer sur le bouton de la transaction pour l'activer dans le panneau droit
    expandRow(target, 'IONOS');

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

    expandRow(target, 'VIR RECU 12345');

    // Cliquer sur l'onglet "Écritures existantes" pour afficher les écritures
    // du grand livre susceptibles de correspondre (les déjà rapprochées sont exclues)
    const sugTabBtn = Array.from(target.querySelectorAll('button')).find(b => b.textContent?.includes('Pointer une écriture')) as HTMLButtonElement;
    expect(sugTabBtn).toBeDefined();
    sugTabBtn.click();
    flushSync();

    expect(target.innerHTML).not.toContain('Volants Clement');
    /* Le message d'état vide dit enfin vrai : la liste est bornée aux candidats à ±7 jours,
       là où elle affichait toutes les écritures non pointées tout en annonçant ce filtre. */
    expect(target.innerHTML).toContain('Aucune écriture correspondante trouvée à ±7 jours.');
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
    expandRow(target, 'VIR RECU 12345');

    // Le bloc « Reprendre une facture impayée » vit désormais dans l'onglet de saisie, replié.
    await new Promise(resolve => setTimeout(resolve, 50));
    flushSync();

    const invoicesToggle = Array.from(target.querySelectorAll('button')).find(
      b => b.textContent?.includes('Reprendre une facture impayée')
    ) as HTMLButtonElement;
    expect(invoicesToggle).not.toBeNull();
    invoicesToggle.click();
    flushSync();

    expect(target.innerHTML).toContain('Client Test');
    expect(target.innerHTML).toContain('FAC-2026-0001');
    expect(target.innerHTML).toContain('156,00');
    // La facture au montant exact est signalée, mais ne déclenche plus rien à elle seule.
    expect(target.innerHTML).toContain('Montant exact');

    const checkbox = target.querySelector('.invoice-checkbox') as HTMLInputElement;
    expect(checkbox).not.toBeNull();
    checkbox.click();
    flushSync();

    const prefillBtn = target.querySelector('#btn-valider-association') as HTMLButtonElement;
    expect(prefillBtn).not.toBeNull();

    const callsBefore = vi.mocked(globalThis.fetch).mock.calls.length;
    prefillBtn.click();
    await new Promise(resolve => setTimeout(resolve, 50));
    flushSync();

    /*
      Reprendre une facture n'écrit rien : cela remplit le formulaire, que la comptable relit.

      L'écran créait ici directement une recette, avec `category: '1'` en dur — « Adhésions &
      Inscriptions » pour une location de salle comme pour du sponsoring — sans que le
      formulaire, ni personne, n'ait eu son mot à dire.
    */
    expect(vi.mocked(globalThis.fetch).mock.calls.length).toBe(callsBefore);
    // Le libellé de la facture est repris dans l'écriture proposée.
    expect(target.innerHTML).toContain('FAC-2026-0001');
  });

  /*
    La sélection multiple a été retirée, et avec elle le rapprochement par lot.

    Elle contredisait la règle posée pour cet écran — une ligne, une écriture validée — et son
    autre usage, masquer des lignes en masse, retirait de l'écran de l'argent réellement sorti du
    compte. L'analyse IA, elle, porte sur toute la file sans qu'on ait à sélectionner quoi que ce
    soit.
  */
  it('ne propose ni case à cocher ni action de masse', async () => {
    const target = document.createElement('div');
    document.body.appendChild(target);

    component = mount(BankStatementReconciliation, {
      target,
      props: {
        bankStatementLines: [
          { id: 1, fitid: 'B-1', accountId: 'current', amount: -1000, date: '2026-02-16', name: 'FRAIS UN', memo: null, status: 'pending', aiSuggestions: null },
          { id: 2, fitid: 'B-2', accountId: 'current', amount: -2000, date: '2026-02-17', name: 'FRAIS DEUX', memo: null, status: 'pending', aiSuggestions: null }
        ],
        glTransactions: [],
        seasonId: '25-26',
        seasons: [{ id: '25-26', name: 'Saison 2025-2026', active: true }],
        members: []
      }
    });
    flushSync();

    expect(target.querySelectorAll('[role="checkbox"]').length).toBe(0);
    expect(target.innerHTML).not.toContain('Sélection');
    expect(target.innerHTML).not.toContain('Valider les propositions');
    expect(target.innerHTML).not.toContain('Ignorer');
    // L'analyse porte sur la file entière, sans sélection préalable.
    expect(target.innerHTML).toContain('Analyse IA');
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
    expandRow(target, 'MULTI INVOICE TRANSFER');

    await new Promise(resolve => setTimeout(resolve, 50));
    flushSync();

    const invoicesToggle = Array.from(target.querySelectorAll('button')).find(
      b => b.textContent?.includes('Reprendre une facture impayée')
    ) as HTMLButtonElement;
    expect(invoicesToggle).not.toBeNull();
    invoicesToggle.click();
    flushSync();

    expect(target.innerHTML).toContain('FAC-2026-0001');
    expect(target.innerHTML).toContain('FAC-2026-0002');

    const invoiceCheckboxes = target.querySelectorAll('.invoice-checkbox') as NodeListOf<HTMLInputElement>;
    expect(invoiceCheckboxes.length).toBe(2);

    invoiceCheckboxes[0].click();
    flushSync();
    expect(target.innerHTML).toContain('156,00');

    invoiceCheckboxes[1].click();
    flushSync();
    expect(target.innerHTML).toContain('206,00');

    const reloadMock = vi.fn();
    vi.stubGlobal('location', { reload: reloadMock });

    const prefillBtn = target.querySelector('#btn-valider-association') as HTMLButtonElement;
    expect(prefillBtn).not.toBeNull();
    const callsBefore = vi.mocked(globalThis.fetch).mock.calls.length;
    prefillBtn.click();
    await new Promise(resolve => setTimeout(resolve, 50));
    flushSync();

    /*
      Deux factures reprises donnent **deux** parts de ventilation, chacune portant la sienne.

      L'écran n'écrivait qu'une seule recette, libellée « Rapprochement de N factures », ne
      retenant que `invoiceIds[0]` : les autres factures passaient payées sans qu'aucune écriture
      ne les porte, et rien ne comparait leur somme au montant du relevé.
    */
    expect(vi.mocked(globalThis.fetch).mock.calls.length).toBe(callsBefore);
    expect(target.innerHTML).toContain('FAC-2026-0001');
    expect(target.innerHTML).toContain('FAC-2026-0002');
    expect(reloadMock).not.toHaveBeenCalled();
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
    expandRow(target, 'DIVERS SPLIT');

    // Active right tab is 'manual' by default, but click it to be sure
    const manualTabBtn = Array.from(target.querySelectorAll('button')).find(b => b.textContent?.includes('Saisir / ventiler')) as HTMLButtonElement;
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

    expect(globalThis.fetch).toHaveBeenCalledWith('/admin/api/accounting/reconciliation', expect.objectContaining({
      method: 'POST',
      body: expect.stringContaining('"transactions":')
    }));
    /*
      L'écran ne se recharge plus : il applique ce que le serveur répond. Le rechargement était
      l'unique moyen de voir le résultat d'un rapprochement, et il coûtait un rendu serveur
      complet de la page par ligne traitée.
    */
    expect(reloadMock).not.toHaveBeenCalled();
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

    expect(target.innerHTML).toContain('SALAIRE');
    expect(target.innerHTML).toContain('ADHESION');

    const searchInput = target.querySelector('input[placeholder*="Rechercher une opération"]') as HTMLInputElement;
    expect(searchInput).not.toBeNull();

    // Type "salaire" into search input
    searchInput.value = 'salaire';
    searchInput.dispatchEvent(new Event('input', { bubbles: true }));
    await tick();

    // Only SALAIRE should be shown, ADHESION should be hidden
    expect(target.innerHTML).toContain('SALAIRE');
    expect(target.innerHTML).not.toContain('ADHESION');

    // Type something that matches nothing
    searchInput.value = 'inconnu';
    searchInput.dispatchEvent(new Event('input', { bubbles: true }));
    await tick();

    expect(target.innerHTML).not.toContain('SALAIRE');
    expect(target.innerHTML).not.toContain('ADHESION');
  });

  /*
    La sélection ne se restaure plus depuis `sessionStorage`, et n'y est plus écrite.

    Les deux effets qui s'en chargeaient n'existaient que pour survivre au rechargement complet
    de la page après chaque rapprochement. Sans rechargement, rien n'est perdu — et l'écran ne
    doit surtout pas rouvrir de lui-même une ligne que la comptable n'a pas désignée.
  */
  it("n'ouvre aucune ligne au montage et n'écrit rien en sessionStorage", async () => {
    const store: Record<string, string> = { 'reconcile_active_bt_id': '1' };
    const setItem = vi.fn((key: string, val: string) => { store[key] = val; });
    vi.stubGlobal('sessionStorage', {
      getItem: (key: string) => store[key] || null,
      setItem,
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

    // Les deux lignes sont dans la file, et aucune n'est dépliée.
    expect(target.innerHTML).toContain('TX ONE PENDING');
    expect(target.innerHTML).toContain('TX TWO PENDING');
    expect(target.innerHTML).not.toContain('Saisir / ventiler');
    expect(setItem).not.toHaveBeenCalledWith('reconcile_active_bt_id', expect.anything());

    // Une ligne s'ouvre en place, et se referme, sans jamais toucher au stockage de session.
    expandRow(target, 'TX ONE PENDING');
    expect(target.innerHTML).toContain('Saisir / ventiler');

    expandRow(target, 'TX ONE PENDING');
    expect(target.innerHTML).not.toContain('Saisir / ventiler');
    expect(setItem).not.toHaveBeenCalledWith('reconcile_active_bt_id', expect.anything());
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
    expandRow(target, 'VIR DUPONT JEAN');

    // The category dropdown should show 'Tournois Senior'
    expect(target.innerHTML).toContain('Tournois Senior');

    // The member search combobox should show the selected member name 'Dupont Jean'
  });

  /*
   * Le préremplissage ne se déclenchait qu'au CHANGEMENT de ligne sélectionnée.
   *
   * Demander une analyse sur la ligne déjà ouverte réécrit ses `aiSuggestions` sans toucher à
   * son identifiant : l'encart annonçait le bon adhérent, le formulaire restait vide, et il
   * fallait changer de ligne puis revenir pour que le champ se remplisse.
   */
  it("remplit le formulaire quand l'analyse est demandée sur la ligne déjà ouverte", async () => {
    const target = document.createElement('div');
    document.body.appendChild(target);

    const ligneAnalysee = {
      id: 42,
      fitid: 'TX-AI-REANALYSE',
      accountId: 'current',
      amount: 15000,
      amountCents: 15000,
      date: '2026-02-16',
      name: 'VIR DUPONT JEAN ADHESION',
      memo: 'Cotisation 25-26',
      status: 'pending',
      aiSuggestions: JSON.stringify({
        kind: 'entry', category: 5, memberId: 99, memberName: 'Dupont Jean',
        confidence: 0.9, accrualType: 'normal', accrualNote: null, targetSeason: null
      })
    };

    const fetchDeBase = globalThis.fetch as any;
    globalThis.fetch = vi.fn().mockImplementation((url: any, init: any) => {
      if (url === '/admin/api/accounting/reconciliation' && init?.body) {
        const body = JSON.parse(init.body);
        if (body.action === 'analyze') {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ success: true, count: 1, lines: [ligneAnalysee] })
          } as Response);
        }
      }
      return fetchDeBase(url, init);
    });

    component = mount(BankStatementReconciliation, {
      target,
      props: {
        // La ligne s'ouvre SANS proposition : c'est l'analyse qui doit la lui donner.
        bankStatementLines: [{ ...ligneAnalysee, aiSuggestions: null }],
        glTransactions: [],
        seasonId: '25-26',
        seasons: [{ id: '25-26', code: '25-26', name: 'Saison 2025-2026', startDate: '2025-09-01', endDate: '2026-08-31', active: true }],
        members: [{ id: 99, licence: '0102030', lastName: 'Dupont', firstName: 'Jean', amountRemaining: 15000 }],
        dbCategories: [{ id: 5, code: 'tournois_senior', adminLabel: 'Tournois Senior' }]
      }
    });

    flushSync();
    expandRow(target, 'VIR DUPONT JEAN');

    const champAdherent = () => target.querySelector('#member-search-input') as HTMLInputElement;
    expect(champAdherent().value).toBe('');

    const boutonAnalyse = Array.from(target.querySelectorAll('button')).find(
      (b) => b.textContent?.includes('Analyser (IA)')
    ) as HTMLButtonElement;
    expect(boutonAnalyse).toBeTruthy();

    boutonAnalyse.click();
    await tick();
    flushSync();
    await tick();
    flushSync();

    expect(champAdherent().value).toContain('Dupont');
  });

  it('validates the AI card with the corrections made in the form, not the frozen suggestion', async () => {
    // La comptable corrige l'adhérent proposé par le modèle, puis clique sur le bouton de
    // la carte IA. Ce bouton rejouait les valeurs du modèle : la correction et le
    // rattachement d'exercice repartaient à la poubelle sans un mot.
    const target = document.createElement('div');
    document.body.appendChild(target);

    component = mount(BankStatementReconciliation, {
      target,
      props: {
        bankStatementLines: [
          {
            id: 42,
            fitid: 'TX-AI-CUTOFF',
            accountId: 'current',
            amount: 15000,
            amountCents: 15000,
            date: '2026-06-16',
            name: 'VIR RENARD SYLVAIN 26-27',
            memo: 'Cotisation 26-27',
            status: 'pending',
            aiSuggestions: JSON.stringify({
              category: 1,
              memberId: 99,
              memberName: 'Morgane Dupont',
              confidence: 0.6,
              accrualType: 'produit_constate_avance',
              accrualNote: "Cotisation encaissée d'avance pour la saison 26-27, à rattacher à cet exercice."
            })
          }
        ],
        glTransactions: [],
        seasonId: '25-26',
        seasons: [{ id: '25-26', name: 'Saison 2025-2026', active: true }],
        members: [
          { id: 99, licence: '0102030', lastName: 'Dupont', firstName: 'Morgane', amountRemaining: 15000 },
          { id: 77, licence: '0405060', lastName: 'Renard', firstName: 'Sylvain', amountRemaining: 15000 }
        ],
        dbCategories: [{ id: 1, code: 'adhesions_inscriptions', adminLabel: 'Adhésions' }]
      }
    });

    flushSync();

    expandRow(target, 'VIR RENARD SYLVAIN');

    // Le rattachement suggéré préremplit le formulaire, note comprise.
    const note = target.querySelector('input[placeholder="Détail de la régularisation..."]') as HTMLInputElement;
    expect(note).not.toBeNull();
    expect(note.value).toContain('26-27');

    // La comptable corrige l'adhérent.
    const memberInput = target.querySelector('#member-search-input') as HTMLInputElement;
    expect(memberInput).not.toBeNull();
    memberInput.dispatchEvent(new FocusEvent('focus'));
    flushSync();
    const option = Array.from(target.querySelectorAll('[role="option"]')).find(o =>
      o.textContent?.includes('Renard Sylvain')
    ) as HTMLElement;
    expect(option).not.toBeNull();
    option.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
    flushSync();

    /* L'encart violet a disparu : c'est le bouton du formulaire qui enregistre, et il enregistre
       par définition ce que le formulaire affiche — corrections comprises. */
    const validate = Array.from(target.querySelectorAll('button')).find(b =>
      b.textContent?.includes('Créer et rapprocher')
    ) as HTMLButtonElement;
    expect(validate).not.toBeNull();
    validate.click();
    await tick();
    await tick();

    const call = (globalThis.fetch as any).mock.calls.find((c: any[]) => {
      if (!c[1]?.body) return false;
      try {
        return JSON.parse(c[1].body).action === 'create';
      } catch {
        return false;
      }
    });
    expect(call).toBeDefined();
    const body = JSON.parse(call[1].body);
    expect(body.memberId).toBe(77);
    expect(body.transaction.accrualType).toBe('produit_constate_avance');
    expect(body.transaction.accrualNote).toContain('26-27');
  });

  it('shows what was recorded on a reconciled line, and no creation form', async () => {
    // Onglet « Rapprochées » : le panneau affichait un formulaire de création prérempli
    // par la suggestion du modèle, jamais par l'écriture enregistrée — le cut-off y
    // revenait à « Normal », ce qui se lit comme une saisie perdue.
    const target = document.createElement('div');
    document.body.appendChild(target);

    component = mount(BankStatementReconciliation, {
      target,
      props: {
        bankStatementLines: [
          {
            id: 1162,
            fitid: 'TX-DONE',
            accountId: 'current',
            amount: 25000,
            amountCents: 25000,
            date: '2026-08-21',
            name: 'VIR INST RE 673390599511',
            memo: 'DE: M RENARD SYLVAIN',
            status: 'reconciled',
            aiSuggestions: JSON.stringify({ category: 1, memberId: 623, memberName: 'RENARD Morgane', accrualType: 'normal', accrualNote: null })
          }
        ],
        glTransactions: [
          {
            id: 669,
            type: 'recette',
            accountId: 'current',
            amount: 25000,
            amountCents: 25000,
            date: '2026-08-21',
            description: 'VIR INST RE 673390599511',
            bankStatementLineId: 1162,
            memberName: 'RENARD Sylvain',
            accrualType: 'produit_constate_avance',
            accrualNote: 'Saison 26-27'
          }
        ],
        seasonId: '25-26',
        seasons: [{ id: '25-26', name: 'Saison 2025-2026', active: true }],
        members: [],
        dbCategories: [{ id: 1, code: 'adhesions_inscriptions', adminLabel: 'Adhésions' }]
      }
    });

    flushSync();

    /*
      Les lignes traitées ont quitté l'écran de travail.

      Les trois onglets mettaient sur le même plan une file à vider et deux archives ; celles-ci
      vivent maintenant dans une vue à part, qu'on demande.
    */
    const historyBtn = Array.from(target.querySelectorAll('button')).find(b =>
      b.textContent?.includes("Voir l'historique")
    ) as HTMLButtonElement;
    expect(historyBtn).not.toBeNull();
    historyBtn.click();
    flushSync();

    /* L'historique n'a plus de bascule : masquer une ligne n'est plus possible, il n'a donc
       qu'un contenu. */
    expandRow(target, 'VIR INST RE 673390599511');

    // Ce qui a été enregistré est lisible…
    expect(target.innerHTML).toContain('RENARD Sylvain');
    expect(target.innerHTML).toContain("Produit constaté d'avance");
    expect(target.innerHTML).toContain('Saison 26-27');

    // …et le formulaire de création n'est plus proposé.
    expect(target.innerHTML).not.toContain('Créer et rapprocher une nouvelle écriture');
  });

  it("transmet l'exercice de rattachement de l'écriture", async () => {
    // Sans lui, l'API retombe sur la date et une cotisation encaissée en août pour la
    // rentrée compte dans le résultat de l'exercice qui se clôture — soit l'inverse de
    // ce que le cut-off décrit.
    const target = document.createElement('div');
    document.body.appendChild(target);

    component = mount(BankStatementReconciliation, {
      target,
      props: {
        bankStatementLines: [
          {
            id: 55,
            fitid: 'TX-SEASON',
            accountId: 'current',
            amount: 26000,
            amountCents: 26000,
            date: '2026-08-17',
            name: 'VIR INST RE 672885352540',
            memo: 'MAILLARD-DAVID-ADHESION2026-2027',
            status: 'pending',
            aiSuggestions: null
          }
        ],
        glTransactions: [],
        seasonId: '25-26',
        seasons: [
          { id: '25-26', code: '25-26', name: 'Saison 2025-2026', active: true, startDate: '2025-09-01', endDate: '2026-08-31' },
          { id: '26-27', code: '26-27', name: 'Saison 2026-2027', active: false, startDate: '2026-09-01', endDate: '2027-08-31' }
        ],
        members: [],
        dbCategories: [{ id: 1, code: 'adhesions_inscriptions', adminLabel: 'Adhésions' }]
      }
    });

    flushSync();

    expandRow(target, 'VIR INST RE 672885352540');

    const validate = Array.from(target.querySelectorAll('button')).find(b =>
      b.textContent?.includes('Créer et rapprocher')
    ) as HTMLButtonElement;
    expect(validate).not.toBeNull();
    validate.click();
    await tick();
    await tick();

    const call = (globalThis.fetch as any).mock.calls.find((c: any[]) => {
      if (!c[1]?.body) return false;
      try {
        return JSON.parse(c[1].body).action === 'create';
      } catch {
        return false;
      }
    });
    expect(call).toBeDefined();
    expect(JSON.parse(call[1].body).transaction.seasonId).toBe('25-26');
  });

  it("rattache l'écriture à l'exercice que la suggestion IA désigne", async () => {
    /*
      Le geste réel : sélectionner la ligne, puis valider la suggestion — sans toucher au
      formulaire. Le bouton de l'encart enregistre le formulaire tel qu'il est affiché ;
      tant que l'exercice y restait celui qu'on consulte, une cotisation de rentrée
      encaissée en août partait sur l'exercice qui se clôture, avec un produit constaté
      d'avance et une note annonçant l'autre exercice. Rien ne le signalait.
    */
    const target = document.createElement('div');
    document.body.appendChild(target);

    component = mount(BankStatementReconciliation, {
      target,
      props: {
        bankStatementLines: [
          {
            id: 1151,
            fitid: 'TX-PCA',
            accountId: 'current',
            amount: 26000,
            amountCents: 26000,
            date: '2026-08-17',
            name: 'VIR INST RE 672885352540',
            memo: 'MOTIF: MAILLARD-DAVID-ADHESION2026-2027',
            status: 'pending',
            aiSuggestions: JSON.stringify({
              category: 1,
              memberId: 715,
              memberName: 'MAILLARD David',
              confidence: 0.95,
              accrualType: 'produit_constate_avance',
              accrualNote: "Cotisation encaissée d'avance pour la saison 26-27, à rattacher à cet exercice.",
              targetSeason: '26-27'
            })
          }
        ],
        glTransactions: [],
        seasonId: '25-26',
        seasons: [
          { id: '25-26', code: '25-26', name: 'Saison 2025-2026', active: true, startDate: '2025-09-01', endDate: '2026-08-31' },
          { id: '26-27', code: '26-27', name: 'Saison 2026-2027', active: false, startDate: '2026-09-01', endDate: '2027-08-31' }
        ],
        members: [],
        dbCategories: [{ id: 1, code: 'adhesions_inscriptions', adminLabel: 'Adhésions' }]
      }
    });

    flushSync();

    expandRow(target, 'VIR INST RE 672885352540');

    /*
      L'exercice ne se choisit plus : il se déduit du motif et de la date, comme le validateur
      serveur l'impose. Un « constaté d'avance » se rattache à l'exercice qui suit l'encaissement.
    */
    expect(target.textContent).toContain("se rattache à l'exercice qui suit l'encaissement");

    const validate = Array.from(target.querySelectorAll('button')).find(b =>
      b.textContent?.includes('Créer et rapprocher')
    ) as HTMLButtonElement;
    expect(validate).not.toBeNull();
    validate.click();
    await tick();
    await tick();

    const call = (globalThis.fetch as any).mock.calls.find((c: any[]) => {
      if (!c[1]?.body) return false;
      try {
        return JSON.parse(c[1].body).action === 'create';
      } catch {
        return false;
      }
    });
    expect(call).toBeDefined();
    const sent = JSON.parse(call[1].body).transaction;
    expect(sent.seasonId).toBe('26-27');
    expect(sent.accrualType).toBe('produit_constate_avance');
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

