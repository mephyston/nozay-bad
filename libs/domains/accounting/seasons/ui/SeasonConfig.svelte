<script lang="ts">
  import { Calendar, Plus, Check } from "lucide-svelte";
  import { Button, Input, Table, Badge } from "@metacult/shared-ui";

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
  <div class="bg-gray-50 border p-4 rounded-xl">
    <h3 class="text-sm font-bold text-gray-700 mb-3">Créer une nouvelle saison</h3>
    <form onsubmit={onCreateSeason} class="flex items-end gap-3 text-xs">
      <div class="space-y-1">
        <label for="new-season-id" class="block text-[10px] font-bold text-gray-500 uppercase">Code Saison (ex: 24-25)</label>
        <Input id="new-season-id" bind:value={newSeasonId} placeholder="24-25" class="w-32 h-[30px]" />
      </div>
      <div class="space-y-1 flex-1">
        <label for="new-season-name" class="block text-[10px] font-bold text-gray-500 uppercase">Nom de la saison</label>
        <Input id="new-season-name" bind:value={newSeasonName} placeholder="Saison 2024-2025" class="w-full h-[30px]" />
      </div>
      <label class="flex items-center gap-1.5 cursor-pointer pb-2 text-gray-600 font-medium font-semibold">
        <input type="checkbox" bind:checked={newSeasonActive} class="rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
        <span>Saison Active</span>
      </label>
      <Button type="submit" disabled={isSubmitting} size="sm" class="h-[30px]">
        <Plus class="w-3.5 h-3.5 mr-1" /> Créer
      </Button>
    </form>
  </div>

  <div class="border rounded-xl overflow-hidden text-xs">
    <Table>
      <thead>
        <tr>
          <th>Code</th>
          <th>Nom</th>
          <th>Statut</th>
          <th>Clôture</th>
          <th>Action</th>
        </tr>
      </thead>
      <tbody>
        {#each seasons as s}
          <tr>
            <td class="font-bold">{s.id}</td>
            <td>{s.name}</td>
            <td>
              {#if s.active}
                <Badge variant="success">Active</Badge>
              {:else}
                <Badge variant="secondary">Inactive</Badge>
              {/if}
            </td>
            <td>
              {#if s.closed}
                <Badge variant="destructive">Clôturée</Badge>
              {:else}
                <Badge variant="outline">Ouverte</Badge>
              {/if}
            </td>
            <td class="flex items-center gap-2">
              {#if !s.active && !s.closed}
                <Button 
                  size="xs" 
                  variant="outline"
                  onclick={() => onToggleSeasonActive(s.id)}
                  disabled={isSubmitting}
                >
                  Rendre active
                </Button>
              {/if}
              {#if !s.closed}
                <Button 
                  size="xs" 
                  variant="destructive"
                  onclick={() => onCloseSeason(s.id)}
                  disabled={isSubmitting}
                >
                  Clôturer définitivement
                </Button>
              {/if}
            </td>
          </tr>
        {/each}
      </tbody>
    </Table>
  </div>
</div>
