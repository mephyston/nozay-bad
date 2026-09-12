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

const { handleSaveCheck, handleAnalyzeScan } = await import('./check-deposit-api');

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
    checkPlannedDepositMonth: '',
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
    // Sans indication de remise, rien ne part — le validateur n'accepte `null` qu'en modification.
    expect('plannedDepositMonth' in body).toBe(false);

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

  it("envoie le mois de remise prévu en entier, et `null` pour l'effacer en modification", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, text: async () => '{"success":true}' });
    vi.stubGlobal('fetch', fetchMock);

    await handleSaveCheck({ preventDefault() {} } as any, '25-26', { ...state(), checkPlannedDepositMonth: '11' });
    expect(JSON.parse(fetchMock.mock.calls[0][1].body).plannedDepositMonth).toBe(11);

    await handleSaveCheck({ preventDefault() {} } as any, '25-26', { ...state(), editingCheckId: 7, checkPlannedDepositMonth: '' });
    expect(JSON.parse(fetchMock.mock.calls[1][1].body).plannedDepositMonth).toBeNull();
  });

});

describe('handleAnalyzeScan', () => {
  const state = () => ({
    checkNumber: '',
    checkAmount: '',
    checkEmitter: '',
    checkBank: '',
    checkDate: '2026-09-08',
    checkMemberId: '',
    matchedMemberName: '',
    isAnalyzing: false,
    formError: ''
  });
  const photo = new File([new Uint8Array([1, 2, 3])], 'cheque.jpg', { type: 'image/jpeg' });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("remplit le formulaire avec les champs que l'API renvoie vraiment", async () => {
    /*
      La régression : l'écran lisait `checkNumber` là où l'API a toujours renvoyé
      `number`, et divisait par cent un montant reçu en euros. Le numéro n'arrivait
      jamais, et 150 € s'affichait « 1.5 » — ce que les trésoriers appelaient « la
      virgule mal placée ». Le montant est désormais en centimes, comme partout.
    */
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        data: { number: '2512612', amount: 15000, emitter: 'M OU MME JEAN DUPONT', bank: 'LCL', memberId: 7, memberName: 'DUPONT Jean', date: '2026-09-05' }
      })
    }));
    const s = state();
    await handleAnalyzeScan(photo, '26-27', s);
    expect(s.checkNumber).toBe('2512612');
    expect(s.checkAmount).toBe('150');
    expect(s.checkEmitter).toBe('M OU MME JEAN DUPONT');
    expect(s.checkBank).toBe('LCL');
    expect(s.checkMemberId).toBe('7');
    expect(s.checkDate).toBe('2026-09-05');
    expect(s.isAnalyzing).toBe(false);
  });

  it("laisse la date du jour et le champ vide quand un champ n'a pas été lu", async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, data: { number: '', amount: 0, emitter: '', bank: '', memberId: null, memberName: null, date: null } })
    }));
    const s = state();
    await handleAnalyzeScan(photo, '26-27', s);
    expect(s.checkNumber).toBe('');
    expect(s.checkAmount).toBe('');
    expect(s.checkDate).toBe('2026-09-08');
    expect(s.formError).toBe('');
  });

  it("garde le formulaire utilisable quand le modèle ne répond pas", async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      json: async () => ({ success: false, error: "Le modèle de lecture n'a pas répondu." })
    }));
    const s = state();
    await handleAnalyzeScan(photo, '26-27', s);
    expect(s.formError).toContain('saisir les informations manuellement');
    expect(s.isAnalyzing).toBe(false);
  });

});
