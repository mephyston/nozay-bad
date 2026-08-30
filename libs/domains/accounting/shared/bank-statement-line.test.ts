import { describe, it, expect } from 'vitest';
import { coverageCents, remainingToReconcileCents } from './bank-statement-line';

const CREDIT = { id: 1, accountId: 1, amountCents: 15000 };
const DEBIT = { id: 2, accountId: 1, amountCents: -193993 };

const recette = (amountCents: number) => ({ accountId: 1, type: 'recette', amountCents });
const depense = (amountCents: number) => ({ accountId: 1, type: 'depense', amountCents });

describe('couverture d\'une ligne de relevé', () => {
  it('additionne les écritures de même sens', () => {
    expect(coverageCents([recette(10000), recette(5000)], CREDIT)).toBe(15000);
    expect(remainingToReconcileCents([recette(10000), recette(5000)], CREDIT)).toBe(0);
  });

  it('dit ce qui reste après un pointage partiel', () => {
    expect(remainingToReconcileCents([recette(10000)], CREDIT)).toBe(5000);
  });

  /*
    Le reste s'exprime dans le sens de la ligne, donc positif : c'est ce dont l'écran a besoin
    pour préremplir un montant et contrôler une ventilation, et le serveur pour refuser un
    dépassement d'un simple test de signe.
  */
  it('rend un reste positif sur une ligne au débit', () => {
    expect(remainingToReconcileCents([depense(100000)], DEBIT)).toBe(93993);
  });

  /*
    Le cas du salaire : un net de −1 939,93 € ventilé en un brut au débit et une retenue au
    crédit. Le cumul en valeurs absolues comptait 2 060,07 € et soldait la ligne par excès.
  */
  it('compense les sens mêlés au lieu de les additionner', () => {
    const parts = [depense(200000), recette(6007)];
    expect(coverageCents(parts, DEBIT)).toBe(-193993);
    expect(remainingToReconcileCents(parts, DEBIT)).toBe(0);
  });

  it('rend un reste négatif quand les écritures dépassent la ligne', () => {
    expect(remainingToReconcileCents([recette(20000)], CREDIT)).toBe(-5000);
    expect(remainingToReconcileCents([depense(200000)], DEBIT)).toBe(-6007);
  });

  /* Une jambe `source` retire l'argent du compte, une jambe `destination` l'y verse. */
  it('donne son sens à chaque jambe de virement', () => {
    const source = { accountId: 1, type: 'transfert', transferLeg: 'source', amountCents: 193993 };
    const destination = { accountId: 1, type: 'transfert', transferLeg: 'destination', amountCents: 15000 };
    expect(remainingToReconcileCents([source], DEBIT)).toBe(0);
    expect(remainingToReconcileCents([destination], CREDIT)).toBe(0);
  });

  /*
    La base nomme la colonne `amountCents`, l'écran la reçoit sous `amount` : les deux formes se
    lisent ici. Lire la mauvaise donnait `NaN`, et une ligne qui ne se soldait jamais.
  */
  it('lit indifféremment amountCents et amount', () => {
    expect(coverageCents([{ accountId: 1, type: 'recette', amount: 15000 } as any], CREDIT)).toBe(15000);
  });

  /* Une écriture d'un autre compte ne prouve rien sur cette ligne : elle ne la couvre pas. */
  it('ignore une écriture rattachée à un autre compte', () => {
    expect(coverageCents([{ accountId: 2, type: 'recette', amountCents: 15000 }], CREDIT)).toBe(0);
  });
});
