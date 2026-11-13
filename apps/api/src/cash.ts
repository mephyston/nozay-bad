import { createCashRouter, type CashMail, type CashMailer } from '@nba/accounting-api';
import { createDb } from '@nba/db';
import { getClubSettings } from '@nba/club/settings';
import { deliver, type EmailEnv } from '@nba/mailer';

/**
 * L'encaissement d'espèces, avec sa messagerie : le code de confirmation et le reçu
 * partent de l'API, au nom du club. C'est le premier envoi de courriel de l'API — les
 * autres partent de l'espace adhérent et de la buvette.
 *
 * En mode `dry-run` (défaut local), rien ne part : on journalise le sujet, qui porte le
 * code, pour pouvoir tester sans messagerie.
 */
type CashEnv = EmailEnv & { DB: D1Database };

function mailerFor(env: unknown): CashMailer {
  const e = env as CashEnv;
  return async (to: string, mail: CashMail) => {
    const s = await getClubSettings(createDb(e.DB));
    const club = {
      name: s.name,
      senderName: s.senderName || s.name,
      contactEmail: s.contactEmail,
      membershipUrl: s.ffbadMembershipUrl || 'https://www.myffbad.fr/',
      signature: s.emailSignature || s.name
    };
    const result = await deliver(e, club, to, mail, (mode) => console.log(`[espèces] courriel non envoyé (${mode}) : « ${mail.subject} »`));
    if (!result.ok) throw new Error(result.error || 'Courriel non envoyé.');
  };
}

export const cashRouter = createCashRouter({ mailerFor });
