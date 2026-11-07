import { deliver, type ClubMailIdentity, type DeliveryResult, type EmailEnv } from '@nba/mailer';

export type { ClubMailIdentity, DeliveryResult, EmailEnv };

export function clubMailIdentity(club: App.Locals['club']): ClubMailIdentity {
  const s = club?.settings;
  return {
    name: s?.name || 'votre club',
    senderName: s?.senderName || s?.name || 'Espace adhérent',
    contactEmail: s?.contactEmail || '',
    membershipUrl: s?.ffbadMembershipUrl || 'https://www.myffbad.fr/',
    signature: s?.emailSignature || s?.name || ''
  };
}

export async function sendOtpEmail(env: EmailEnv, club: ClubMailIdentity, to: string, code: string): Promise<DeliveryResult> {
  return deliver(
    env,
    club,
    to,
    {
      subject: `Votre code de connexion : ${code}`,
      html: otpHtml(club, code),
      text: `Votre code de connexion ${club.name} est : ${code}\n\nCe code expire dans 10 minutes. Si vous n'êtes pas à l'origine de cette demande, ignorez cet email.`
    },
    (mode) => console.info(`[auth][${mode}] OTP pour ${to} : ${code} (email NON envoyé)`)
  );
}

/**
 * Envoyé à qui tente de se connecter sans licence en cours, alors qu'il en avait une la
 * saison passée. C'est le SEUL canal par lequel on le lui dit : la page de connexion, elle,
 * répond exactement la même chose à tout le monde pour ne pas révéler qui est au fichier.
 *
 * Le délai évoqué est celui de l'import Poona par le bureau — inutile de le nommer.
 */
export async function sendRenewalEmail(
  env: EmailEnv,
  club: ClubMailIdentity,
  to: string,
  seasonName: string
): Promise<DeliveryResult> {
  const season = seasonName || 'la nouvelle saison';
  return deliver(
    env,
    club,
    to,
    {
      subject: `Votre licence pour ${season}`,
      html: renewalHtml(club, season),
      text:
        `Bonjour,\n\n` +
        `Vous avez demandé à vous connecter à votre espace adhérent ${club.name}, mais nous ne trouvons pas de licence à votre nom pour ${season}.\n\n` +
        `Pour réadhérer : ${club.membershipUrl}\n\n` +
        `Si vous avez déjà repris votre licence, il n'y a rien à faire : votre accès s'ouvrira dans les prochains jours, le temps que le club enregistre votre inscription.\n\n` +
        question(club) +
        club.signature
    },
    (mode) => console.info(`[auth][${mode}] Invitation à réadhérer pour ${to} (email NON envoyé)`)
  );
}

/**
 * Envoyé à qui s'est inscrit par anticipation : sa licence est enregistrée, mais pour une
 * saison qui n'a pas commencé. Rien à faire de sa part, d'où un message qui donne une date
 * plutôt qu'une action.
 */
export async function sendUpcomingAccessEmail(
  env: EmailEnv,
  club: ClubMailIdentity,
  to: string,
  seasonName: string,
  opensOn: string
): Promise<DeliveryResult> {
  const season = seasonName || 'la nouvelle saison';
  const date = formatFrenchDate(opensOn);
  return deliver(
    env,
    club,
    to,
    {
      subject: `Votre accès adhérent ouvre le ${date}`,
      html: upcomingHtml(club, season, date),
      text:
        `Bonjour,\n\n` +
        `Votre licence pour ${season} est bien enregistrée — merci !\n\n` +
        `Votre espace adhérent ouvrira le ${date}, premier jour de la saison. Il n'y a rien à faire d'ici là : reconnectez-vous à cette date avec le même identifiant.\n\n` +
        question(club) +
        club.signature
    },
    (mode) => console.info(`[auth][${mode}] Accès anticipé pour ${to}, ouverture le ${opensOn} (email NON envoyé)`)
  );
}

/**
 * Envoyé à qui a bien une licence pour la saison en cours, mais dont le foyer n'a encore
 * réglé aucune cotisation, même partiellement. L'accès s'ouvre au premier versement importé
 * de Poona : on le dit, sans révéler sur la page de connexion que l'adresse est au fichier.
 */
export async function sendPaymentPendingEmail(
  env: EmailEnv,
  club: ClubMailIdentity,
  to: string,
  seasonName: string
): Promise<DeliveryResult> {
  const season = seasonName || 'la saison en cours';
  return deliver(
    env,
    club,
    to,
    {
      subject: `Votre accès adhérent ouvrira au premier règlement`,
      html: paymentPendingHtml(club, season),
      text:
        `Bonjour,\n\n` +
        `Votre licence pour ${season} est bien enregistrée — merci !\n\n` +
        `Votre espace adhérent s'ouvrira dès que le club aura reçu un premier règlement de votre cotisation, même partiel. Si vous avez déjà réglé, il n'y a rien à faire : l'accès s'ouvrira dans les prochains jours, le temps que le club enregistre votre paiement.\n\n` +
        question(club) +
        club.signature
    },
    (mode) => console.info(`[auth][${mode}] Cotisation en attente pour ${to} (email NON envoyé)`)
  );
}

/** `2026-09-01` → `1er septembre 2026`. Repli sur la valeur brute si elle est inattendue. */
function formatFrenchDate(iso: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || '');
  if (!match) return iso;
  const [, year, month, day] = match;
  const months = [
    'janvier', 'février', 'mars', 'avril', 'mai', 'juin',
    'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'
  ];
  const d = Number(day);
  return `${d === 1 ? '1er' : d} ${months[Number(month) - 1]} ${year}`;
}

/** « Une question ? … », seulement si le club a une adresse à donner. */
function question(club: ClubMailIdentity): string {
  return club.contactEmail ? `Une question ? Écrivez-nous à ${club.contactEmail}.\n\n` : '';
}

function questionHtml(club: ClubMailIdentity): string {
  return club.contactEmail
    ? `<p style="color: #666; font-size: 14px;">Une question ? Écrivez-nous à <a href="mailto:${club.contactEmail}" style="color:#111;">${club.contactEmail}</a>.</p>`
    : '';
}

function shell(club: ClubMailIdentity, inner: string): string {
  return `
  <div style="font-family: system-ui, -apple-system, Segoe UI, Roboto, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
    ${inner}
    <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;" />
    <p style="color: #999; font-size: 12px; white-space: pre-line;">${escapeHtml(club.signature)}</p>
  </div>`;
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c] ?? c);
}

function otpHtml(club: ClubMailIdentity, code: string): string {
  return shell(club, `
    <h1 style="font-size: 18px; color: #111;">Connexion à votre espace adhérent</h1>
    <p style="color: #444;">Voici votre code de connexion :</p>
    <p style="font-size: 32px; font-weight: 700; letter-spacing: 6px; color: #111; margin: 16px 0;">${code}</p>
    <p style="color: #666; font-size: 14px;">Ce code expire dans 10 minutes. Si vous n'êtes pas à l'origine de cette demande, ignorez cet email.</p>`);
}

function upcomingHtml(club: ClubMailIdentity, seasonName: string, date: string): string {
  return shell(club, `
    <h1 style="font-size: 18px; color: #111;">Votre accès ouvre le ${date}</h1>
    <p style="color: #444;">Votre licence pour ${seasonName} est bien enregistrée — merci !</p>
    <p style="color: #444;">Votre espace adhérent ouvrira le <strong>${date}</strong>, premier jour de la saison. Il n'y a rien à faire d'ici là : reconnectez-vous à cette date avec le même identifiant.</p>
    ${questionHtml(club)}`);
}

function paymentPendingHtml(club: ClubMailIdentity, seasonName: string): string {
  return shell(club, `
    <h1 style="font-size: 18px; color: #111;">Votre accès adhérent ouvrira au premier règlement</h1>
    <p style="color: #444;">Votre licence pour ${seasonName} est bien enregistrée — merci !</p>
    <p style="color: #444;">Votre espace adhérent s'ouvrira dès que le club aura reçu un premier règlement de votre cotisation, même partiel.</p>
    <p style="color: #666; font-size: 14px;">Si vous avez déjà réglé, il n'y a rien à faire : l'accès s'ouvrira dans les prochains jours, le temps que le club enregistre votre paiement.</p>
    ${questionHtml(club)}`);
}

function renewalHtml(club: ClubMailIdentity, seasonName: string): string {
  return shell(club, `
    <h1 style="font-size: 18px; color: #111;">Votre licence pour ${seasonName}</h1>
    <p style="color: #444;">Vous avez demandé à vous connecter à votre espace adhérent, mais nous ne trouvons pas de licence à votre nom pour ${seasonName}.</p>
    <p style="margin: 20px 0;">
      <a href="${club.membershipUrl}" style="display: inline-block; background: #111; color: #fff; text-decoration: none; padding: 12px 20px; border-radius: 6px; font-weight: 600; font-size: 14px;">Reprendre ma licence</a>
    </p>
    <p style="color: #666; font-size: 14px;">Si vous avez déjà repris votre licence, il n'y a rien à faire : votre accès s'ouvrira dans les prochains jours, le temps que le club enregistre votre inscription.</p>
    ${questionHtml(club)}`);
}
