import { describe, it, expect, beforeEach } from 'vitest';
import { setupMockDb } from '@nba/db/test-utils';
import { type Db } from '@nba/db';
import { sql } from 'drizzle-orm';
import { getFeeBreakdown } from './handler';
import { computeFeeBreakdown } from './compute';

const now = 1783962600;

async function season(db: Db, code: string, start: string, end: string, active = false): Promise<number> {
  await db.run(sql`INSERT INTO seasons (code, name, start_date, end_date, active, created_at) VALUES (${code}, ${'Saison ' + code}, ${start}, ${end}, ${active ? 1 : 0}, ${now})`);
  const row = await db.get<{ id: number }>(sql`SELECT id FROM seasons WHERE code = ${code}`);
  return row!.id;
}

async function categoryId(db: Db, label: string): Promise<number> {
  const row = await db.get<{ id: number }>(sql`SELECT id FROM categories WHERE admin_label = ${label}`);
  return row!.id;
}

async function budget(db: Db, seasonId: number, label: string, type: 'recette' | 'depense', cents: number) {
  await db.run(sql`INSERT INTO season_category_budgets (season_id, category_id, type, amount_cents, created_at) VALUES (${seasonId}, ${await categoryId(db, label)}, ${type}, ${cents}, ${now})`);
}

describe('computeFeeBreakdown', () => {
  const rubriques = [
    { id: 1, label: 'Cotisations', position: 1, membershipFees: true },
    { id: 2, label: 'Encadrement', position: 2, membershipFees: false },
    { id: 3, label: 'Volants', position: 3, membershipFees: false },
    { id: 4, label: 'Tournois', position: 4, membershipFees: false }
  ];
  const categories = [
    { id: 10, adminLabel: 'Adhésions', adherentLabel: 'Adhésions', rubriqueId: 1 },
    { id: 11, adminLabel: 'Salaires', adherentLabel: 'Salaires', rubriqueId: 2 },
    { id: 12, adminLabel: 'Volants', adherentLabel: 'Volants', rubriqueId: 3 },
    { id: 13, adminLabel: 'Tournoi', adherentLabel: 'Tournoi', rubriqueId: 4 },
    { id: 14, adminLabel: 'Frais', adherentLabel: 'Frais', rubriqueId: null },
    { id: 15, adminLabel: 'Virements Internes', adherentLabel: 'Virements Internes', rubriqueId: null }
  ];

  it('ramène chaque rubrique à son solde et la range du bon côté', () => {
    const out = computeFeeBreakdown({
      rows: [
        { categoryId: 10, type: 'recette', cents: 15000_00 },
        { categoryId: 11, type: 'depense', cents: 12000_00 },
        // Les volants revendus en partie : seule la différence coûte.
        { categoryId: 12, type: 'depense', cents: 5000_00 },
        { categoryId: 12, type: 'recette', cents: 2000_00 },
        // Le tournoi rapporte plus qu'il ne coûte : c'est une ressource.
        { categoryId: 13, type: 'recette', cents: 6000_00 },
        { categoryId: 13, type: 'depense', cents: 4000_00 },
        { categoryId: 14, type: 'depense', cents: 1000_00 },
        { categoryId: 15, type: 'depense', cents: 99999_00 }
      ],
      categories,
      rubriques,
      memberCount: 100,
      excludedCategoryId: 15,
      withDetails: true
    });

    expect(out.charges.map((l) => [l.label, l.cents])).toEqual([
      ['Encadrement', 12000_00],
      ['Volants', 3000_00],
      ['Autres', 1000_00]
    ]);
    expect(out.resources.map((l) => [l.label, l.cents])).toEqual([
      ['Cotisations', 15000_00],
      ['Tournois', 2000_00]
    ]);
    expect(out.totalChargesCents).toBe(16000_00);
    expect(out.membershipFeesCents).toBe(15000_00);
    expect(out.charges[0].perMemberCents).toBe(120_00);
    expect(out.charges[0].share).toBeCloseTo(0.75);
    expect(out.charges[1].categories).toEqual([{ label: 'Volants', cents: 3000_00 }]);
  });

  it("ne livre pas le détail par catégorie quand on ne le demande pas", () => {
    const out = computeFeeBreakdown({
      rows: [{ categoryId: 11, type: 'depense', cents: 100 }],
      categories, rubriques, memberCount: 0, withDetails: false
    });
    expect(out.charges[0].categories).toBeUndefined();
    expect(out.charges[0].perMemberCents).toBe(0);
  });
});

describe('getFeeBreakdown', () => {
  let db: Db;
  beforeEach(async () => {
    ({ db } = await setupMockDb());
  });

  it('lit le budget de la saison quand il est saisi', async () => {
    const id = await season(db, '25-26', '2025-09-01', '2026-08-31', true);
    await budget(db, id, 'Adhésions & Inscriptions', 'recette', 20000_00);
    await budget(db, id, 'Salaires et Charges', 'depense', 18000_00);
    await budget(db, id, 'Volants', 'depense', 6000_00);
    await budget(db, id, 'Subventions', 'recette', 4000_00);

    const out = await getFeeBreakdown(db, { countMembers: async () => 200 });

    expect(out.source).toBe('budget');
    expect(out.season).toBe('25-26');
    expect(out.totalChargesCents).toBe(24000_00);
    expect(out.costPerMemberCents).toBe(120_00);
    expect(out.averageFeeCents).toBe(100_00);
    // Avec les seules cotisations, il manquerait 20 € par adhérent.
    expect(out.gapPerMemberCents).toBe(20_00);
    expect(out.resultCents).toBe(0);
    expect(out.progress).toEqual({ realisedChargesCents: 0, plannedChargesCents: 24000_00 });
  });

  it('sans budget, prend le réalisé de la saison précédente et son effectif', async () => {
    const previous = await season(db, '24-25', '2024-09-01', '2025-08-31');
    await season(db, '25-26', '2025-09-01', '2026-08-31', true);
    const account = await db.get<{ id: number }>(sql`SELECT id FROM accounts WHERE kind = 'bank' LIMIT 1`);
    const method = await db.get<{ id: number }>(sql`SELECT id FROM payment_methods LIMIT 1`);
    await db.run(sql`INSERT INTO ledger_entries (season_id, type, account_id, category_id, amount_cents, date, payment_method_id, description, created_at)
      VALUES (${previous}, 'depense', ${account!.id}, ${await categoryId(db, 'Licences FFBaD')}, 5000_00, '2024-10-01', ${method!.id}, 'Licences', ${now})`);

    const seen: number[] = [];
    const out = await getFeeBreakdown(db, { countMembers: async (sid) => { seen.push(sid); return 50; } });

    expect(out.source).toBe('previous');
    expect(out.sourceSeason).toBe('24-25');
    expect(seen).toEqual([previous]);
    expect(out.charges).toMatchObject([{ label: 'Licences et affiliation', cents: 5000_00, perMemberCents: 100_00 }]);
    expect(out.progress).toBeNull();
  });

  it('refuse une saison inconnue', async () => {
    await expect(getFeeBreakdown(db, { seasonCode: '99-00', countMembers: async () => 0 })).rejects.toMatchObject({ status: 404 });
  });
});
