<script lang="ts">
  import { Plus, Trash2 } from '@lucide/svelte';
  import { Button, Input, Card, Badge, uiConfirm, toast, flashAndReload } from '@nba/ui';

  /**
   * Les détenteurs de clé de la saison.
   *
   * La table ne stocke que des licences — c'est une liste **courante**, pas une trace, et
   * y recopier un prénom le laisserait diverger de l'annuaire. Les noms sont donc résolus
   * ici, par la seule page qui les affiche : le frontmatter charge les licences d'un côté
   * et l'annuaire de la saison de l'autre, et les rapproche.
   *
   * Une licence sans correspondance s'affiche telle quelle plutôt que de faire disparaître
   * la ligne : un ouvreur qui n'a pas repris sa licence doit se voir, c'est justement
   * l'information utile.
   */

  interface OpenerRow {
    id: number;
    licence: string;
    sessionsOpened: number;
    /** Résolu par la page. `null` quand l'annuaire ne connaît pas cette licence. */
    name: string | null;
  }
  interface MemberOption { licence: string; firstName: string; lastName: string }

  let { openers = [], members = [], seasonCode = '', canWrite = false } = $props<{
    openers: OpenerRow[]; members: MemberOption[]; seasonCode?: string; canWrite?: boolean;
  }>();

  let search = $state('');
  let busy = $state(false);

  const known = $derived(new Set(openers.map((o: OpenerRow) => o.licence)));

  const matches = $derived.by(() => {
    const term = search.trim().toLowerCase();
    // Trois caractères avant de proposer quoi que ce soit : en deçà, la liste entière
    // défilerait et n'aiderait personne.
    if (term.length < 3) return [];

    // Dédoublonné par licence, et pas seulement par prudence : une liste keyée sur une
    // clé en double fait *planter l'îlot entier* — le champ reste affiché, rendu côté
    // serveur, mais plus rien ne réagit et l'erreur ne se voit qu'en console. Un composant
    // d'affichage ne doit pas mourir d'un doublon dans ses données.
    const seen = new Set<string>();
    return members
      .filter((m: MemberOption) => !known.has(m.licence))
      .filter((m: MemberOption) =>
        `${m.firstName} ${m.lastName} ${m.licence}`.toLowerCase().includes(term)
      )
      .filter((m: MemberOption) => {
        if (seen.has(m.licence)) return false;
        seen.add(m.licence);
        return true;
      })
      .slice(0, 8);
  });

  async function post(body: unknown, fallback: string) {
    const response = await fetch('', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body)
    });
    if (!response.ok) {
      let message = fallback;
      try { const p = (await response.json()) as { error?: string }; if (p.error) message = p.error; } catch { /* générique */ }
      throw new Error(message);
    }
  }

  async function add(member: MemberOption) {
    busy = true;
    try {
      await post({ action: 'addOpener', seasonCode, licence: member.licence }, "L'ajout a échoué.");
      flashAndReload(`${member.firstName} ${member.lastName} peut désormais ouvrir un créneau.`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "L'ajout a échoué.");
      busy = false;
    }
  }

  async function remove(opener: OpenerRow) {
    const confirmed = await uiConfirm({
      title: 'Reprendre cette clé ?',
      description:
        'Les séances que cette personne a déjà acceptées d’ouvrir ne sont pas annulées : elle ne pourra simplement plus s’en engager de nouvelles.',
      confirmLabel: 'Reprendre',
      destructive: true
    });
    if (!confirmed) return;
    try {
      await post({ action: 'removeOpener', id: opener.id }, 'Le retrait a échoué.');
      flashAndReload('Clé reprise.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Le retrait a échoué.');
    }
  }
</script>

<Card.Root>
  <Card.Content class="space-y-4 p-4">
    <div>
      <h3 class="text-sm font-bold text-foreground">Ouvreurs de la saison</h3>
      <p class="mt-1 text-xs text-muted-foreground">
        Les adhérents à qui le club confie une clé. Eux seuls voient « J'ouvre ce créneau »
        depuis leur espace.
      </p>
    </div>

    {#if openers.length === 0}
      <p class="text-sm text-muted-foreground">
        Personne pour l'instant : aucune séance ne pourra être confirmée.
      </p>
    {:else}
      <ul class="space-y-2">
        {#each openers as opener (opener.id)}
          <li class="flex items-center justify-between gap-2 border-b border-border/50 pb-2 last:border-0">
            <div class="min-w-0">
              <p class="text-sm font-medium text-foreground">
                {opener.name ?? `Licence ${opener.licence}`}
                {#if !opener.name}
                  <Badge variant="outline" size="xs" class="ml-2">licence inconnue</Badge>
                {/if}
              </p>
              <p class="text-xs text-muted-foreground">
                {opener.licence} ·
                {opener.sessionsOpened === 0
                  ? 'aucune séance ouverte'
                  : `${opener.sessionsOpened} séance${opener.sessionsOpened > 1 ? 's' : ''} ouverte${opener.sessionsOpened > 1 ? 's' : ''}`}
              </p>
            </div>
            {#if canWrite}
              <Button
                variant="outline"
                size="sm"
                onclick={() => remove(opener)}
                class="h-8 shrink-0 gap-1.5 border-destructive/30 text-xs font-semibold text-destructive hover:bg-destructive/10"
              >
                <Trash2 class="h-3.5 w-3.5" />
                <span>Reprendre</span>
              </Button>
            {/if}
          </li>
        {/each}
      </ul>
    {/if}

    {#if canWrite}
      <div class="space-y-2 border-t border-border/50 pt-3">
        <Input
          bind:value={search}
          placeholder="Chercher un adhérent à qui confier une clé…"
          aria-label="Chercher un adhérent"
          class="min-h-[40px]"
        />
        {#if search.trim().length > 0 && search.trim().length < 3}
          <p class="text-xs text-muted-foreground">Saisissez au moins 3 lettres.</p>
        {:else if search.trim().length >= 3 && matches.length === 0}
          <p class="text-xs text-muted-foreground">Aucun adhérent ne correspond.</p>
        {:else}
          {#each matches as member (member.licence)}
            <button
              type="button"
              onclick={() => add(member)}
              disabled={busy}
              class="flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-sm hover:bg-muted disabled:opacity-50"
            >
              <Plus class="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              <span class="text-foreground">{member.firstName} {member.lastName}</span>
              <span class="ml-auto text-xs text-muted-foreground">{member.licence}</span>
            </button>
          {/each}
        {/if}
      </div>
    {/if}
  </Card.Content>
</Card.Root>
