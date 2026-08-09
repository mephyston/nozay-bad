<script lang="ts">
  import { Button, Input, Label, Badge, EmptyState, RichTextEditor, toast, uiConfirm, flashAndReload } from '@nba/ui';

  interface PostRow {
    id: number;
    title: string;
    path: string;
    status: 'draft' | 'published';
    excerpt: string | null;
    publishedAt: number | string | null;
  }

  let { posts = [], canWrite = false, canDelete = false } = $props<{
    posts: PostRow[];
    canWrite?: boolean;
    canDelete?: boolean;
  }>();

  let title = $state('');
  let excerpt = $state('');
  let bodyHtml = $state('<p></p>');
  let busy = $state(false);

  const formatter = new Intl.DateTimeFormat('fr-FR', { dateStyle: 'short' });
  const when = (v: number | string | null) =>
    v ? formatter.format(new Date(typeof v === 'number' ? v * 1000 : v)) : '—';

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
      await post({ action: 'create', title: title.trim(), excerpt: excerpt.trim(), bodyHtml }, 'La création a échoué.');
      flashAndReload('Actualité créée en brouillon.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'La création a échoué.');
      busy = false;
    }
  }

  async function togglePublish(row: PostRow) {
    try {
      await post({ action: 'publish', id: row.id, published: row.status !== 'published' }, "L'opération a échoué.");
      flashAndReload(row.status === 'published' ? 'Actualité retirée.' : 'Actualité publiée.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "L'opération a échoué.");
    }
  }

  async function remove(row: PostRow) {
    const confirmed = await uiConfirm({
      title: `Supprimer « ${row.title} » ?`,
      description: `L'adresse ${row.path} ne répondra plus. Si l'actualité a été partagée, pensez à créer une redirection.`,
      confirmLabel: 'Supprimer',
      destructive: true
    });
    if (!confirmed) return;
    try {
      await post({ action: 'delete', id: row.id }, 'La suppression a échoué.');
      flashAndReload('Actualité supprimée.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'La suppression a échoué.');
    }
  }
</script>

{#if canWrite}
  <form class="border-border mb-6 space-y-3 rounded-lg border p-4" onsubmit={create}>
    <div>
      <Label for="post-title">Titre</Label>
      <Input id="post-title" bind:value={title} placeholder="Soirée raclette 2026" />
    </div>
    <div>
      <Label for="post-excerpt">Chapô</Label>
      <Input id="post-excerpt" bind:value={excerpt} placeholder="Une phrase d'accroche, reprise dans les listes et les partages" />
    </div>
    <div>
      <Label for="post-body">Texte</Label>
      <RichTextEditor bind:value={bodyHtml} />
    </div>
    <Button type="submit" disabled={!title.trim() || busy}>Créer en brouillon</Button>
  </form>
{/if}

{#if posts.length === 0}
  <EmptyState title="Aucune actualité" description="Créez la première actualité du club." />
{:else}
  <ul class="divide-border divide-y">
    {#each posts as row (row.id)}
      <li class="flex flex-wrap items-center justify-between gap-3 py-3">
        <span class="min-w-0">
          <span class="font-medium">{row.title}</span>
          <span class="text-muted-foreground ml-2 text-xs">{when(row.publishedAt)}</span>
          <code class="text-muted-foreground ml-2 text-xs">{row.path}</code>
        </span>
        <span class="flex items-center gap-2">
          <Badge variant={row.status === 'published' ? 'default' : 'secondary'}>
            {row.status === 'published' ? 'En ligne' : 'Brouillon'}
          </Badge>
          {#if canWrite}
            <Button variant="ghost" size="sm" onclick={() => togglePublish(row)}>
              {row.status === 'published' ? 'Retirer' : 'Publier'}
            </Button>
          {/if}
          {#if canDelete}
            <Button variant="ghost" size="sm" onclick={() => remove(row)}>Supprimer</Button>
          {/if}
        </span>
      </li>
    {/each}
  </ul>
{/if}
