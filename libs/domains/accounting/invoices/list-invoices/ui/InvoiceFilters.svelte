<script lang="ts">
  import { Plus, Search } from '@lucide/svelte';
  import { Button, Input, Card } from '@nba/ui';

  let {
    searchTerm = $bindable(''),
    statusFilter = $bindable('all'),
    isClosed = false,
    onOpenCreateModal
  }: {
    searchTerm: string;
    statusFilter: 'all' | 'draft' | 'sent' | 'paid' | 'cancelled';
    isClosed?: boolean;
    onOpenCreateModal: () => void;
  } = $props();
</script>

<Card.Root>
  <Card.Content class="flex flex-col md:flex-row justify-between items-stretch md:items-center gap-4 p-4">
    <div class="flex flex-wrap items-center gap-3">
      {#if !isClosed}
        <Button 
          onclick={onOpenCreateModal}
          class="inline-flex items-center gap-2"
        >
          <Plus class="w-4 h-4" /> Créer une facture
        </Button>
      {/if}
    </div>

    <div class="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center w-full md:w-auto">
      <div class="relative w-full sm:w-64">
        <Input
          type="text"
          placeholder="Rechercher..."
          bind:value={searchTerm}
          class="pl-9"
        />
        <Search class="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
      </div>

      <select
        bind:value={statusFilter}
        class="bg-background border border-border px-3 py-1.5 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-primary text-foreground w-full sm:w-auto"
      >
        <option value="all">Tous les statuts</option>
        <option value="draft">Brouillon</option>
        <option value="sent">Envoyée</option>
        <option value="paid">Payée</option>
        <option value="cancelled">Annulée</option>
      </select>
    </div>
  </Card.Content>
</Card.Root>
