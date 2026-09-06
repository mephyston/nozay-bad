/**
 * Envoi d'email transactionnel via Resend (API REST, aucun SDK ni dépendance Node requise).
 *
 * SÉCURITÉ (dev/staging) — on ne doit JAMAIS envoyer d'OTP à un vrai adhérent hors production.
 * Le comportement est piloté par `EMAIL_MODE`, **fail-closed** (par défaut on n'envoie pas) :
 *   - 'live'      → envoi réel au destinataire (production uniquement).
 *   - 'allowlist' → envoi uniquement si le destinataire est dans EMAIL_ALLOWLIST, sinon rien.
 *   - 'redirect'  → tout est redirigé vers EMAIL_TEST_INBOX (aucun vrai adhérent touché).
 *   - 'dry-run'   → jamais d'envoi, le code est loggué (défaut si EMAIL_MODE absent ou inconnu).
 * En l'absence de RESEND_API_KEY, on est aussi en dry-run.
 *
 * Cette résolution de mode n'existe qu'à UN endroit — `deliver()`. Tout nouvel email doit
 * passer par lui : une seconde implémentation, c'est la garantie qu'un jour l'une des deux
 * oubliera le garde-fou.
 */

export interface EmailEnv {
  RESEND_API_KEY?: string;
  EMAIL_FROM?: string;
  EMAIL_MODE?: string; // 'live' | 'allowlist' | 'redirect' | 'dry-run'
  EMAIL_ALLOWLIST?: string; // CSV des adresses autorisées (mode allowlist)
  EMAIL_TEST_INBOX?: string; // boîte de test (mode redirect)
}

const DEFAULT_FROM = 'Nozay Badminton Association <contact@nozaybad.fr>';

/** Prise de licence FFBad du club. Seule source de cette URL dans l'application. */
export const FFBAD_MEMBERSHIP_URL = 'https://www.myffbad.fr/adherer/NBA91';

const CONTACT_EMAIL = 'contact@nozaybad.fr';

interface Mail {
  subject: string;
  html: string;
  text: string;
}

/**
 * Applique les règles d'envoi puis appelle Resend. `logSkip` décrit ce qu'on n'a PAS envoyé :
 * en local c'est la seule trace disponible, elle doit donc porter l'information utile
 * (le code OTP, notamment).
 */
export interface DeliveryResult {
  ok: boolean;
  error?: string;
  /** Le plafond d'envoi du club est atteint : réessayer plus tard n'y changera rien. */
  quotaReached?: boolean;
}

async function deliver(
  env: EmailEnv,
  to: string,
  mail: Mail,
  logSkip: (mode: string) => void
): Promise<DeliveryResult> {
  const mode = (env.EMAIL_MODE || 'dry-run').toLowerCase();

  // Dry-run : pas de clé, mode dry-run, ou mode inconnu → on logue, on n'envoie rien.
  if (!env.RESEND_API_KEY || mode === 'dry-run') {
    logSkip(mode);
    return { ok: true };
  }

  let recipient = to;

  if (mode === 'allowlist') {
    const allow = (env.EMAIL_ALLOWLIST || '')
      .split(',')
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean);
    if (!allow.includes(to.toLowerCase())) {
      console.info(`[auth][allowlist] ${to} hors liste — email NON envoyé.`);
      return { ok: true };
    }
  } else if (mode === 'redirect') {
    if (!env.EMAIL_TEST_INBOX) {
      console.error('[auth] EMAIL_MODE=redirect sans EMAIL_TEST_INBOX — envoi bloqué.');
      logSkip('redirect');
      return { ok: true };
    }
    recipient = env.EMAIL_TEST_INBOX;
  } else if (mode !== 'live') {
    // Valeur non reconnue → fail-closed (aucun envoi).
    logSkip(mode);
    return { ok: true };
  }

  const from = env.EMAIL_FROM || DEFAULT_FROM;
  const redirected = recipient !== to;

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.RESEND_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from,
        to: [recipient],
        subject: redirected ? `[TEST → ${to}] ${mail.subject}` : mail.subject,
        html: redirected ? testBanner(to) + mail.html : mail.html,
        text: mail.text
      })
    });

    if (!res.ok) {
      const detail = await res.text().catch(() => '');
      /*
       * Le quota quotidien mérite son propre message.
       *
       * Resend le distingue nettement du débit par seconde et du plafond mensuel — trois
       * codes `429` différents — et les trois n'appellent pas la même conduite : le
       * débit se réessaie dans la seconde, le quota quotidien attend demain, le mensuel
       * attend la facture. Confondus dans un « échec de l'envoi », l'adhérent réessaie en
       * boucle et le bureau ne sait pas que le club a atteint sa limite.
       *
       * Lecture sur le corps et non sur le statut seul : c'est le champ `name` qui
       * tranche entre les trois.
       */
      const quotaReached = /daily_quota_exceeded|monthly_quota_exceeded/.test(detail);
      const throttled = /rate_limit_exceeded/.test(detail);

      if (quotaReached) {
        console.error(
          `[auth][quota] Plafond d'envoi Resend atteint — aucun email ne partira avant sa remise à zéro. ${detail}`
        );
        return {
          ok: false,
          quotaReached: true,
          error:
            "Le club a atteint sa limite d'envois pour aujourd'hui. Réessayez demain, ou contactez le bureau."
        };
      }

      console.error(`[auth] Resend a renvoyé une erreur: ${res.status} ${detail}`);
      return {
        ok: false,
        error: throttled
          ? 'Trop de demandes en même temps. Patientez quelques secondes et réessayez.'
          : "Échec de l'envoi de l'email."
      };
    }
    return { ok: true };
  } catch (err) {
    console.error('[auth] Erreur réseau lors de l’envoi Resend:', err);
    return { ok: false, error: "Échec de l'envoi de l'email." };
  }
}

export async function sendOtpEmail(env: EmailEnv, to: string, code: string): Promise<DeliveryResult> {
  return deliver(
    env,
    to,
    {
      subject: `Votre code de connexion : ${code}`,
      html: otpHtml(code),
      text: `Votre code de connexion Nozay Badminton est : ${code}\n\nCe code expire dans 10 minutes. Si vous n'êtes pas à l'origine de cette demande, ignorez cet email.`
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
  to: string,
  seasonName: string
): Promise<DeliveryResult> {
  const season = seasonName || 'la nouvelle saison';
  return deliver(
    env,
    to,
    {
      subject: `Votre licence pour ${season}`,
      html: renewalHtml(season),
      text:
        `Bonjour,\n\n` +
        `Vous avez demandé à vous connecter à votre espace adhérent Nozay Badminton, mais nous ne trouvons pas de licence à votre nom pour ${season}.\n\n` +
        `Pour réadhérer : ${FFBAD_MEMBERSHIP_URL}\n\n` +
        `Si vous avez déjà repris votre licence, il n'y a rien à faire : votre accès s'ouvrira dans les prochains jours, le temps que le club enregistre votre inscription.\n\n` +
        `Une question ? Écrivez-nous à ${CONTACT_EMAIL}.\n\n` +
        `Nozay Badminton Association`
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
  to: string,
  seasonName: string,
  opensOn: string
): Promise<DeliveryResult> {
  const season = seasonName || 'la nouvelle saison';
  const date = formatFrenchDate(opensOn);
  return deliver(
    env,
    to,
    {
      subject: `Votre accès adhérent ouvre le ${date}`,
      html: upcomingHtml(season, date),
      text:
        `Bonjour,\n\n` +
        `Votre licence pour ${season} est bien enregistrée — merci !\n\n` +
        `Votre espace adhérent ouvrira le ${date}, premier jour de la saison. Il n'y a rien à faire d'ici là : reconnectez-vous à cette date avec le même identifiant.\n\n` +
        `Une question ? Écrivez-nous à ${CONTACT_EMAIL}.\n\n` +
        `Nozay Badminton Association`
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
  to: string,
  seasonName: string
): Promise<DeliveryResult> {
  const season = seasonName || 'la saison en cours';
  return deliver(
    env,
    to,
    {
      subject: `Votre accès adhérent ouvrira au premier règlement`,
      html: paymentPendingHtml(season),
      text:
        `Bonjour,\n\n` +
        `Votre licence pour ${season} est bien enregistrée — merci !\n\n` +
        `Votre espace adhérent s'ouvrira dès que le club aura reçu un premier règlement de votre cotisation, même partiel. Si vous avez déjà réglé, il n'y a rien à faire : l'accès s'ouvrira dans les prochains jours, le temps que le club enregistre votre paiement.\n\n` +
        `Une question ? Écrivez-nous à ${CONTACT_EMAIL}.\n\n` +
        `Nozay Badminton Association`
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

function testBanner(originalRecipient: string): string {
  return `<p style="background:#fff3cd;color:#664d03;padding:8px 12px;border-radius:6px;font-size:12px;">Email de TEST — destinataire réel : ${originalRecipient}</p>`;
}

function shell(inner: string): string {
  return `
  <div style="font-family: system-ui, -apple-system, Segoe UI, Roboto, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
    ${inner}
    <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;" />
    <p style="color: #999; font-size: 12px;">Nozay Badminton Association</p>
  </div>`;
}

function otpHtml(code: string): string {
  return shell(`
    <h1 style="font-size: 18px; color: #111;">Connexion à votre espace adhérent</h1>
    <p style="color: #444;">Voici votre code de connexion :</p>
    <p style="font-size: 32px; font-weight: 700; letter-spacing: 6px; color: #111; margin: 16px 0;">${code}</p>
    <p style="color: #666; font-size: 14px;">Ce code expire dans 10 minutes. Si vous n'êtes pas à l'origine de cette demande, ignorez cet email.</p>`);
}

function upcomingHtml(seasonName: string, date: string): string {
  return shell(`
    <h1 style="font-size: 18px; color: #111;">Votre accès ouvre le ${date}</h1>
    <p style="color: #444;">Votre licence pour ${seasonName} est bien enregistrée — merci !</p>
    <p style="color: #444;">Votre espace adhérent ouvrira le <strong>${date}</strong>, premier jour de la saison. Il n'y a rien à faire d'ici là : reconnectez-vous à cette date avec le même identifiant.</p>
    <p style="color: #666; font-size: 14px;">Une question ? Écrivez-nous à <a href="mailto:${CONTACT_EMAIL}" style="color:#111;">${CONTACT_EMAIL}</a>.</p>`);
}

function paymentPendingHtml(seasonName: string): string {
  return shell(`
    <h1 style="font-size: 18px; color: #111;">Votre accès adhérent ouvrira au premier règlement</h1>
    <p style="color: #444;">Votre licence pour ${seasonName} est bien enregistrée — merci !</p>
    <p style="color: #444;">Votre espace adhérent s'ouvrira dès que le club aura reçu un premier règlement de votre cotisation, même partiel.</p>
    <p style="color: #666; font-size: 14px;">Si vous avez déjà réglé, il n'y a rien à faire : l'accès s'ouvrira dans les prochains jours, le temps que le club enregistre votre paiement.</p>
    <p style="color: #666; font-size: 14px;">Une question ? Écrivez-nous à <a href="mailto:${CONTACT_EMAIL}" style="color:#111;">${CONTACT_EMAIL}</a>.</p>`);
}

function renewalHtml(seasonName: string): string {
  return shell(`
    <h1 style="font-size: 18px; color: #111;">Votre licence pour ${seasonName}</h1>
    <p style="color: #444;">Vous avez demandé à vous connecter à votre espace adhérent, mais nous ne trouvons pas de licence à votre nom pour ${seasonName}.</p>
    <p style="margin: 20px 0;">
      <a href="${FFBAD_MEMBERSHIP_URL}" style="display: inline-block; background: #111; color: #fff; text-decoration: none; padding: 12px 20px; border-radius: 6px; font-weight: 600; font-size: 14px;">Reprendre ma licence</a>
    </p>
    <p style="color: #666; font-size: 14px;">Si vous avez déjà repris votre licence, il n'y a rien à faire : votre accès s'ouvrira dans les prochains jours, le temps que le club enregistre votre inscription.</p>
    <p style="color: #666; font-size: 14px;">Une question ? Écrivez-nous à <a href="mailto:${CONTACT_EMAIL}" style="color:#111;">${CONTACT_EMAIL}</a>.</p>`);
}
