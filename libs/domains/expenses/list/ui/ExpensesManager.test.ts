import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mount, flushSync } from 'svelte';
import ExpensesManager from './ExpensesManager.svelte';

describe('ExpensesManager Component', () => {
  const seasons = [
    { id: '25-26', name: 'Saison 2025-2026', active: true },
    { id: '24-25', name: 'Saison 2024-2025', active: false }
  ];

  const categories = [
    { id: '10', code: 'materiel_club', adminLabel: 'Matériel (hors cordages)', adherentLabel: 'Matériel (hors cordages)', hideInExpenses: false }
  ];


  const expenses = [
    {
      id: 1,
      seasonId: '25-26',
      description: 'Achat de volants RSL',
      category: 'materiel_club',
      amount: 12000, // 120.00 €
      photoUrl: 'http://example.com/receipt.jpg',
      status: 'pending' as const,
      emitterName: 'Marie Curie',
      memberId: null,
      ledgerEntryId: null,
      createdAt: '2026-07-13T10:00:00.000Z'
    }
  ];

  let originalFetch: typeof globalThis.fetch;

  beforeEach(() => {
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
    vi.restoreAllMocks();
  });

  it('renders pending expenses cards correctly', () => {
    const target = document.createElement('div');
    document.body.appendChild(target);

    mount(ExpensesManager, {
      target,
      props: {
        expenses,
        seasonId: '25-26',
        seasons,
        categories
      }
    });
    flushSync();

    expect(target.innerHTML).toContain('Marie Curie');
    expect(target.innerHTML).toContain('120.00 €');
    expect(target.innerHTML).toContain('Achat de volants RSL');
    expect(target.innerHTML).toContain('Matériel (hors cordages)');
    /*
      La carte mobile écrite à la main a laissé place à une rangée de liste : les gestes
      sont dans sa piste de balayage, et ils se nomment comme leur résultat.
    */
    const piste = target.querySelector('[data-swipe-track]');
    const gestes = Array.from(piste?.querySelectorAll('button') ?? []).map((b) => b.textContent?.trim());
    expect(gestes).toContain('Rembourser');
    expect(gestes).toContain('Modifier');
  });

  it('calls fetch on action click', async () => {
    const target = document.createElement('div');
    document.body.appendChild(target);

    mount(ExpensesManager, {
      target,
      props: {
        expenses,
        seasonId: '25-26',
        seasons,
        categories
      }
    });
    flushSync();

    const approveButton = Array.from(
      target.querySelectorAll('[data-swipe-track] button')
    ).find((b) => b.textContent?.trim() === 'Rembourser') as HTMLButtonElement | undefined;
    expect(approveButton).toBeDefined();

    approveButton?.click();
    flushSync();

    expect(globalThis.fetch).toHaveBeenCalledWith('/admin/api/expenses/list', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'approve', id: 1 })
    });
  });

  it('hides validation and edit actions when the season is closed', () => {
    const closedSeasons = [
      { id: '25-26', name: 'Saison 2025-2026', active: true, closed: true },
      { id: '24-25', name: 'Saison 2024-2025', active: false, closed: false }
    ];

    const target = document.createElement('div');
    document.body.appendChild(target);

    mount(ExpensesManager, {
      target,
      props: {
        expenses,
        seasonId: '25-26',
        seasons: closedSeasons,
        categories

      }
    });
    flushSync();

    expect(target.innerHTML).toContain('Marie Curie');
    expect(target.innerHTML).not.toContain('Modifier');
    expect(target.innerHTML).not.toContain('Rembourser');
    expect(target.innerHTML).not.toContain('Rejeter');
  });
  /*
    L'édition se dépliait dans la ligne du tableau, sur toute sa largeur, et la carte
    mobile en avait sa propre version. Il n'y en a plus qu'une, dans la coquille
    commune, qui monte du bas au doigt et s'ouvre en panneau à la souris.
  */
  it("ouvre la modification dans une feuille, et non dans la ligne", async () => {
    const target = document.createElement('div');
    document.body.appendChild(target);

    mount(ExpensesManager, {
      target,
      props: { expenses, seasonId: '25-26', seasons, categories }
    });
    flushSync();

    // Aucune feuille tant qu'on n'a rien demandé.
    expect(document.querySelector('[role="dialog"]')).toBeNull();

    const modifier = Array.from(
      target.querySelectorAll('[data-swipe-track] button')
    ).find((b) => b.textContent?.trim() === 'Modifier') as HTMLButtonElement;
    expect(modifier, 'le balayage doit proposer la modification').toBeDefined();

    modifier.click();
    flushSync();
    await new Promise((resolve) => setTimeout(resolve, 0));

    const dialogue = document.querySelector('[role="dialog"]');
    expect(dialogue, 'la modification doit ouvrir une feuille').not.toBeNull();
    const texte = dialogue!.textContent ?? '';
    expect(texte).toContain('Marie Curie');
    expect(texte).toContain('Motif / description');
    expect(texte).toContain("Saison d'affectation");
    // Et la ligne du tableau n'a pas été remplacée par un formulaire.
    expect(target.querySelector('tbody textarea')).toBeNull();
  });

  describe('remplacement du justificatif', () => {
    /** Ouvre la feuille de modification de la note et rend son dialogue. */
    async function ouvrirModification() {
      const target = document.createElement('div');
      document.body.appendChild(target);
      mount(ExpensesManager, { target, props: { expenses, seasonId: '25-26', seasons, categories } });
      flushSync();
      (Array.from(target.querySelectorAll('[data-swipe-track] button'))
        .find((b) => b.textContent?.trim() === 'Modifier') as HTMLButtonElement).click();
      flushSync();
      await new Promise((resolve) => setTimeout(resolve, 0));
      return document.querySelector('[role="dialog"]')!;
    }

    const enregistrer = async (dialogue: Element) => {
      dialogue.querySelector('form')!.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
      await vi.waitFor(() => expect(globalThis.fetch).toHaveBeenCalled());
      return JSON.parse((globalThis.fetch as any).mock.calls[0][1].body);
    };

    afterEach(() => document.body.replaceChildren());

    it('envoie le nouveau justificatif, PDF compris', async () => {
      const dialogue = await ouvrirModification();
      const fichier = dialogue.querySelector<HTMLInputElement>('#receipt');
      expect(fichier, 'la feuille doit proposer de changer le justificatif').not.toBeNull();
      Object.defineProperty(fichier, 'files', {
        value: [new File([new Uint8Array(20)], 'facture.pdf', { type: 'application/pdf' })]
      });
      fichier!.dispatchEvent(new Event('change', { bubbles: true }));
      await vi.waitFor(() => expect(dialogue.textContent).toContain('facture.pdf'));

      const corps = await enregistrer(dialogue);
      expect(corps.action).toBe('update');
      expect(corps.updates.photoUrl.startsWith('data:application/pdf;base64,')).toBe(true);
    });

    it("ne renvoie pas le justificatif quand il n'a pas changé", async () => {
      const corps = await enregistrer(await ouvrirModification());
      expect(corps.updates).not.toHaveProperty('photoUrl');
    });
  });
});
