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

/**
 * Ce que les mails disent du club : son nom, la boîte qui répond, la page de prise de
 * licence, la signature. Tout vient de la configuration du club (`locals.club`) —
 * rien n'est écrit ici, ces mails partent au nom de n'importe quel club.
 */
export interface ClubMailIdentity {
  name: string;
  senderName: string;
  contactEmail: string;
  membershipUrl: string;
  signature: string;
}

export interface Mail {
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

export async function deliver(
  env: EmailEnv,
  club: ClubMailIdentity,
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

  /*
   * L'adresse d'expédition est celle que Resend a vérifiée (`EMAIL_FROM`, variable du
   * Worker) ; le nom affiché est celui du club. Sans variable, on tente l'adresse de
   * contact du club — elle n'est acceptée que si son domaine est vérifié.
   */
  const address = /<([^>]+)>/.exec(env.EMAIL_FROM || '')?.[1] || env.EMAIL_FROM || club.contactEmail;
  const from = `${club.senderName} <${address}>`;
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
        ...(club.contactEmail ? { reply_to: club.contactEmail } : {}),
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

function testBanner(originalRecipient: string): string {
  return `<p style="background:#fff3cd;color:#664d03;padding:8px 12px;border-radius:6px;font-size:12px;">Email de TEST — destinataire réel : ${originalRecipient}</p>`;
}
