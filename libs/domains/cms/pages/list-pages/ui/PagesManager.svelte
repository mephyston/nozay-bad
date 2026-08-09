<script lang="ts">
  import { Button, Input, Label, Badge, EmptyState, DataTable, toast, uiConfirm, flashAndReload } from '@nba/ui';

  interface PageRow {
    id: number;
    title: string;
    path: string;
    status: 'draft' | 'published';
    updatedAt: number | string;
  }

  let { pages = [], canWrite = false, canDelete = false } = $props<{
    pages: PageRow[];
    canWrite?: boolean;
    canDelete?: boolean;
  }>();

  let title = $state('');
  let busy = $state(false);

  async function post(body: unknown, fallback: string) {
    const response = await fetch('', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    if (!response.ok) {
      let message = fallback;
      try {
        const parsed = (await response.json()) as { error?: string };
        if (parsed.error) message = parsed.error;
      } catch { /* message générique */ }
      throw new Error(message);
    }
  }

  async function create(event: SubmitEvent) {
    event.preventDefault();
    if (!title.trim() || busy) return;
    busy = true;
    try {
      await post({ action: 'create', title: title.trim() }, 'La création a échoué.');
      flashAndReload('Page créée en brouillon.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'La création a échoué.');
      busy = false;
    }
  }

  async function remove(row: PageRow) {
    const confirmed = await uiConfirm({
      title: `Supprimer « ${row.title} » ?`,
      description: `L'adresse ${row.path} ne répondra plus. Pensez à créer une redirection si la page était en ligne.`,
      confirmLabel: 'Supprimer',
      destructive: true
    });
    if (!confirmed) return;
    try {
      await post({ action: 'delete', id: row.id }, 'La suppression a échoué.');
      flashAndReload('Page supprimée.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'La suppression a échoué.');
    }
  }
</script>

{#if canWrite}
  <form class="border-border mb-6 rounded-lg border p-4" onsubmit={create}>
    <div class="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
      <div>
        <Label for="page-title">Titre de la nouvelle page</Label>
        <Input id="page-title" bind:value={title} placeholder="Présentation" />
      </div>
      <Button type="submit" disabled={!title.trim() || busy}>Créer</Button>
    </div>
    <p class="text-muted-foreground mt-2 text-xs">
      La page est créée en brouillon : elle n'apparaît sur le site qu'une fois publiée.
    </p>
  </form>
{/if}

{#if pages.length === 0}
  <EmptyState title="Aucune page" description="Créez la première page du site." />
{:else}
  <ul class="divide-border divide-y">
    {#each pages as row (row.id)}
      <li class="flex flex-wrap items-center justify-between gap-3 py-3">
        <span class="min-w-0">
          <a href={`/admin/website/pages/${row.id}`} class="font-medium hover:underline">{row.title}</a>
          <code class="text-muted-foreground ml-2 text-xs">{row.path}</code>
        </span>
        <span class="flex items-center gap-2">
          <Badge variant={row.status === 'published' ? 'default' : 'secondary'}>
            {row.status === 'published' ? 'En ligne' : 'Brouillon'}
          </Badge>
          {#if canDelete}
            <Button variant="ghost" size="sm" onclick={() => remove(row)}>Supprimer</Button>
          {/if}
        </span>
      </li>
    {/each}
  </ul>
{/if}
