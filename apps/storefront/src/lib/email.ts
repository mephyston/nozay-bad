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
 */

export interface EmailEnv {
  RESEND_API_KEY?: string;
  EMAIL_FROM?: string;
  EMAIL_MODE?: string; // 'live' | 'allowlist' | 'redirect' | 'dry-run'
  EMAIL_ALLOWLIST?: string; // CSV des adresses autorisées (mode allowlist)
  EMAIL_TEST_INBOX?: string; // boîte de test (mode redirect)
}

const DEFAULT_FROM = 'Nozay Badminton <contact@nozaybad.fr>';

export async function sendOtpEmail(env: EmailEnv, to: string, code: string): Promise<{ ok: boolean; error?: string }> {
  const mode = (env.EMAIL_MODE || 'dry-run').toLowerCase();

  // Dry-run : pas de clé, mode dry-run, ou mode inconnu → on logue, on n'envoie rien.
  if (!env.RESEND_API_KEY || mode === 'dry-run') {
    logDryRun(mode, to, code);
    return { ok: true };
  }

  let recipient = to;

  if (mode === 'allowlist') {
    const allow = (env.EMAIL_ALLOWLIST || '')
      .split(',')
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean);
    if (!allow.includes(to.toLowerCase())) {
      console.info(`[auth][allowlist] ${to} hors liste — OTP ${code} NON envoyé.`);
      return { ok: true };
    }
  } else if (mode === 'redirect') {
    if (!env.EMAIL_TEST_INBOX) {
      console.error('[auth] EMAIL_MODE=redirect sans EMAIL_TEST_INBOX — envoi bloqué.');
      logDryRun('redirect', to, code);
      return { ok: true };
    }
    recipient = env.EMAIL_TEST_INBOX;
  } else if (mode !== 'live') {
    // Valeur non reconnue → fail-closed (aucun envoi).
    logDryRun(mode, to, code);
    return { ok: true };
  }

  const from = env.EMAIL_FROM || DEFAULT_FROM;
  const redirected = recipient !== to;
  const subject = redirected
    ? `[TEST → ${to}] Votre code de connexion : ${code}`
    : `Votre code de connexion : ${code}`;

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
        subject,
        html: otpHtml(code, redirected ? to : undefined),
        text: `Votre code de connexion Nozay Badminton est : ${code}\n\nCe code expire dans 10 minutes. Si vous n'êtes pas à l'origine de cette demande, ignorez cet email.`
      })
    });

    if (!res.ok) {
      const detail = await res.text().catch(() => '');
      console.error('[auth] Resend a renvoyé une erreur:', res.status, detail);
      return { ok: false, error: "Échec de l'envoi de l'email." };
    }
    return { ok: true };
  } catch (err) {
    console.error('[auth] Erreur réseau lors de l’envoi Resend:', err);
    return { ok: false, error: "Échec de l'envoi de l'email." };
  }
}

function logDryRun(mode: string, to: string, code: string): void {
  console.info(`[auth][${mode}] OTP pour ${to} : ${code} (email NON envoyé)`);
}

function otpHtml(code: string, originalRecipient?: string): string {
  const testBanner = originalRecipient
    ? `<p style="background:#fff3cd;color:#664d03;padding:8px 12px;border-radius:6px;font-size:12px;">Email de TEST — destinataire réel : ${originalRecipient}</p>`
    : '';
  return `
  <div style="font-family: system-ui, -apple-system, Segoe UI, Roboto, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
    ${testBanner}
    <h1 style="font-size: 18px; color: #111;">Connexion à votre espace adhérent</h1>
    <p style="color: #444;">Voici votre code de connexion :</p>
    <p style="font-size: 32px; font-weight: 700; letter-spacing: 6px; color: #111; margin: 16px 0;">${code}</p>
    <p style="color: #666; font-size: 14px;">Ce code expire dans 10 minutes. Si vous n'êtes pas à l'origine de cette demande, ignorez cet email.</p>
    <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;" />
    <p style="color: #999; font-size: 12px;">Nozay Badminton Associatif</p>
  </div>`;
}
