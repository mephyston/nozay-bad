<script lang="ts">
  interface Member {
    id: number;
    firstName: string;
    lastName: string;
    licence: string;
  }

  // Ce menu ne porte QUE l'identité : qui je suis, changer de profil, se déconnecter.
  // Aucun écran de contenu n'y figure : posé à côté du sélecteur de profil, un lien
  // laisserait croire qu'il suit le profil qu'on vient de choisir alors qu'il suit le
  // profil actif. Ces écrans vivent sur « Mon compte », qui est à un geste d'ici.
  let {
    members = [],
    activeMemberId,
    currentPath = ''
  }: { members: Member[]; activeMemberId: number; currentPath?: string } = $props();

  let open = $state(false);
  let busy = $state(false);

  let active = $derived(members.find((m) => m.id === activeMemberId) || members[0]);

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

<div class="relative">
  <button
    type="button"
    onclick={() => (open = !open)}
    class="flex items-center gap-1.5 rounded-md border border-border bg-muted px-2.5 py-1 text-xs font-medium text-foreground hover:bg-accent min-h-[36px]"
  >
    <span class="max-w-[10ch] truncate">{active?.firstName ?? 'Compte'}</span>
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="h-3.5 w-3.5 opacity-70"><path d="m6 9 6 6 6-6" /></svg>
  </button>

  {#if open}
    <button type="button" class="fixed inset-0 z-40 cursor-default" aria-label="Fermer" onclick={() => (open = false)}></button>
    <div class="absolute right-0 z-50 mt-1 w-56 rounded-md border border-border bg-popover p-1 shadow-lg">
      <a
        href="/mon-compte"
        aria-current={currentPath === '/mon-compte' ? 'page' : undefined}
        class={`block rounded px-2 py-1.5 text-xs decoration-transparent hover:bg-accent ${
          currentPath === '/mon-compte' ? 'font-semibold text-primary' : 'text-foreground'
        }`}
      >
        Mon compte
      </a>
      <div class="my-1 border-t border-border"></div>

      {#if members.length > 1}
        <p class="px-2 py-1 text-[10px] uppercase tracking-wide text-muted-foreground">Changer de profil</p>
        {#each members as m (m.id)}
          <button
            type="button"
            disabled={busy}
            onclick={() => switchProfile(m.id)}
            class={`flex w-full items-center justify-between rounded px-2 py-1.5 text-left text-xs hover:bg-accent disabled:opacity-50 ${m.id === activeMemberId ? 'font-semibold text-foreground' : 'text-muted-foreground'}`}
          >
            <span>{m.firstName} {m.lastName}</span>
            {#if m.id === activeMemberId}
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" class="h-3.5 w-3.5"><path d="M20 6 9 17l-5-5" /></svg>
            {/if}
          </button>
        {/each}
        <div class="my-1 border-t border-border"></div>
      {/if}
      <button
        type="button"
        disabled={busy}
        onclick={logout}
        class="w-full rounded px-2 py-1.5 text-left text-xs text-destructive hover:bg-destructive/10 disabled:opacity-50"
      >
        Se déconnecter
      </button>
    </div>
  {/if}
</div>
