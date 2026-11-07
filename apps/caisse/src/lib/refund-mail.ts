import type { Mail } from '@nba/mailer';
import { formatEuros } from './cart';

export function refundMail(clubName: string, amountCents: number): Mail {
  const amount = formatEuros(amountCents);
  return {
    subject: `Votre carte buvette a été remboursée de ${amount}`,
    text: `${clubName} vous a remboursé ${amount} en espèces. Votre carte buvette reste ouverte, avec un solde de 0 €. Si vous n'êtes pas à l'origine de ce remboursement, contactez le club.`,
    html: `<p>${clubName} vous a remboursé <strong>${amount}</strong> en espèces.</p><p>Votre carte buvette reste ouverte, avec un solde de 0 €.</p><p>Si vous n'êtes pas à l'origine de ce remboursement, contactez le club.</p>`
  };
}
