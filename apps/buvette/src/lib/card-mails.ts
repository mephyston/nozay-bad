import type { Mail } from '@nba/mailer';

/**
 * Le code de connexion est le seul courriel de la buvette : un tournoi compte 250 à 300 clients
 * sur un week-end, et le quota d'envoi ne suffirait pas à des confirmations ou des alertes.
 */

export function codeMail(clubName: string, code: string): Mail {
  return {
    subject: `Votre code carte buvette : ${code}`,
    text: `Votre code pour ouvrir votre carte buvette ${clubName} est : ${code}\n\nIl expire dans 10 minutes. Si vous n'êtes pas à l'origine de cette demande, ignorez ce message.`,
    html: `<p>Votre code pour ouvrir votre carte buvette ${clubName} :</p><p style="font-size:32px;font-weight:700;letter-spacing:6px">${code}</p><p>Il expire dans 10 minutes. Si vous n'êtes pas à l'origine de cette demande, ignorez ce message.</p>`
  };
}

export function mailClub(locals: App.Locals) {
  const s = locals.club?.settings;
  return {
    name: s?.name || 'votre club',
    senderName: s?.senderName || s?.name || 'Buvette',
    contactEmail: s?.contactEmail || '',
    membershipUrl: '',
    signature: s?.emailSignature || s?.name || ''
  };
}
