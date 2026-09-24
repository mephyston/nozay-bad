<script lang="ts">
  import { User, IdCard, Wallet, FileText, Bell, Receipt, LogOut, Check, ChevronDown, ChevronRight } from '@lucide/svelte';
  import { Sheet } from '@nba/ui';

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

    Deux habillages pour une seule liste : un menu déroulant à la souris, un panneau
    latéral plein écran au doigt — celui du menu de l'administration —, aux lignes assez
    hautes pour être visées sans précision. Un déroulant de 64 px de large à lignes de
    32 px ne se manipule pas au pouce.
  */
  let {
    members = [],
    activeMemberId,
    currentPath = '',
    features = {}
  }: {
    members: Member[];
    activeMemberId: number;
    currentPath?: string;
    /** Fonctionnalités du club ; une clé absente vaut « allumée ». */
    features?: Partial<Record<string, boolean>>;
  } = $props();

  let open = $state(false);
  let busy = $state(false);
  /** Sous 640 px (le point de rupture `sm`) : panneau plein écran plutôt que déroulant. */
  let mobile = $state(false);
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
      { href: '/mon-compte/cotisation', label: 'Ma cotisation', icon: Wallet },
      ...(features.attestations !== false ? [{ href: '/attestation', label: 'Mon attestation CSE', icon: FileText }] : []),
      ...(features.push !== false ? [{ href: '/notifications', label: 'Notifications', icon: Bell }] : []),
      ...(active?.expenseAuthorized && features.expenses !== false
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

  $effect(() => {
    if (typeof window.matchMedia !== 'function') return;
    const query = window.matchMedia('(max-width: 639px)');
    const apply = () => (mobile = query.matches);
    apply();
    query.addEventListener('change', apply);
    return () => query.removeEventListener('change', apply);
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

  /**
   * L'entrée qui correspond le mieux à l'adresse courante, et elle seule.
   *
   * Le préfixe seul ne suffit plus depuis que les rubriques du compte ont leur page :
   * sur `/mon-compte/cotisation`, « Mon compte » **et** « Ma cotisation » se
   * déclaraient courants, soit deux `aria-current="page"` dans un même menu. On garde
   * la correspondance par préfixe — c'est elle qui marque « Mon club » sur la fiche
   * d'une équipe — mais seule la plus longue l'emporte.
   */
  const cheminActif = $derived.by(() => {
    const candidats = entries
      .map((e) => e.href.split('#')[0])
      .filter((path) => currentPath === path || (path !== '/' && currentPath.startsWith(`${path}/`)));
    return candidats.sort((a, b) => b.length - a.length)[0] ?? null;
  });

  function isCurrent(href: string): boolean {
    return href.split('#')[0] === cheminActif;
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

<!-- La liste, dans ses deux tailles : `large` au doigt (lignes de 52 px, texte courant),
     compacte à la souris. -->
{#snippet items(large: boolean)}
  {@const row = large
    ? 'flex items-center gap-3 px-4 min-h-[52px] text-sm'
    : 'flex items-center gap-2.5 rounded px-2 py-2 text-xs'}
  {@const icon = large ? 'h-5 w-5 shrink-0 opacity-70' : 'h-4 w-4 shrink-0 opacity-70'}
  {@const rule = large ? 'my-2 border-t border-border' : 'my-1 border-t border-border'}
  {@const caption = large
    ? 'px-4 pb-1 pt-2 text-[11px] uppercase tracking-wide text-muted-foreground'
    : 'px-2 py-1 text-[10px] uppercase tracking-wide text-muted-foreground'}

  {#each entries as entry (entry.href)}
    {@const Icon = entry.icon}
    <a
      href={entry.href}
      role="menuitem"
      aria-current={isCurrent(entry.href) ? 'page' : undefined}
      class={`${row} decoration-transparent hover:bg-accent ${
        isCurrent(entry.href) ? 'font-semibold text-primary' : 'text-foreground'
      }`}
    >
      <Icon class={icon} />
      <span class="flex-1">{entry.label}</span>
      {#if large}
        <ChevronRight class="h-4 w-4 opacity-40" />
      {/if}
    </a>
  {/each}

  {#if members.length > 1}
    <div class={rule}></div>
    <p class={caption}>Changer de profil</p>
    {#each members as m (m.id)}
      <button
        type="button"
        role="menuitemradio"
        aria-checked={m.id === activeMemberId}
        disabled={busy}
        onclick={() => switchProfile(m.id)}
        class={`${row} w-full justify-between text-left hover:bg-accent disabled:opacity-50 ${m.id === activeMemberId ? 'font-semibold text-foreground' : 'text-muted-foreground'}`}
      >
        <span>{m.firstName} {m.lastName}</span>
        {#if m.id === activeMemberId}
          <Check class={large ? 'h-4 w-4' : 'h-3.5 w-3.5'} />
        {/if}
      </button>
    {/each}
  {/if}

  <div class={rule}></div>
  <button
    type="button"
    role="menuitem"
    disabled={busy}
    onclick={logout}
    class={`${row} w-full text-left text-destructive hover:bg-destructive/10 disabled:opacity-50`}
  >
    <LogOut class={icon} />
    Se déconnecter
  </button>
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

  {#if open && mobile}
    <Sheet.Root bind:open>
      <!-- Sur téléphone, le panneau descend du haut de l'écran — comme les menus mobiles
           d'apple.com — et le remplit ; à la souris, il reste un volet à droite. -->
      <Sheet.Content side={mobile ? 'top' : 'right'} class="w-full gap-0 p-0 sm:max-w-sm data-[side=top]:h-dvh data-[side=top]:border-b-0" data-testid="account-sheet">
        <Sheet.Header class="flex-row items-center gap-3 border-b border-border p-4 pr-14">
          {@render avatar('size-11')}
          <div class="min-w-0">
            <Sheet.Title class="truncate text-base font-semibold">{active?.firstName} {active?.lastName}</Sheet.Title>
            {#if active?.licence}
              <Sheet.Description class="text-xs text-muted-foreground">Licence {active.licence}</Sheet.Description>
            {/if}
          </div>
        </Sheet.Header>
        <nav class="flex-1 overflow-y-auto py-2" aria-label="Mon compte">
          {@render items(true)}
        </nav>
      </Sheet.Content>
    </Sheet.Root>
  {:else if open}
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
      {@render items(false)}
    </div>
  {/if}
</div>
