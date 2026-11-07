import type { Mail } from '@nba/mailer';

export function codeMail(clubName: string, code: string): Mail {
  return {
    subject: `Votre code carte buvette : ${code}`,
    text: `Votre code pour ouvrir votre carte buvette ${clubName} est : ${code}\n\nIl expire dans 10 minutes. Si vous n'êtes pas à l'origine de cette demande, ignorez ce message.`,
    html: `<p>Votre code pour ouvrir votre carte buvette ${clubName} :</p><p style="font-size:32px;font-weight:700;letter-spacing:6px">${code}</p><p>Il expire dans 10 minutes. Si vous n'êtes pas à l'origine de cette demande, ignorez ce message.</p>`
  };
}

export function newDeviceMail(clubName: string): Mail {
  return {
    subject: 'Votre carte buvette a été ouverte sur un nouvel appareil',
    text: `Votre carte buvette ${clubName} vient d'être ouverte sur un nouvel appareil. Si ce n'est pas vous, ouvrez votre carte et choisissez « Déconnecter les autres appareils ».`,
    html: `<p>Votre carte buvette ${clubName} vient d'être ouverte sur un nouvel appareil.</p><p>Si ce n'est pas vous, ouvrez votre carte et choisissez « Déconnecter les autres appareils ».</p>`
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
