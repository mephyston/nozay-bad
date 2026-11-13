import { describe, it, expect, beforeEach } from 'vitest';
import { setupMockDb } from '@nba/db/test-utils';
import { type Db } from '@nba/db';
import { sql } from 'drizzle-orm';
import { insertMemberFixture } from '@nba/members/test-fixtures';
import type { CashMail } from '../../shared/cash';
import { openCashReceipt } from '../open-cash-receipt/handler';
import { confirmCashReceipt, previewCashReceipt } from '../confirm-cash-receipt/handler';
import { sendCashReceiptCode } from '../send-cash-receipt-code/handler';
import { signWithCode, signWithSignature } from '../sign-cash-receipt/handler';
import { cancelCashReceipt } from '../cancel-cash-receipt/handler';
import { listHeldCashReceipts } from '../list-cash-receipts/handler';
import { listCashInHand } from '../list-cash-in-hand/handler';
import { openCashHandover } from '../open-cash-handover/handler';
import { cancelCashHandover } from '../cancel-cash-handover/handler';
import { confirmCashHandover, signCashHandover } from './handler';

/**
 * L'encaissement d'espèces de bout en bout (RF-ACC-003) : un reçu signé des deux parties
 * au gymnase, aucune écriture tant qu'il est en main de l'entraîneur, et les recettes
 * passées à la remise, écart compris.
 */
const COACH = 'camille@club.test';
const TRESORIER = 'tresorier@club.test';
const SIGNATURE = 'data:image/png;base64,' + 'A'.repeat(100);

describe('encaissement d’espèces', () => {
  let db: Db;
  let alex: number;
  let autreFoyer: number;
  let cotisation: number;
  let ecart: number;
  let mails: { to: string; mail: CashMail }[];
  const mailer = async (to: string, mail: CashMail) => { mails.push({ to, mail }); };
  const entries = async () => (await db.get<{ n: number }>(sql`SELECT COUNT(*) AS n FROM ledger_entries`))!.n;

  beforeEach(async () => {
    ({ db } = await setupMockDb());
    mails = [];
    await db.run(sql`INSERT INTO seasons (code, name, start_date, end_date, active, created_at) VALUES ('26-27', 'Saison 26-27', '2026-09-01', '2027-08-31', 1, 0)`);
    const season = (await db.get<{ id: number }>(sql`SELECT id FROM seasons WHERE code = '26-27'`))!.id;
    alex = (await insertMemberFixture(db, { licence: '00000001', seasonId: season, firstName: 'Alex', lastName: 'Martin', email: 'alex@foyer.test' })).id;
    autreFoyer = (await insertMemberFixture(db, { licence: '00000002', seasonId: season, firstName: 'Sam', lastName: 'Durand', email: 'sam@foyer.test' })).id;
    cotisation = (await db.get<{ id: number }>(sql`SELECT id FROM categories WHERE admin_label = 'Adhésions & Inscriptions'`))!.id;
    ecart = (await db.get<{ id: number }>(sql`SELECT id FROM categories WHERE admin_label = 'Subventions'`))!.id;
  });

  const ouvrir = (amountCents = 150_00) =>
    openCashReceipt(db, COACH, { payerMemberId: alex, amountCents, categoryId: cotisation, collectorName: 'Camille' });

  it('scelle un reçu confirmé par QR code depuis le foyer du payeur, sans écriture', async () => {
    const before = await entries();
    const { receipt, qr } = await ouvrir();
    expect(receipt).toMatchObject({ status: 'pending', payerName: 'Alex Martin', payerEmailHint: 'al••@foyer.test' });

    // Un autre foyer ne voit rien, et ne signe rien.
    await expect(previewCashReceipt(db, qr, { email: 'sam@foyer.test', memberIds: [autreFoyer] })).rejects.toMatchObject({ status: 404 });

    const apercu = await previewCashReceipt(db, qr, { email: 'alex@foyer.test', memberIds: [alex] });
    expect(apercu).toMatchObject({ amountCents: 150_00, collectorName: 'Camille', motif: expect.any(String) });

    await confirmCashReceipt(db, mailer, qr, { email: 'alex@foyer.test', memberIds: [alex] });
    // Le QR code ne sert qu'une fois.
    await expect(confirmCashReceipt(db, mailer, qr, { email: 'alex@foyer.test', memberIds: [alex] })).rejects.toMatchObject({ status: 404 });

    expect(mails.map((m) => m.to)).toEqual(['alex@foyer.test']);
    expect(mails[0].mail.text).toContain('Remis à : Camille');
    expect(await entries()).toBe(before);
    expect((await listHeldCashReceipts(db, COACH)).totalCents).toBe(150_00);
  });

  it('refuse un QR code expiré', async () => {
    const { qr } = await ouvrir();
    const later = new Date(Date.now() + 3 * 60 * 1000);
    await expect(confirmCashReceipt(db, mailer, qr, { email: 'alex@foyer.test', memberIds: [alex] }, later)).rejects.toMatchObject({ status: 404 });
  });

  it('scelle par le code reçu sur l’adresse du payeur, trois essais au plus', async () => {
    const { receipt } = await ouvrir();
    const { sentTo } = await sendCashReceiptCode(db, mailer, COACH, receipt.id);
    expect(sentTo).toBe('al••@foyer.test');
    const code = mails[0].mail.subject.match(/(\d{4})$/)![1];
    const faux = code === '0000' ? '1111' : '0000';

    await expect(signWithCode(db, mailer, COACH, receipt.id, faux)).rejects.toThrow(/Encore 2/);
    // Un autre encaisseur ne peut rien sur ce reçu.
    await expect(signWithCode(db, mailer, 'autre@club.test', receipt.id, code)).rejects.toMatchObject({ status: 404 });
    const signed = await signWithCode(db, mailer, COACH, receipt.id, code);
    expect(signed).toMatchObject({ status: 'sealed', signatureMethod: 'code' });
  });

  it('accepte la signature au doigt, et l’annulation d’un reçu jamais signé', async () => {
    const a = await ouvrir();
    expect(await signWithSignature(db, mailer, COACH, a.receipt.id, SIGNATURE)).toMatchObject({ signatureMethod: 'signature' });
    await expect(cancelCashReceipt(db, COACH, a.receipt.id)).rejects.toMatchObject({ status: 409 });

    const b = await ouvrir(20_00);
    await cancelCashReceipt(db, COACH, b.receipt.id);
    expect((await listHeldCashReceipts(db, COACH)).receipts.map((r) => r.id)).toEqual([a.receipt.id]);
  });

  it('passe une recette par reçu et l’écart à la remise, signée par l’encaisseur', async () => {
    for (const amount of [150_00, 200_00, 100_00]) {
      const { receipt } = await ouvrir(amount);
      await signWithSignature(db, mailer, COACH, receipt.id, SIGNATURE);
    }
    expect(await listCashInHand(db)).toMatchObject([{ collectorEmail: COACH, count: 3, totalCents: 450_00 }]);

    // Un écart sans catégorie est refusé ; on ne se remet pas d'espèces à soi-même.
    await expect(openCashHandover(db, TRESORIER, { collectorEmail: COACH, countedCents: 350_00 })).rejects.toThrow(/écart/);
    await expect(openCashHandover(db, COACH, { collectorEmail: COACH, countedCents: 450_00 })).rejects.toThrow(/soi-même/);

    const before = await entries();
    const handover = await openCashHandover(db, TRESORIER, { collectorEmail: COACH, countedCents: 350_00, gapCategoryId: ecart });
    expect(handover).toMatchObject({ expectedCents: 450_00, gapCents: -100_00 });
    // Le QR code de la remise ne vaut que pour l'encaisseur concerné.
    await expect(confirmCashHandover(db, 'autre@club.test', handover.qr)).rejects.toMatchObject({ status: 404 });

    const sealed = await confirmCashHandover(db, COACH, handover.qr);
    expect(sealed).toMatchObject({ status: 'sealed', receipts: 3, gapCents: -100_00 });
    expect(await entries()).toBe(before + 4);

    const recettes = await db.all<{ amount_cents: number; member_id: number | null; type: string }>(
      sql`SELECT amount_cents, member_id, type FROM ledger_entries WHERE reference LIKE '%remise n°%' ORDER BY id`
    );
    expect(recettes.map((r) => [r.type, r.amount_cents])).toEqual([['recette', 150_00], ['recette', 200_00], ['recette', 100_00], ['depense', 100_00]]);
    expect(recettes.slice(0, 3).every((r) => r.member_id === alex)).toBe(true);
    expect(await listCashInHand(db)).toEqual([]);

    // Signer deux fois n'écrit rien deux fois.
    await expect(signCashHandover(db, handover.id, SIGNATURE)).rejects.toThrow(/n’attend plus/);
    expect(await entries()).toBe(before + 4);
  });

  it('rend ses reçus à l’encaisseur quand la remise est abandonnée', async () => {
    const { receipt } = await ouvrir();
    await signWithSignature(db, mailer, COACH, receipt.id, SIGNATURE);
    const handover = await openCashHandover(db, TRESORIER, { collectorEmail: COACH, countedCents: 150_00 });
    expect(await listCashInHand(db)).toEqual([]);
    await cancelCashHandover(db, handover.id);
    expect((await listHeldCashReceipts(db, COACH)).totalCents).toBe(150_00);
  });
});
