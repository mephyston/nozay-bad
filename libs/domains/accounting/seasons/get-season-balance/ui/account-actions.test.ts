import { describe, it, expect } from 'vitest';
import { accountActions, prefillAction, refundActionFor, resolveAccountRef, resolvePaymentKind, showsMemberAdvances } from './account-actions';
import { indicationDeSaisie } from './account-hints';

const ACCOUNTS = [
  { id: 1, code: 'current', label: 'Compte Courant', kind: 'bank' },
  { id: 3, code: 'buvette', label: 'Caisse buvette', kind: 'cash' },
  { id: 4, code: 'badnet', label: 'Badnet', kind: 'wallet' },
  { id: 5, code: 'member_advances', label: 'Avances', kind: 'third_party' },
  { id: 6, code: 'labaz', label: 'Bons Labaz', kind: 'voucher' },
  { id: 7, code: 'pass_sport', label: "Pass'Sport", kind: 'voucher' }
];
const METHODS = [
  { code: 'vir', kind: 'transfer' },
  { code: 'esp', kind: 'cash' },
  { code: 'bon_labaz', kind: 'voucher', defaultAccountCode: 'labaz' },
  { code: 'bon_pass_sport', kind: 'voucher', defaultAccountCode: 'pass_sport' },
  { code: 'interne', kind: 'internal' }
];
const ctxFor = (code: string) => ({
  today: '2026-09-06',
  targetSeasonId: '7',
  self: ACCOUNTS.find((a) => a.code === code)!,
  accounts: ACCOUNTS,
  paymentMethods: METHODS
});

describe('accountActions', () => {
  it('donne les trois mêmes gestes à tous les comptes : recette, dépense, virement', () => {
    for (const kind of ['bank', 'cash', 'wallet', 'voucher', 'paypal']) {
      expect(accountActions(kind).map((a) => a.label)).toEqual(['Recette', 'Dépense', 'Virement']);
    }
    // On ne saisit rien à la main sur le compte d'attente des adhérents.
    expect(accountActions('third_party')).toEqual([]);
  });

  it("garde le crédit du porte-monnaie d'une adhérente hors du menu, pour l'encart des avances", () => {
    expect(accountActions('wallet').some((a) => a.refundsPendingAdvance)).toBe(false);
    expect(refundActionFor('wallet')?.refundsPendingAdvance).toBe(true);
    expect(refundActionFor('cash')).toBeNull();
    expect(showsMemberAdvances('wallet')).toBe(true);
    expect(showsMemberAdvances('third_party')).toBe(true);
    expect(showsMemberAdvances('voucher')).toBe(false);
  });

  it('pré-remplit un remboursement depuis l’avance en attente choisie, montant et libellé compris', () => {
    const values = prefillAction(refundActionFor('wallet')!, { ...ctxFor('badnet'), pending: { description: 'Reçu de Mme Dupont', reference: 'VIR-77', amountCents: 2500 } });
    expect(values).toMatchObject({
      formAccountId: 'badnet',
      destinationAccountId: 'member_advances',
      amount: '25.00',
      description: 'Rendu à Mme Dupont',
      reference: 'VIR-77'
    });
  });

  it('retient le moyen de paiement de la nature du compte : espèces pour la caisse, le bon de CE compte', () => {
    expect(prefillAction(accountActions('cash')[0], ctxFor('buvette'))).toMatchObject({ showPanel: 'recette', formAccountId: 'buvette', paymentMethod: 'esp' });
    expect(prefillAction(accountActions('voucher')[1], ctxFor('pass_sport'))).toMatchObject({ showPanel: 'depense', paymentMethod: 'bon_pass_sport' });
    expect(prefillAction(accountActions('wallet')[0], ctxFor('badnet')).paymentMethod).toBe('vir');
  });

  it("propose la banque comme destination d'un virement, et un autre compte depuis la banque", () => {
    expect(prefillAction(accountActions('voucher')[2], ctxFor('labaz'))).toMatchObject({
      showPanel: 'transfert', formAccountId: 'labaz', destinationAccountId: 'current', paymentMethod: 'interne'
    });
    const depuisLaBanque = prefillAction(accountActions('bank')[2], ctxFor('current'));
    expect(depuisLaBanque.formAccountId).toBe('current');
    expect(depuisLaBanque.destinationAccountId).toBe('buvette');
  });

  it("retombe sur « au choix » quand le club n'a pas de compte de la nature demandée, sans inventer de code", () => {
    const ctx = { self: ACCOUNTS[2], accounts: ACCOUNTS.filter((a) => a.kind !== 'third_party') };
    expect(resolveAccountRef('*third_party', ctx, 'badnet')).toBe('current');
    expect(resolvePaymentKind('cash', [{ code: 'vir', kind: 'transfer' }])).toBe('vir');
    expect(resolvePaymentKind('cash', [])).toBe('');
  });
});

describe('indicationDeSaisie', () => {
  const compte = (code: string) => ACCOUNTS.find((a) => a.code === code)!;

  it('nomme le virement selon les deux comptes choisis, et propose son libellé', () => {
    expect(indicationDeSaisie('transfert', compte('labaz'), 'labaz', 'current', ACCOUNTS)).toMatchObject({ libelle: 'Remboursement Bons Labaz' });
    expect(indicationDeSaisie('transfert', compte('buvette'), 'buvette', 'current', ACCOUNTS)?.libelle).toBe('Dépôt des espèces en banque');
    expect(indicationDeSaisie('transfert', compte('badnet'), 'badnet', 'current', ACCOUNTS)?.libelle).toBe('Rapatriement vers la banque');
    // Inversé par le trésorier : la phrase suit.
    expect(indicationDeSaisie('transfert', compte('badnet'), 'current', 'badnet', ACCOUNTS)?.libelle).toBe('Recharge du porte-monnaie');
    expect(indicationDeSaisie('transfert', compte('labaz'), 'labaz', 'buvette', ACCOUNTS)?.libelle).toBeUndefined();
  });

  it("explique la recette et la dépense d'un compte de bons, et se tait pour la banque", () => {
    expect(indicationDeSaisie('recette', compte('labaz'), 'labaz', '', ACCOUNTS)?.texte).toContain('rattachez-le');
    expect(indicationDeSaisie('depense', compte('labaz'), 'labaz', '', ACCOUNTS)?.texte).toContain('commission');
    expect(indicationDeSaisie('recette', compte('current'), 'current', '', ACCOUNTS)).toBeNull();
  });
});
