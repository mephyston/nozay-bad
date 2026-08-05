import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const flashAndReload = vi.fn();
const toastError = vi.fn();

vi.mock('@nba/ui', () => ({
  toast: { success: vi.fn(), error: toastError },
  uiConfirm: vi.fn().mockResolvedValue(true),
  flashAndReload
}));

const { handleAddCheck } = await import('./check-deposit-api');

describe('handleAddCheck', () => {
  const state = () => ({
    checkNumber: '0012345',
    checkAmount: '42.50',
    checkEmitter: 'Marie Durand',
    checkBank: 'Crédit Agricole',
    checkDate: '2026-08-01',
    checkMemberId: '',
    isSubmittingCheck: false,
    formError: '',
    showAddCheckModal: true
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("poste l'action et les champs attendus par l'API", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, text: async () => '{"success":true}' });
    vi.stubGlobal('fetch', fetchMock);

    const s = state();
    await handleAddCheck({ preventDefault() {} } as any, '25-26', s);

    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    // La régression : `add-check` / `checkNumber` ne correspondaient à aucune branche
    // de la page ni au contrat de l'API — la requête repartait en 200 sans rien créer.
    expect(body.action).toBe('create-check');
    expect(body.number).toBe('0012345');
    expect(body.emitter).toBe('Marie Durand');
    expect(body.amount).toBe(4250);
    expect(body.seasonId).toBe('25-26');
    // `memberId: null` était refusé par le validateur (Optional(Number)) : on l'omet.
    expect('memberId' in body).toBe(false);

    expect(flashAndReload).toHaveBeenCalledWith('Chèque enregistré avec succès.');
    expect(s.showAddCheckModal).toBe(false);
  });

  it("remonte l'erreur de l'API sans recharger", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      text: async () => JSON.stringify({ success: false, error: 'Numéro de chèque déjà enregistré.' })
    });
    vi.stubGlobal('fetch', fetchMock);

    const s = state();
    await handleAddCheck({ preventDefault() {} } as any, '25-26', s);

    expect(s.formError).toBe('Numéro de chèque déjà enregistré.');
    expect(toastError).toHaveBeenCalledWith('Numéro de chèque déjà enregistré.');
    expect(flashAndReload).not.toHaveBeenCalled();
  });

  it('exige les champs obligatoires avant tout appel réseau', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    const s = { ...state(), checkNumber: '' };
    await handleAddCheck({ preventDefault() {} } as any, '25-26', s);

    expect(fetchMock).not.toHaveBeenCalled();
    expect(s.formError).toContain('numéro');
  });
});
