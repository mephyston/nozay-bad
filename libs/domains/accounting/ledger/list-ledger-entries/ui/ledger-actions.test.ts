import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { editValuesFor, newValuesFor, submitTransaction, type TransactionFormValues } from './ledger-actions';

vi.mock('@nba/ui', () => ({ softNavigate: vi.fn() }));

const ACCOUNTS = [
  { id: 1, code: 'current', label: 'Compte Courant' },
  { id: 4, code: 'badnet', label: 'Porte-monnaie Badnet' }
];

describe('newValuesFor', () => {
  const contexte = {
    mainAccountId: 'current',
    seasonId: '9',
    accounts: ACCOUNTS,
    paymentMethods: [{ code: 'especes' }, { code: 'virement_interne', kind: 'transfer' }]
  };

  it('rend un formulaire entièrement vierge', () => {
    const v = newValuesFor('recette', contexte);
    expect(v).toMatchObject({
      editingId: null,
      editingTransferId: null,
      showPanel: 'recette',
      amount: '',
      category: '1',
      formAccountId: 'current',
      destinationDate: '',
      description: '',
      reference: '',
      accrualType: 'normal',
      accrualNote: '',
      targetSeasonId: '9',
      memberId: ''
    });
  });

  it('ne laisse aucun champ du formulaire hors de sa portée', () => {
    /*
      La garde qui manquait. L'écran remettait ses champs à zéro un par un et en avait
      oublié `reference` : après avoir modifié une écriture, ouvrir une saisie héritait
      de sa référence bancaire, qui partait en base sur la nouvelle écriture. Comparer
      les clés des deux fonctions interdit qu'un champ ajouté plus tard soit oublié
      d'un seul côté.
    */
    const neuf = newValuesFor('recette', contexte);
    const modifie = editValuesFor(
      {
        id: 5, type: 'recette', accountId: 1, seasonId: 2, categoryId: 12, amount: 1750,
        date: '2026-08-20', paymentMethod: 'especes', description: 'Cotisation',
        reference: 'VIR-9988', memberId: 42
      },
      ACCOUNTS,
      { accountId: 'current', seasonId: '9' }
    );
    expect(Object.keys(neuf).sort()).toEqual(Object.keys(modifie).sort());
  });

  it("ne propose jamais le compte de départ comme destinataire d'un virement", () => {
    const v = newValuesFor('transfert', contexte);
    expect(v.formAccountId).toBe('current');
    expect(v.destinationAccountId).toBe('badnet');
    // Un moyen de paiement de virement, quand le club en déclare un.
    expect(v.paymentMethod).toBe('virement_interne');
  });

  it('retombe sur le premier moyen de paiement à défaut de virement déclaré', () => {
    const v = newValuesFor('depense', { ...contexte, paymentMethods: [{ code: 'especes' }] });
    expect(v.paymentMethod).toBe('especes');
  });
});

describe('editValuesFor', () => {
  const fallback = { accountId: 'current', seasonId: '9' };

  it('recopie une dépense champ à champ, l’exercice et l’adhérent compris', () => {
    const values = editValuesFor(
      {
        id: 5, type: 'depense', accountId: 4, seasonId: 2, categoryId: 12, amount: 1750, date: '2026-08-20',
        paymentMethod: 'virement_interne', description: 'ICR équipe 1', reference: null, accrualType: 'charge_a_payer', accrualNote: 'Facture attendue', memberId: 42
      },
      ACCOUNTS,
      fallback
    );
    expect(values).toMatchObject({
      editingId: 5, editingTransferId: null, showPanel: 'depense', amount: '17.50', date: '2026-08-20',
      category: '12', formAccountId: 'badnet', destinationAccountId: '', destinationDate: '',
      accrualType: 'charge_a_payer', accrualNote: 'Facture attendue', targetSeasonId: '2', memberId: '42'
    });
  });

  it('reconstitue un virement depuis sa jambe source', () => {
    const values = editValuesFor(
      {
        id: 10, type: 'transfert', transferId: 3, transferLeg: 'source', accountId: 1, counterpartAccountId: 4,
        date: '2026-07-13', counterpartDate: '2026-07-15', amount: 20_000, paymentMethod: 'virement_interne', description: 'Recharge', reference: null
      },
      ACCOUNTS,
      fallback
    );
    expect(values).toMatchObject({
      editingId: 10, editingTransferId: 3, showPanel: 'transfert',
      formAccountId: 'current', destinationAccountId: 'badnet', date: '2026-07-13', destinationDate: '2026-07-15'
    });
  });

  it('reconstitue le même virement depuis sa jambe destination', () => {
    const values = editValuesFor(
      {
        id: 11, type: 'transfert', transferId: 3, transferLeg: 'destination', accountId: 4, counterpartAccountId: 1,
        date: '2026-07-15', counterpartDate: '2026-07-13', amount: 20_000, paymentMethod: 'virement_interne', description: 'Recharge', reference: null
      },
      ACCOUNTS,
      fallback
    );
    expect(values).toMatchObject({ formAccountId: 'current', destinationAccountId: 'badnet', date: '2026-07-13', destinationDate: '2026-07-15' });
  });

  it('laisse la date de crédit vide quand elle vaut celle du débit', () => {
    const values = editValuesFor(
      {
        id: 12, type: 'transfert', transferId: 3, transferLeg: 'destination', accountId: 4, counterpartAccountId: 1,
        date: '2026-07-13', counterpartDate: '2026-07-13', amount: 100, paymentMethod: 'virement_interne', description: 'Recharge', reference: null
      },
      ACCOUNTS,
      fallback
    );
    expect(values.date).toBe('2026-07-13');
    expect(values.destinationDate).toBe('');
  });

  it('retombe sur le compte et l’exercice de l’écran quand l’écriture ne les porte pas', () => {
    const values = editValuesFor(
      { id: 1, type: 'recette', accountId: 999, amount: 100, date: '2026-01-01', paymentMethod: 'especes', description: 'x', reference: null },
      ACCOUNTS,
      fallback
    );
    expect(values.formAccountId).toBe('current');
    expect(values.targetSeasonId).toBe('9');
  });
});

describe('submitTransaction, virement en modification', () => {
  const base = {
    editingId: 11, editingTransferId: 3, showPanel: 'transfert' as const, amount: '200.00', date: '2026-07-13', category: '',
    formAccountId: 'current', destinationAccountId: 'badnet', destinationDate: '2026-07-15', paymentMethod: 'virement_interne',
    description: 'Recharge', reference: '', accrualType: 'normal', accrualNote: '', targetSeasonId: '1', memberId: ''
  };

  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ success: true }), { status: 200 })));
    vi.stubGlobal('sessionStorage', { setItem: vi.fn(), getItem: vi.fn(), removeItem: vi.fn() });
  });
  afterEach(() => vi.unstubAllGlobals());

  it('vise le virement entier, par son identifiant à lui et non celui de la jambe', async () => {
    await submitTransaction(base);
    const [, init] = (fetch as any).mock.calls[0];
    const body = JSON.parse(init.body);
    expect(body).toMatchObject({
      action: 'update-transfer', id: 3, seasonId: '1', sourceAccountId: 'current', destinationAccountId: 'badnet',
      amountCents: 20_000, sourceDate: '2026-07-13', destinationDate: '2026-07-15', description: 'Recharge', reference: null
    });
    expect(sessionStorage.setItem).toHaveBeenCalledWith('scrollToTx', '11');
  });

  it('refuse une jambe qui ne connaît pas son virement plutôt que de créer un doublon', async () => {
    await expect(submitTransaction({ ...base, editingTransferId: null })).rejects.toThrow('ne connaît pas son virement');
    expect(fetch).not.toHaveBeenCalled();
  });

  it('remonte le refus du serveur tel quel', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ success: false, error: 'pointée sur le relevé' }), { status: 409 })));
    await expect(submitTransaction(base)).rejects.toThrow('pointée sur le relevé');
  });
});
