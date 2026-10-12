import { seasonsTable, categoriesTable } from '@nba/accounting/schema';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { setupMockDb } from '@nba/db/test-utils';
import { eq, sql } from 'drizzle-orm';
import { analyzeBankStatementLines } from './handler';
import { AnalyzeBankStatementLinesRepository } from './repository';
import { categorieImposee } from './keyword-rules';
import { bankStatementLinesTable } from '../../shared/schema';

const CATEGORIES = [
  { id: 1, adminLabel: 'Adhésions & Inscriptions', adherentLabel: 'Adhésions & Inscriptions' },
  { id: 7, adminLabel: 'Cordages', adherentLabel: 'Cordages' },
  { id: 8, adminLabel: 'Volants', adherentLabel: 'Volants' },
  { id: 11, adminLabel: 'Licences FFBaD', adherentLabel: 'Licences FFBaD' },
  { id: 12, adminLabel: 'Championnats', adherentLabel: 'Championnats' },
  // Les libellés de la production, faute de frappe comprise.
  { id: 34, adminLabel: 'Textiles & Accesoires', adherentLabel: 'Maillots & Grips' }
];

describe('categorieImposee', () => {
  it('range un maillot en textile, quelle que soit la casse ou les accents', () => {
    expect(categorieImposee('VIR SEPA MARTIN LUCAS MAILLOT TAILLE L', CATEGORIES)).toBe(34);
    expect(categorieImposee('Virement Durand — 2 maillots', CATEGORIES)).toBe(34);
    expect(categorieImposee('ACHAT SURGRIPS', CATEGORIES)).toBe(34);
  });

  it('laisse au trésorier un motif qui mêle cotisation et maillot : c’est une ventilation', () => {
    expect(categorieImposee('COTISATION + MAILLOT DUPONT', CATEGORIES)).toBeNull();
  });

  it('range la ligue d’Île-de-France en licences', () => {
    expect(categorieImposee('PRLV SEPA LIGUE D ILE DE FRANCE DE BADMINTON', CATEGORIES)).toBe(11);
    expect(categorieImposee('LIGUE IDF BADMINTON', CATEGORIES)).toBe(11);
    // Une compétition de la ligue reste aux championnats.
    expect(categorieImposee('LIGUE D ILE DE FRANCE DE BADMINTON INTERCLUBS', CATEGORIES)).toBeNull();
  });

  it("ne décide rien quand le mot n'y est pas, ni quand la catégorie n'existe pas au club", () => {
    expect(categorieImposee('VIR SEPA MARTIN LUCAS', CATEGORIES)).toBeNull();
    expect(categorieImposee('MAILLOT', CATEGORIES.filter((c) => c.id !== 34))).toBeNull();
  });
});

describe('analyse : catégorie imposée par le motif et catalogue de la boutique', () => {
  let db: any;

  beforeEach(async () => {
    ({ db } = await setupMockDb());
    const saisons = await db.select().from(seasonsTable).all();
    if (!saisons.some((s: any) => s.code === '25-26')) {
      await db.insert(seasonsTable).values({
        code: '25-26', name: 'Saison 25-26', startDate: '2025-09-01', endDate: '2026-08-31',
        active: true, closedAt: null, createdAt: new Date()
      }).run();
    }
    await db.run(sql`DELETE FROM products`);
    await db.run(sql`DELETE FROM product_categories`);
    await db.run(sql`DELETE FROM categories`);
    await db.insert(categoriesTable).values(
      CATEGORIES.map((c) => ({ ...c, hideInExpenses: false, createdAt: new Date() }))
    ).run();
  });

  const ligne = (id: number, amountCents: number, name: string) =>
    db.insert(bankStatementLinesTable).values({
      id, fitid: `TX${id}`, accountId: 1, amountCents, date: '2026-01-10', name, memo: '',
      status: 'pending', createdAt: new Date()
    }).run();

  const suggestion = async (id: number) => {
    const [l] = await db.select().from(bankStatementLinesTable).where(eq(bankStatementLinesTable.id, id)).all();
    return JSON.parse(l.aiSuggestions);
  };

  it('garde le maillot en textile même quand le modèle répond « cotisation »', async () => {
    await ligne(1, 1000, 'VIR SEPA MARTIN LUCAS MAILLOT');
    vi.spyOn(AnalyzeBankStatementLinesRepository.prototype, 'getMembersBySeason').mockResolvedValue([
      { id: 9, lastName: 'Martin', firstName: 'Lucas', birthDate: '1990-01-01', amountRemainingCents: 0, parent1Name: null } as any
    ]);
    const ai = { run: vi.fn().mockResolvedValue({ response: JSON.stringify({ memberId: 9, memberName: 'Martin Lucas', category: 1, confidence: 0.9 }) }) };

    await analyzeBankStatementLines(db, ai, { seasonId: '25-26' });

    expect(ai.run).toHaveBeenCalled();
    expect((await suggestion(1)).category).toBe(34);
  });

  it('range un prélèvement de la ligue en licences', async () => {
    await ligne(2, -245000, 'PRLV SEPA LIGUE D ILE DE FRANCE DE BADMINTON');
    vi.spyOn(AnalyzeBankStatementLinesRepository.prototype, 'getMembersBySeason').mockResolvedValue([]);

    await analyzeBankStatementLines(db, { run: vi.fn() }, { seasonId: '25-26' });

    expect((await suggestion(2)).category).toBe(11);
  });

  it('lit le catalogue de la boutique : le montant exact d’un tube de volants désigne les volants', async () => {
    await db.run(sql`INSERT INTO product_categories (id, label, accounting_category_id, active, created_at) VALUES (1, 'Volants', 8, 1, 0)`);
    await db.run(sql`INSERT INTO products (name, product_category_id, price_cents, stock, track_stock, active, created_at) VALUES ('RSL Grade 1', 1, 2850, 10, 0, 1, 0)`);
    await ligne(3, 5700, 'VIR SEPA X');
    vi.spyOn(AnalyzeBankStatementLinesRepository.prototype, 'getMembersBySeason').mockResolvedValue([]);

    await analyzeBankStatementLines(db, { run: vi.fn() }, { seasonId: '25-26' });

    expect((await suggestion(3)).category).toBe(8);
  });
});
