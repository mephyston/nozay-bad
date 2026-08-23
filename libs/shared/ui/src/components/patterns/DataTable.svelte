<script lang="ts" generics="T">
  import type { Snippet } from 'svelte';
  import { Table, TableBody, TableCell, TableHeader, TableRow, TablePagination } from '../ui/table';
  import * as Card from '../ui/card';
  import { Skeleton } from '../ui/skeleton';
  import EmptyState from './EmptyState.svelte';

  let {
    data,
    isLoading = false,
    toolbarStart,
    toolbar,
    header,
    row,
    mobileView,
    mobileSpacing = 'divided',
    pagination,
    onPageChange,
    limitOptions,
    itemName,
    emptyIcon,
    emptyTitle = "Aucune donnée",
    emptyDescription = "Il n'y a rien à afficher pour le moment."
  }: {
    data: T[];
    isLoading?: boolean;
    toolbarStart?: Snippet;
    toolbar?: Snippet;
    header: Snippet;
    row: Snippet<[T, number]>;
    mobileView?: Snippet;
    /**
     * Comment les cartes de la vue mobile se suivent.
     *
     * `divided` — le défaut, et ce que faisaient toutes les listes : des cartes jointives
     * séparées d'un filet. Compact, lisible tant que chaque carte tient sur deux lignes.
     *
     * `spaced` — des cartes détachées. À réserver aux listes dont chaque carte porte ses
     * propres actions : jointives, les zones cliquables de deux voisines se touchent, et
     * le pouce vise mal.
     */
    mobileSpacing?: 'divided' | 'spaced';
    pagination?: any;
    onPageChange?: (page: number) => void;
    limitOptions?: number[];
    itemName?: string;
    emptyIcon?: any;
    emptyTitle?: string;
    emptyDescription?: string;
  } = $props();
</script>

<div class="space-y-4">
  {#if toolbarStart || toolbar}
    <div class="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 w-full">
      <div class="w-full md:w-auto overflow-x-auto no-scrollbar">
        {#if toolbarStart}
          {@render toolbarStart()}
        {/if}
      </div>
      <div class="w-full md:w-auto flex justify-end ml-auto">
        {#if toolbar}
          {@render toolbar()}
        {/if}
      </div>
    </div>
  {/if}

  <Card.Root class="overflow-hidden">
    <!-- Desktop View (hidden on mobile if mobileView is provided) -->
    <div class={mobileView ? "hidden md:block" : "block"}>
      <div class="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              {@render header()}
            </TableRow>
          </TableHeader>
          <TableBody>
            {#if isLoading}
              <TableRow>
                <TableCell colspan={100} class="h-24 text-center">
                  <div class="flex flex-col items-center justify-center space-y-3">
                    <Skeleton class="h-4 w-[250px]" />
                    <Skeleton class="h-4 w-[200px]" />
                  </div>
                </TableCell>
              </TableRow>
            {:else if data.length === 0}
              <TableRow>
                <TableCell colspan={100} class="h-48 text-center border-b-0 hover:bg-transparent">
                  <EmptyState
                    icon={emptyIcon}
                    title={emptyTitle}
                    description={emptyDescription}
                  />
                </TableCell>
              </TableRow>
            {:else}
              {#each data as item, i}
                {@render row(item, i)}
              {/each}
            {/if}
          </TableBody>
        </Table>
      </div>
    </div>

    <!-- Mobile View -->
    {#if mobileView}
      <div class="md:hidden">
        {#if isLoading}
          <div class="p-6 flex flex-col items-center justify-center space-y-3 h-24">
            <Skeleton class="h-4 w-[250px]" />
            <Skeleton class="h-4 w-[200px]" />
          </div>
        {:else if data.length === 0}
          <div class="h-48 flex items-center justify-center">
            <EmptyState
              icon={emptyIcon}
              title={emptyTitle}
              description={emptyDescription}
            />
          </div>
        {:else}
          <div class={mobileSpacing === 'spaced' ? 'space-y-3 p-3' : 'divide-y divide-border'}>
            {@render mobileView()}
          </div>
        {/if}
      </div>
    {/if}

    <!-- Pagination -->
    {#if pagination && pagination.totalPages > 1 && onPageChange}
      <Card.Footer class="border-t px-6 py-4 flex items-center justify-between bg-muted/20">
        <TablePagination
          {pagination}
          onChangePage={onPageChange}
          {itemName}
          {limitOptions}
        />
      </Card.Footer>
    {/if}
  </Card.Root>
</div>
