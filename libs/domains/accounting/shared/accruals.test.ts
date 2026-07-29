import { seasonsTable } from '@nba/accounting/schema';
import { describe, it, expect, beforeEach } from 'vitest';
import { setupMockDb } from '@nba/db/test-utils';
import { validateAccrualAndFiscalPhase } from './accruals';

import { AppError } from '@nba/db';

describe('validateAccrualAndFiscalPhase', () => {
  let db: any;

  beforeEach(async () => {
    const mock = await setupMockDb();
    db = mock.db;

    // Seed test season 25-26 (2025-09-01 to 2026-08-31)
    await db.insert(seasonsTable).values({
      id: 1,
      code: '25-26',
      name: 'Saison 2025-2026',
      startDate: '2025-09-01',
      endDate: '2026-08-31',
      active: true,
      closedAt: null,
      createdAt: new Date()
    });

    // Seed closed season 24-25
    await db.insert(seasonsTable).values({
      id: 2,
      code: '24-25',
      name: 'Saison 2024-2025',
      startDate: '2024-09-01',
      endDate: '2025-08-31',
      active: false,
      closedAt: new Date(1756684800000), // Closed season
      createdAt: new Date()
    });
  });

  it('rejects normal transaction with date outside season bounds', async () => {
    await expect(validateAccrualAndFiscalPhase(db, {
      seasonId: '25-26',
      type: 'depense',
      date: '2025-08-15', // Outside bounds
      accrualType: 'normal'
    })).rejects.toThrow(AppError);
  });

  it('accepts out-of-bounds transaction when accrualType is set with mandatory note', async () => {
    const res = await validateAccrualAndFiscalPhase(db, {
      seasonId: '25-26',
      type: 'depense',
      date: '2025-08-15',
      accrualType: 'charge_constatee_avance',
      accrualNote: 'Achat maillots 25-26 commande en aout'
    });
    expect(res).toBeDefined();
    expect(res.code).toBe('25-26');
  });

  it('rejects out-of-bounds transaction when accrualNote is missing', async () => {
    await expect(validateAccrualAndFiscalPhase(db, {
      seasonId: '25-26',
      type: 'depense',
      date: '2025-08-15',
      accrualType: 'charge_constatee_avance',
      accrualNote: ''
    })).rejects.toThrow('note explicative');
  });

  it('rejects charge accrual types on a recette transaction', async () => {
    await expect(validateAccrualAndFiscalPhase(db, {
      seasonId: '25-26',
      type: 'recette',
      date: '2025-08-15',
      accrualType: 'charge_constatee_avance',
      accrualNote: 'Invalid charge accrual on revenue'
    })).rejects.toThrow('Les régularisations de type charge ne sont pas autorisées sur une recette.');
  });

  it('rejects product accrual types on a depense transaction', async () => {
    await expect(validateAccrualAndFiscalPhase(db, {
      seasonId: '25-26',
      type: 'depense',
      date: '2025-08-15',
      accrualType: 'produit_constate_avance',
      accrualNote: 'Invalid product accrual on expense'
    })).rejects.toThrow('Les régularisations de type produit ne sont pas autorisées sur une dépense.');
  });

  it('rejects any accrual type on a transfert transaction', async () => {
    await expect(validateAccrualAndFiscalPhase(db, {
      seasonId: '25-26',
      type: 'transfert',
      date: '2025-08-15',
      accrualType: 'charge_constatee_avance',
      accrualNote: 'Invalid accrual on transfer'
    })).rejects.toThrow('Aucune régularisation n\'est autorisée sur un virement interne.');
  });

  it('blocks all operations when season is closed (Phase 3)', async () => {
    await expect(validateAccrualAndFiscalPhase(db, {
      seasonId: '24-25',
      type: 'depense',
      date: '2025-01-15',
      accrualType: 'normal'
    })).rejects.toThrow('L\'exercice comptable est arrêté et clôturé');
  });
});
