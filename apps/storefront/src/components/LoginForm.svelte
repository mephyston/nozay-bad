<script lang="ts">
  interface Member {
    id: number;
    firstName: string;
    lastName: string;
    licence: string;
  }

  const siteKey =
    (import.meta.env.PUBLIC_TURNSTILE_SITE_KEY as string) || '1x00000000000000000000AA';

  /** Page de prise de licence du club (configuration), passée par la page. */
  let { membershipUrl = 'https://www.myffbad.fr/' }: { membershipUrl?: string } = $props();

  let step = $state<'identifier' | 'code' | 'profile'>('identifier');
  let identifier = $state('');
  let code = $state('');
  let members = $state<Member[]>([]);
  let loading = $state(false);
  let error = $state('');
  let info = $state('');

  // Turnstile en rendu **explicite**. En rendu implicite, api.js scanne le DOM à son
  // chargement : sur cette île Svelte, la course entre ce scan et hydrate() laissait
  // par moments un widget invisible — et donc aucun token, alors que le formulaire
  // réclamait la validation anti-bot. Ici c'est nous qui déclenchons le rendu, après
  // le montage, dans un conteneur que Svelte possède.
  let widgetEl = $state<HTMLDivElement | null>(null);
  let widgetId: string | undefined;
  let token = $state('');
  let widgetReady = $state(false);
  let widgetError = $state('');

  /** api.js est chargé par le layout en async defer : on attend qu'il soit là. */
  function whenTurnstileLoaded(): Promise<any> {
    return new Promise((resolve, reject) => {
      const startedAt = Date.now();
      const tick = () => {
        const api = (window as any).turnstile;
        if (api) return resolve(api);
        if (Date.now() - startedAt > 15000) return reject(new Error('turnstile-timeout'));
        setTimeout(tick, 50);
      };
      tick();
    });
  }

  $effect(() => {
    const el = widgetEl;
    if (!el) return;

    let cancelled = false;
    whenTurnstileLoaded()
      .then((api) => {
        if (cancelled) return;
        widgetReady = true;
        widgetId = api.render(el, {
          sitekey: siteKey,
          action: 'login',
          callback: (t: string) => {
            token = t;
            widgetError = '';
          },
          // Le token n'est valable que 5 minutes : sans ce rappel, un formulaire
          // resté ouvert repartait avec un token vide et un widget d'apparence OK.
          'expired-callback': () => {
            token = '';
            api.reset(widgetId);
          },
          'timeout-callback': () => {
            token = '';
            api.reset(widgetId);
          },
          'error-callback': () => {
            token = '';
            widgetError = "Le test anti-bot a échoué. Rechargez la page pour réessayer.";
          }
        });
      })
      .catch(() => {
        if (!cancelled) {
          widgetError = "Le test anti-bot n'a pas pu se charger (bloqueur de publicité ?). Rechargez la page.";
        }
      });

    return () => {
      cancelled = true;
      try {
        if (widgetId) (window as any).turnstile?.remove(widgetId);
      } catch {}
      widgetId = undefined;
      widgetReady = false;
      token = '';
    };
  });

  function redirectTarget(): string {
    if (typeof window === 'undefined') return '/';
    const param = new URLSearchParams(window.location.search).get('redirect');
    // On n'accepte que des chemins internes (anti open-redirect).
    if (param && param.startsWith('/') && !param.startsWith('//')) return param;
    return '/';
  }

  function resetTurnstile() {
    token = '';
    try {
      (window as any).turnstile?.reset(widgetId);
    } catch {}
  }

  async function requestCode(e: Event) {
    e.preventDefault();
    error = '';
    info = '';
    if (!identifier.trim()) {
      error = 'Saisissez votre email ou votre numéro de licence.';
      return;
    }
    if (!token) {
      error = 'Veuillez valider le test de sécurité anti-bot.';
      return;
    }

    loading = true;
    try {
      const res = await fetch('/api/auth/request-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: identifier.trim(), turnstileToken: token })
      });
      const data = (await res.json()) as any;
      if (!res.ok || !data.ok) {
        error = data.error || 'Une erreur est survenue.';
        resetTurnstile();
        return;
      }
      // On ne dit jamais si l'identifiant correspond à un adhérent : le message est
      // le même dans les deux cas (anti-énumération de comptes).
      step = 'code';
      info = "Si un compte existe pour cet identifiant, un code à 6 chiffres vient d'être envoyé par email.";
    } catch {
      error = 'Erreur réseau. Réessayez.';
      resetTurnstile();
    } finally {
      loading = false;
    }
  }

  async function verifyCode(e: Event) {
    e.preventDefault();
    error = '';
    if (!/^\d{6}$/.test(code.trim())) {
      error = 'Saisissez le code à 6 chiffres.';
      return;
    }

    loading = true;
    try {
      const res = await fetch('/api/auth/verify-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: code.trim() })
      });
      const data = (await res.json()) as any;
      if (!res.ok || !data.ok) {
        error = data.error || 'Code incorrect.';
        return;
      }
      members = data.members || [];
      if (members.length > 1) {
        step = 'profile';
        info = '';
      } else {
        window.location.href = redirectTarget();
      }
    } catch {
      error = 'Erreur réseau. Réessayez.';
    } finally {
      loading = false;
    }
  }

  async function selectProfile(memberId: number) {
    error = '';
    loading = true;
    try {
      const res = await fetch('/api/auth/switch-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ memberId })
      });
      const data = (await res.json()) as any;
      if (!res.ok || !data.ok) {
        error = data.error || 'Impossible de sélectionner ce profil.';
        return;
      }
      window.location.href = redirectTarget();
    } catch {
      error = 'Erreur réseau. Réessayez.';
    } finally {
      loading = false;
    }
  }

  function restart() {
    step = 'identifier';
    code = '';
    error = '';
    info = '';
    resetTurnstile();
  }
</script>

<div class="w-full max-w-sm mx-auto">
  <div class="rounded-xl border border-border bg-card p-6 shadow-sm">
    <h1 class="text-lg font-bold text-foreground">Espace adhérent</h1>
    <p class="mt-1 text-sm text-muted-foreground">
      {#if step === 'identifier'}
        Connectez-vous avec votre email ou votre numéro de licence.
      {:else if step === 'code'}
        Saisissez le code reçu par email.
      {:else}
        Pour quel adhérent souhaitez-vous continuer ?
      {/if}
    </p>

    {#if error}
      <div class="mt-4 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
        {error}
      </div>
    {/if}
    {#if info && !error}
      <div class="mt-4 rounded-md border border-border bg-muted px-3 py-2 text-sm text-muted-foreground">
        {info}
      </div>
    {/if}

    {#if step === 'identifier'}
      <form class="mt-4 space-y-4" onsubmit={requestCode}>
        <div>
          <label for="identifier" class="block text-xs font-medium text-foreground mb-1">
            Email ou numéro de licence
          </label>
          <input
            id="identifier"
            type="text"
            bind:value={identifier}
            autocomplete="username"
            placeholder="prenom@exemple.fr"
            class="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        <div>
          <div bind:this={widgetEl}></div>
          {#if widgetError}
            <p class="mt-2 text-xs text-destructive">{widgetError}</p>
          {:else if !token}
            <p class="mt-2 text-xs text-muted-foreground">
              {widgetReady
                ? 'Terminez le test anti-bot ci-dessus pour continuer.'
                : 'Chargement du test anti-bot…'}
            </p>
          {/if}
        </div>

        <button
          type="submit"
          disabled={loading || !token}
          class="w-full rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50 min-h-[44px]"
        >
          {loading ? 'Envoi…' : 'Recevoir un code'}
        </button>

        <!-- Affiché à tout le monde, sans condition : c'est le seul moyen de toucher qui
             n'a jamais été licencié au club, et donc n'est dans aucun fichier — lui ne
             recevra aucun email. Inconditionnel, donc ne révèle rien de personne. -->
        <p class="text-center text-[11px] text-muted-foreground">
          Pas encore adhérent ?
          <a
            href={membershipUrl}
            target="_blank"
            rel="noopener noreferrer"
            class="underline hover:text-foreground">Prenez votre licence</a
          >.
        </p>
      </form>
    {:else if step === 'code'}
      <form class="mt-4 space-y-4" onsubmit={verifyCode}>
        <div>
          <label for="code" class="block text-xs font-medium text-foreground mb-1">Code à 6 chiffres</label>
          <input
            id="code"
            type="text"
            inputmode="numeric"
            maxlength="6"
            bind:value={code}
            autocomplete="one-time-code"
            placeholder="000000"
            class="w-full rounded-md border border-border bg-background px-3 py-2 text-center text-lg tracking-[0.4em] text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          class="w-full rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50 min-h-[44px]"
        >
          {loading ? 'Vérification…' : 'Se connecter'}
        </button>

        <!-- Le message d'envoi ne confirmant plus l'existence du compte, on guide
             l'adhérent qui se serait trompé d'identifiant sans rien révéler. -->
        <p class="text-center text-[11px] text-muted-foreground">
          Rien reçu ? Vérifiez vos courriers indésirables.
        </p>

        <button
          type="button"
          onclick={restart}
          class="w-full text-xs text-muted-foreground hover:text-foreground"
        >
          Utiliser un autre identifiant
        </button>
      </form>
    {:else}
      <div class="mt-4 space-y-2">
        {#each members as m (m.id)}
          <button
            type="button"
            disabled={loading}
            onclick={() => selectProfile(m.id)}
            class="w-full rounded-md border border-border bg-background px-4 py-3 text-left text-sm text-foreground hover:bg-accent disabled:opacity-50 min-h-[44px]"
          >
            <span class="font-semibold">{m.firstName} {m.lastName}</span>
            <span class="block text-xs text-muted-foreground">Licence {m.licence}</span>
          </button>
        {/each}
      </div>
    {/if}
  </div>
</div>
