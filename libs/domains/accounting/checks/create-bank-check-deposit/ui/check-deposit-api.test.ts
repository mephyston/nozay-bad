import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const toastError = vi.fn();

// Seuls `toast` et `uiConfirm` sont doublés : le reste de `@nba/ui` — dont `submitForm`,
// qui porte désormais l'enchaînement fermeture / confirmation / réaffichage — doit être
// le vrai code, sans quoi ce test ne vérifierait plus que sa propre reformulation.
vi.mock('@nba/ui', async (importOriginal) => {
  const actual = await importOriginal<any>();
  return {
    ...actual,
    toast: { success: vi.fn(), error: toastError },
    uiConfirm: vi.fn().mockResolvedValue(true)
  };
});

const { handleSaveCheck } = await import('./check-deposit-api');

/** Message que `flashAndReload` mémorise pour le rejouer après le réaffichage. */
function pendingFlash(): { type: string; message: string } | null {
  const raw = sessionStorage.getItem('nba:flash');
  return raw ? JSON.parse(raw) : null;
}

describe('handleSaveCheck', () => {
  const state = () => ({
    checkNumber: '0012345',
    checkAmount: '42.50',
    checkEmitter: 'Marie Durand',
    checkBank: 'Crédit Agricole',
    checkDate: '2026-08-01',
    checkMemberId: '',
    checkCategory: '2',
    editingCheckId: null as number | null,
    isSubmittingCheck: false,
    formError: '',
    showAddCheckModal: true
  });

  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
    // jsdom ne sait pas naviguer : `reload()` devient simplement observable.
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { ...window.location, href: 'http://localhost:4321/admin/accounting/checks', reload: vi.fn() }
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("poste l'action et les champs attendus par l'API", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, text: async () => '{"success":true}' });
    vi.stubGlobal('fetch', fetchMock);

    const s = state();
    await handleSaveCheck({ preventDefault() {} } as any, '25-26', s);

    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    // La régression : `add-check` / `checkNumber` ne correspondaient à aucune branche
    // de la page ni au contrat de l'API — la requête repartait en 200 sans rien créer.
    expect(body.action).toBe('create-check');
    expect(body.number).toBe('0012345');
    expect(body.emitter).toBe('Marie Durand');
    expect(body.amount).toBe(4250);
    expect(body.seasonId).toBe('25-26');
    // La catégorie choisie partait à la trappe : l'API prenait « Adhésion » quoi qu'on choisisse.
    expect(body.category).toBe('2');
    // `memberId: null` était refusé par le validateur (Optional(Number)) : on l'omet.
    expect('memberId' in body).toBe(false);
    expect('id' in body).toBe(false);

    expect(s.showAddCheckModal).toBe(false);
    expect(pendingFlash()).toMatchObject({ type: 'success', message: 'Chèque enregistré.' });
  });

  it("remonte l'erreur de l'API, laisse le sheet ouvert et ne recharge pas", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      text: async () => JSON.stringify({ success: false, error: 'Numéro de chèque déjà enregistré.' })
    });
    vi.stubGlobal('fetch', fetchMock);

    const s = state();
    await handleSaveCheck({ preventDefault() {} } as any, '25-26', s);

    expect(s.formError).toBe('Numéro de chèque déjà enregistré.');
    expect(toastError).toHaveBeenCalledWith('Numéro de chèque déjà enregistré.');
    expect(s.showAddCheckModal).toBe(true);
    expect(pendingFlash()).toBeNull();
    expect(window.location.reload).not.toHaveBeenCalled();
  });

  it('exige les champs obligatoires avant tout appel réseau', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    const s = { ...state(), checkNumber: '' };
    await handleSaveCheck({ preventDefault() {} } as any, '25-26', s);

    expect(fetchMock).not.toHaveBeenCalled();
    expect(s.formError).toContain('numéro');
    expect(s.showAddCheckModal).toBe(true);
  });

  it("relaie une modification sur l'identifiant du chèque, adhérent détaché à null", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, text: async () => '{"success":true}' });
    vi.stubGlobal('fetch', fetchMock);

    const s = { ...state(), editingCheckId: 7 };
    await handleSaveCheck({ preventDefault() {} } as any, '25-26', s);

    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.action).toBe('update-check');
    expect(body.id).toBe(7);
    expect(body.category).toBe('2');
    // En modification, vider le champ adhérent doit détacher : `null` est envoyé, pas omis.
    expect(body.memberId).toBeNull();

    expect(s.showAddCheckModal).toBe(false);
    expect(pendingFlash()).toMatchObject({ type: 'success', message: 'Chèque modifié.' });
  });

  it('envoie l\'adhérent choisi en modification', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, text: async () => '{"success":true}' });
    vi.stubGlobal('fetch', fetchMock);

    const s = { ...state(), editingCheckId: 7, checkMemberId: '12' };
    await handleSaveCheck({ preventDefault() {} } as any, '25-26', s);

    expect(JSON.parse(fetchMock.mock.calls[0][1].body).memberId).toBe(12);
  });
});
