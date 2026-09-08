<script lang="ts">
  import { User, IdCard, Wallet, FileText, Bell, Receipt, LogOut, Check, ChevronDown } from '@lucide/svelte';

  interface Member {
    id: number;
    firstName: string;
    lastName: string;
    licence: string;
    expenseAuthorized?: boolean;
  }

  /*
    Le menu du compte : ce qui ne concerne que l'adhérent connecté.

    Il ne portait que l'identité (changer de profil, se déconnecter) et une seule ligne
    « Mon compte » : personne ne devinait que la fiche, la cotisation, l'attestation CSE
    ou les notifications se trouvaient derrière le prénom en haut à droite. Il liste
    donc désormais ces écrans, sous l'identité de la personne active — et le changement
    de profil descend dans sa propre section, en bas. Un lien placé au-dessus du
    sélecteur, sous le nom de qui est connecté, ne peut plus sembler suivre le profil
    qu'on vient de choisir.
  */
  let {
    members = [],
    activeMemberId,
    currentPath = ''
  }: { members: Member[]; activeMemberId: number; currentPath?: string } = $props();

  let open = $state(false);
  let busy = $state(false);
  /** Le portrait a répondu 404 : on reste sur les initiales. */
  let photoMissing = $state(false);
  /** Bulle de première visite, montrée une fois par appareil. */
  let hint = $state(false);

  const HINT_KEY = 'nba:account-hint:v1';

  let active = $derived(members.find((m) => m.id === activeMemberId) || members[0]);
  let initials = $derived(
    `${active?.firstName?.[0] ?? ''}${active?.lastName?.[0] ?? ''}`.toUpperCase() || '?'
  );
  let licence8 = $derived(String(active?.licence ?? '').replace(/\D/g, '').padStart(8, '0'));
  /*
    Sans version dans l'adresse : la session ne connaît pas la date du portrait, et
    l'en-tête ne fait aucun appel pour l'apprendre. La route met un portrait existant en
    cache un an ; un adhérent sans portrait coûte une requête légère par page, qui
    répond 404 et laisse les initiales.
  */
  let photoSrc = $derived(`/api/adherents/photo/${licence8}?size=128`);

  let entries = $derived(
    [
      { href: '/mon-compte', label: 'Mon compte', icon: User },
      { href: `/adherents/${licence8}`, label: 'Ma fiche', icon: IdCard },
      { href: '/mon-compte#cotisation', label: 'Ma cotisation', icon: Wallet },
      { href: '/attestation', label: 'Mon attestation CSE', icon: FileText },
      { href: '/notifications', label: 'Notifications', icon: Bell },
      ...(active?.expenseAuthorized
        ? [{ href: '/note-de-frais', label: 'Notes de frais', icon: Receipt }]
        : [])
    ]
  );

  // Lu après montage seulement : le rendu serveur ne connaît pas l'appareil, et une
  // lecture pendant l'hydratation ferait diverger les deux rendus.
  $effect(() => {
    try {
      hint = localStorage.getItem(HINT_KEY) !== '1';
    } catch {
      hint = false;
    }
  });

  function dismissHint() {
    hint = false;
    try {
      localStorage.setItem(HINT_KEY, '1');
    } catch {}
  }

  function toggle() {
    open = !open;
    // Ouvrir le menu, c'est l'avoir trouvé : la bulle n'a plus rien à apprendre.
    if (open && hint) dismissHint();
  }

  function isCurrent(href: string): boolean {
    const path = href.split('#')[0];
    return currentPath === path || (path !== '/' && currentPath.startsWith(`${path}/`));
  }

  async function switchProfile(memberId: number) {
    if (memberId === activeMemberId) {
      open = false;
      return;
    }
    busy = true;
    try {
      const res = await fetch('/api/auth/switch-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ memberId })
      });
      if (res.ok) {
        window.location.reload();
        return;
      }
    } catch {}
    busy = false;
  }

  async function logout() {
    busy = true;
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch {}
    window.location.href = '/login';
  }
</script>

{#snippet avatar(size: string)}
  <span
    class={`relative inline-flex ${size} shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary/15 text-[11px] font-bold text-primary`}
    aria-hidden="true"
  >
    {initials}
    {#if !photoMissing}
      <img
        src={photoSrc}
        alt=""
        decoding="async"
        class="absolute inset-0 size-full object-cover"
        onerror={() => (photoMissing = true)}
      />
    {/if}
  </span>
{/snippet}

<div class="relative">
  <!-- Un portrait rond, le code universel de « mon compte » ; le prénom ne l'accompagne
       qu'à partir de la largeur tablette. -->
  <button
    type="button"
    onclick={toggle}
    aria-label={`Mon compte — ${active?.firstName ?? ''} ${active?.lastName ?? ''}`.trim()}
    aria-expanded={open}
    aria-haspopup="menu"
    data-testid="account-button"
    class="flex items-center gap-1.5 rounded-full border border-border bg-muted py-0.5 pl-0.5 pr-2 text-xs font-medium text-foreground hover:bg-accent min-h-[36px] sm:rounded-md sm:pl-1"
  >
    {@render avatar('size-7')}
    <span class="hidden sm:inline max-w-[10ch] truncate">{active?.firstName ?? 'Compte'}</span>
    <ChevronDown class="h-3.5 w-3.5 opacity-70" />
  </button>

  {#if hint && !open}
    <!-- Bulle de première visite : elle nomme ce que le bouton cache, une fois. -->
    <div
      role="status"
      data-testid="account-hint"
      class="absolute right-0 z-50 mt-2 w-64 rounded-md border border-border bg-popover p-3 text-xs text-popover-foreground shadow-lg"
    >
      <span class="absolute -top-1.5 right-4 h-3 w-3 rotate-45 border-l border-t border-border bg-popover" aria-hidden="true"></span>
      <p class="font-semibold text-foreground">Votre espace personnel est ici</p>
      <p class="mt-1 text-muted-foreground">
        Votre fiche, votre cotisation, votre attestation CSE et vos notifications se
        trouvent derrière ce bouton.
      </p>
      <button
        type="button"
        onclick={dismissHint}
        class="mt-2 inline-flex min-h-[36px] items-center rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90"
      >
        Compris
      </button>
    </div>
  {/if}

  {#if open}
    <button type="button" class="fixed inset-0 z-40 cursor-default" aria-label="Fermer" onclick={() => (open = false)}></button>
    <div role="menu" data-testid="account-menu" class="absolute right-0 z-50 mt-1 w-64 rounded-md border border-border bg-popover p-1 shadow-lg">
      <!-- L'identité d'abord : tout ce qui suit est à elle. -->
      <div class="flex items-center gap-2.5 px-2 py-2">
        {@render avatar('size-8')}
        <div class="min-w-0">
          <p class="truncate text-xs font-semibold text-foreground">{active?.firstName} {active?.lastName}</p>
          {#if active?.licence}
            <p class="text-[10px] text-muted-foreground">Licence {active.licence}</p>
          {/if}
        </div>
      </div>
      <div class="my-1 border-t border-border"></div>

      {#each entries as entry (entry.href)}
        {@const Icon = entry.icon}
        <a
          href={entry.href}
          role="menuitem"
          aria-current={isCurrent(entry.href) ? 'page' : undefined}
          class={`flex items-center gap-2.5 rounded px-2 py-2 text-xs decoration-transparent hover:bg-accent ${
            isCurrent(entry.href) ? 'font-semibold text-primary' : 'text-foreground'
          }`}
        >
          <Icon class="h-4 w-4 shrink-0 opacity-70" />
          {entry.label}
        </a>
      {/each}

      {#if members.length > 1}
        <div class="my-1 border-t border-border"></div>
        <p class="px-2 py-1 text-[10px] uppercase tracking-wide text-muted-foreground">Changer de profil</p>
        {#each members as m (m.id)}
          <button
            type="button"
            role="menuitemradio"
            aria-checked={m.id === activeMemberId}
            disabled={busy}
            onclick={() => switchProfile(m.id)}
            class={`flex w-full items-center justify-between rounded px-2 py-2 text-left text-xs hover:bg-accent disabled:opacity-50 ${m.id === activeMemberId ? 'font-semibold text-foreground' : 'text-muted-foreground'}`}
          >
            <span>{m.firstName} {m.lastName}</span>
            {#if m.id === activeMemberId}
              <Check class="h-3.5 w-3.5" />
            {/if}
          </button>
        {/each}
      {/if}

      <div class="my-1 border-t border-border"></div>
      <button
        type="button"
        role="menuitem"
        disabled={busy}
        onclick={logout}
        class="flex w-full items-center gap-2.5 rounded px-2 py-2 text-left text-xs text-destructive hover:bg-destructive/10 disabled:opacity-50"
      >
        <LogOut class="h-4 w-4 shrink-0 opacity-70" />
        Se déconnecter
      </button>
    </div>
  {/if}
</div>
