<script lang="ts">
  import { Calendar, Plus } from "lucide-svelte";
  import { Button, Input, Badge } from "@metacult/shared-ui";

  let {
    seasons = [],
    isSubmitting = false,
    newSeasonId = $bindable(''),
    newSeasonName = $bindable(''),
    newSeasonActive = $bindable(false),
    onCreateSeason,
    onToggleSeasonActive,
    onCloseSeason
  }: {
    seasons: any[];
    isSubmitting: boolean;
    newSeasonId: string;
    newSeasonName: string;
    newSeasonActive: boolean;
    onCreateSeason: (e: Event) => void;
    onToggleSeasonActive: (id: string) => void;
    onCloseSeason: (id: string) => void;
  } = $props();
</script>

<div class="space-y-6">
  <div class="divide-y divide-border border border-border rounded-lg overflow-hidden bg-muted/10">
    {#each seasons as s}
      <div class="p-3.5 flex justify-between items-center bg-card">
        <div>
          <span class="font-bold text-sm text-foreground">{s.name}</span>
          <span class="ml-2 text-xs font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded">ID: {s.id}</span>
        </div>
        <div class="flex items-center gap-3">
          {#if s.closed}
            <Badge variant="outline" class="bg-muted text-muted-foreground border-border font-bold">
              Clôturée
            </Badge>
          {:else}
            {#if s.active}
              <Badge variant="outline" class="bg-primary/10 hover:bg-primary/10 text-primary border-primary/20 font-bold">
                Active
              </Badge>
            {:else}
              <Button
                variant="outline"
                size="xs"
                onclick={() => onToggleSeasonActive(s.id)}
                disabled={isSubmitting}
              >
                Activer
              </Button>
            {/if}
            <Button
              variant="destructive"
              size="xs"
              onclick={() => onCloseSeason(s.id)}
              disabled={isSubmitting}
            >
              Clôturer
            </Button>
          {/if}
        </div>
      </div>
    {/each}
  </div>

  <!-- Add Season Form -->
  <form onsubmit={onCreateSeason} class="border-t border-border pt-4 space-y-4">
    <h3 class="text-sm font-bold text-foreground">Ajouter un exercice</h3>
    
    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div class="space-y-1.5">
        <label for="new-season-id" class="block text-xs font-bold text-muted-foreground uppercase">ID (ex: 26-27)</label>
        <Input
          type="text"
          id="new-season-id"
          bind:value={newSeasonId}
          placeholder="26-27"
          required
        />
      </div>
      <div class="space-y-1.5">
        <label for="new-season-name" class="block text-xs font-bold text-muted-foreground uppercase">Libellé (ex: Saison 2026-2027)</label>
        <Input
          type="text"
          id="new-season-name"
          bind:value={newSeasonName}
          placeholder="Saison 2026-2027"
          required
        />
      </div>
    </div>

    <div class="flex items-center gap-2">
      <input
        type="checkbox"
        id="new-season-active"
        bind:checked={newSeasonActive}
        class="rounded border-border focus:ring-primary h-4 w-4"
      />
      <label for="new-season-active" class="text-xs font-medium text-foreground">Définir comme active immédiatement</label>
    </div>

    <Button
      type="submit"
      disabled={isSubmitting}
      size="sm"
      class="font-bold flex items-center gap-1"
    >
      <Plus class="w-3.5 h-3.5" />
      Créer la saison
    </Button>
  </form>
</div>
