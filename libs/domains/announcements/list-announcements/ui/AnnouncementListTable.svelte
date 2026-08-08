<script lang="ts">
  import { Edit, Trash2, Send, MoreHorizontal, Plus, Eye, EyeOff } from '@lucide/svelte';
  import { Button, Badge, DropdownMenu, DataTable, DataTableToolbar, Table, Card } from '@nba/ui';
  import type { Announcement } from './announcements-manager-types';

  let {
    filteredAnnouncements = [],
    searchTerm = $bindable(''),
    canWrite = false,
    canDelete = false,
    canNotify = false,
    onStartEdit,
    onToggleStatus,
    onNotify,
    onDelete,
    onOpenAdd
  }: {
    filteredAnnouncements?: Announcement[];
    searchTerm?: string;
    canWrite?: boolean;
    canDelete?: boolean;
    canNotify?: boolean;
    onStartEdit: (a: Announcement) => void;
    onToggleStatus: (a: Announcement) => void;
    onNotify: (a: Announcement) => void;
    onDelete: (a: Announcement) => void;
    onOpenAdd?: () => void;
  } = $props();

  function dateLabel(announcement: Announcement): string {
    if (!announcement.publishedAt) return '—';
    return new Date(announcement.publishedAt).toLocaleDateString('fr-FR');
  }

  /** Extrait lisible du texte riche, pour la colonne de liste. */
  function excerpt(announcement: Announcement): string {
    const text = announcement.bodyHtml
      .replace(/<\/(p|li|ul|ol)\s*>/gi, ' ')
      .replace(/<[^>]*>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/\s+/g, ' ')
      .trim();
    return text.length > 90 ? `${text.slice(0, 89)}…` : text;
  }

  /** La diffusion n'a de sens qu'une fois, et seulement sur une annonce publiée. */
  function canBeNotified(announcement: Announcement): boolean {
    return canNotify && announcement.status === 'published' && !announcement.notifiedAt;
  }
</script>

<DataTable
  data={filteredAnnouncements}
  emptyTitle="Aucune annonce"
  emptyDescription="Aucune annonce ne correspond à votre recherche."
>
  {#snippet toolbar()}
    <DataTableToolbar
      bind:searchValue={searchTerm}
      searchPlaceholder="Rechercher une annonce..."
      hasFilters={false}
    >
      {#snippet actions()}
        {#if onOpenAdd && canWrite}
          <Button onclick={onOpenAdd} class="font-bold flex items-center justify-center gap-1.5 shrink-0 h-9">
            <Plus class="w-4 h-4" />
            <span>Nouvelle annonce</span>
          </Button>
        {/if}
      {/snippet}
    </DataTableToolbar>
  {/snippet}

  {#snippet mobileView()}
    {#if filteredAnnouncements.length === 0}
      <div class="p-6 text-center text-muted-foreground text-sm">Aucune annonce trouvée.</div>
    {:else}
      {#each filteredAnnouncements as announcement (announcement.id)}
        <Card.Root>
          <Card.Content class="p-4 space-y-3">
            <div class="flex items-start justify-between gap-2">
              <div class="min-w-0">
                <h4 class="font-bold text-sm text-foreground">{announcement.title}</h4>
                <p class="mt-1 text-xs text-muted-foreground">{excerpt(announcement)}</p>
              </div>
              <div class="shrink-0 text-right">
                <Badge variant={announcement.status === 'published' ? 'primary-soft' : 'outline'} size="xs">
                  {announcement.status === 'published' ? 'Publiée' : 'Brouillon'}
                </Badge>
                <span class="mt-1 block text-xs text-muted-foreground">{dateLabel(announcement)}</span>
              </div>
            </div>

            {#if announcement.notifiedAt}
              <p class="text-xs text-muted-foreground">Diffusée aux adhérents</p>
            {/if}

            {#if canWrite || canDelete || canBeNotified(announcement)}
              <div class="flex items-center justify-end gap-2 pt-2 border-t border-border/50">
                {#if canWrite}
                  <Button variant="outline" size="sm" onclick={() => onStartEdit(announcement)} class="h-8 text-xs font-semibold gap-1.5 flex-1">
                    <Edit class="w-3.5 h-3.5" />
                    <span>Modifier</span>
                  </Button>
                  <Button variant="outline" size="sm" onclick={() => onToggleStatus(announcement)} class="h-8 text-xs font-semibold gap-1.5 flex-1">
                    {#if announcement.status === 'published'}
                      <EyeOff class="w-3.5 h-3.5" />
                      <span>Dépublier</span>
                    {:else}
                      <Eye class="w-3.5 h-3.5" />
                      <span>Publier</span>
                    {/if}
                  </Button>
                {/if}
                {#if canBeNotified(announcement)}
                  <Button variant="outline" size="sm" onclick={() => onNotify(announcement)} class="h-8 text-xs font-semibold gap-1.5 flex-1">
                    <Send class="w-3.5 h-3.5" />
                    <span>Prévenir</span>
                  </Button>
                {/if}
                {#if canDelete}
                  <Button
                    variant="outline"
                    size="sm"
                    onclick={() => onDelete(announcement)}
                    class="h-8 text-xs font-semibold gap-1.5 text-destructive hover:bg-destructive/10 border-destructive/30"
                  >
                    <Trash2 class="w-3.5 h-3.5" />
                    <span>Supprimer</span>
                  </Button>
                {/if}
              </div>
            {/if}
          </Card.Content>
        </Card.Root>
      {/each}
    {/if}
  {/snippet}

  {#snippet header()}
    <Table.Head>Titre</Table.Head>
    <Table.Head>Statut</Table.Head>
    <Table.Head>Publiée le</Table.Head>
    <Table.Head>Diffusion</Table.Head>
    <Table.Head class="text-right">Actions</Table.Head>
  {/snippet}

  {#snippet row(announcement)}
    <Table.Row>
      <Table.Cell class="font-medium">
        <span class="block text-foreground">{announcement.title}</span>
        <span class="block text-xs text-muted-foreground">{excerpt(announcement)}</span>
      </Table.Cell>
      <Table.Cell>
        <Badge variant={announcement.status === 'published' ? 'primary-soft' : 'outline'}>
          {announcement.status === 'published' ? 'Publiée' : 'Brouillon'}
        </Badge>
      </Table.Cell>
      <Table.Cell class="text-muted-foreground">{dateLabel(announcement)}</Table.Cell>
      <Table.Cell>
        {#if announcement.notifiedAt}
          <span class="text-xs text-muted-foreground">
            Envoyée le {new Date(announcement.notifiedAt).toLocaleDateString('fr-FR')}
          </span>
        {:else}
          <span class="text-muted-foreground text-xs italic">—</span>
        {/if}
      </Table.Cell>
      <Table.Cell class="text-right relative">
        <DropdownMenu.Root>
          <DropdownMenu.Trigger asChild>
            {#snippet child({ props })}
              <Button {...props} aria-haspopup="true" size="icon" variant="ghost">
                <MoreHorizontal class="h-4 w-4" />
                <span class="sr-only">Ouvrir le menu</span>
              </Button>
            {/snippet}
          </DropdownMenu.Trigger>

          <DropdownMenu.Content align="end">
            <DropdownMenu.Label>Actions</DropdownMenu.Label>
            {#if canWrite}
              <DropdownMenu.Item onclick={(e) => { e.stopPropagation(); onStartEdit(announcement); }} class="cursor-pointer">
                <Edit class="w-3.5 h-3.5 mr-2" />
                Modifier
              </DropdownMenu.Item>
              <DropdownMenu.Item onclick={(e) => { e.stopPropagation(); onToggleStatus(announcement); }} class="cursor-pointer">
                {#if announcement.status === 'published'}
                  <EyeOff class="w-3.5 h-3.5 mr-2" />
                  Repasser en brouillon
                {:else}
                  <Eye class="w-3.5 h-3.5 mr-2" />
                  Publier
                {/if}
              </DropdownMenu.Item>
            {/if}
            {#if canBeNotified(announcement)}
              <DropdownMenu.Item onclick={(e) => { e.stopPropagation(); onNotify(announcement); }} class="cursor-pointer">
                <Send class="w-3.5 h-3.5 mr-2" />
                Prévenir les adhérents
              </DropdownMenu.Item>
            {/if}
            {#if canDelete}
              <DropdownMenu.Item
                onclick={(e) => { e.stopPropagation(); onDelete(announcement); }}
                class="text-destructive focus:text-destructive cursor-pointer"
              >
                <Trash2 class="w-3.5 h-3.5 mr-2" />
                Supprimer
              </DropdownMenu.Item>
            {/if}
          </DropdownMenu.Content>
        </DropdownMenu.Root>
      </Table.Cell>
    </Table.Row>
  {/snippet}
</DataTable>
