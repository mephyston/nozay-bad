<script lang="ts">
  import { Check, Search, Target } from '@lucide/svelte';
  import { Button, Input, Table, Amount, Badge, FormField, SearchableCombobox } from '@nba/ui';
  import type { GLTransaction, Member } from './reconciliation-types';

  let {
    glTransactions = [],
    selectedTx,
    suggestions = [],
    isClosed = false,
    isSubmitting = false,
    selectedMemberId = $bindable(''),
    sortedMembers = [],
    onMatch
  }: {
    glTransactions: GLTransaction[];
    selectedTx: any;
    /** Écritures non pointées de même montant, à ±7 jours. Calculées par l'état. */
    suggestions: GLTransaction[];
    isClosed?: boolean;
    isSubmitting: boolean;
    selectedMemberId: string;
    sortedMembers: Member[];
    onMatch: (glTxId: number) => void;
  } = $props();

  let search = $state('');
  let showAll = $state(false);

  const suggestedIds = $derived(new Set(suggestions.map((gt) => gt.id)));

  /*
    La liste rendue est bornée, et le message d'état vide dit enfin vrai.

    Elle affichait **toutes** les écritures non pointées — jusqu'à deux mille lignes de tableau,
    chacune avec son bouton — tout en annonçant « Aucune écriture correspondante trouvée à +/- 7
    jours » quand elle était vide. Les candidats à ±7 jours et au même montant sont ceux que
    l'état calcule déjà ; le reste ne s'atteint que par la recherche, ou sur demande explicite.
  */
  const others = $derived(glTransactions.filter((gt) => !gt.bankStatementLineId && !suggestedIds.has(gt.id)));

  const searched = $derived.by(() => {
    const q = search.trim().toLowerCase();
    if (!q) return showAll ? others : [];
    return others.filter((gt) => (gt.description || '').toLowerCase().includes(q));
  });

  /*
    L'adhérent se choisit par `SearchableCombobox` : au doigt, un écran dédié avec sa
    recherche. Le menu maison qui vivait ici se dépliait sous un bouton, avec un champ de
    recherche que le clavier recouvrait, et tronquait la liste à cinquante noms.
  */
  const memberOptions = $derived([
    { value: '', label: 'Aucun lien adhérent' },
    ...sortedMembers.map((m) => ({ value: String(m.id), label: `${m.lastName} ${m.firstName}`, hint: m.licence || undefined }))
  ]);
</script>

{#snippet entryRows(entries: GLTransaction[])}
  {#each entries as gt (gt.id)}
    <Table.Row>
      <Table.Cell>{gt.date}</Table.Cell>
      <Table.Cell class="font-medium">{gt.description}</Table.Cell>
      <Table.Cell>{gt.type}</Table.Cell>
      <Table.Cell class="font-semibold"><Amount cents={Math.abs(gt.amount)} /></Table.Cell>
      <Table.Cell>
        <Button size="sm" onclick={() => onMatch(gt.id)} disabled={isClosed || isSubmitting}>
          <Check class="w-3 h-3 mr-1" /> Associer
        </Button>
      </Table.Cell>
    </Table.Row>
  {/each}
{/snippet}

<div class="space-y-4">
  <!--
    Le bloc « Suggestion de rapprochement IA » a disparu, et ce n'était pas un encart de trop.

    Il affichait `suggestions` — c'est-à-dire des **écritures du grand livre** appariées par
    montant et par date — en les présentant comme des propositions du modèle, et lisait sur
    chacune un champ `reasoning` qu'une écriture ne porte pas : le libellé sortait donc toujours
    vide. Son bouton « Appliquer » appelait `onSelectAiSuggestion`, une prop que le panneau ne
    passait pas, soit `undefined(...)`. Ces écritures sont ci-dessous, à leur place.
  -->
  <div class="space-y-2">
    <h4 class="text-sm font-semibold text-foreground flex items-center gap-1.5">
      <Target class="w-3.5 h-3.5 text-success" />
      <span>Correspondances au même montant, à ±7 jours</span>
      <Badge variant={suggestions.length > 0 ? 'success' : 'secondary'} size="xs">{suggestions.length}</Badge>
    </h4>

    {#if suggestions.length === 0}
      <p class="text-center py-4 text-sm text-muted-foreground italic">
        Aucune écriture correspondante trouvée à ±7 jours.
      </p>
    {:else}
      <div class="max-h-60 overflow-y-auto border border-success/30 bg-success/5 rounded-lg text-xs">
        <Table.Root>
          <Table.Header>
            <Table.Row>
              <Table.Head>Date</Table.Head>
              <Table.Head>Description</Table.Head>
              <Table.Head>Type</Table.Head>
              <Table.Head>Montant</Table.Head>
              <Table.Head>Action</Table.Head>
            </Table.Row>
          </Table.Header>
          <Table.Body>{@render entryRows(suggestions)}</Table.Body>
        </Table.Root>
      </div>
    {/if}
  </div>

  <div class="space-y-2 border-t border-border pt-4">
    <div class="flex items-center justify-between gap-2">
      <span class="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
        Autres écritures non pointées ({others.length})
      </span>
      <Button type="button" variant="ghost" size="sm" class="text-xs h-7" onclick={() => (showAll = !showAll)}>
        {showAll ? 'Masquer' : 'Tout afficher'}
      </Button>
    </div>

    <!-- La loupe passe par la prop `icon` : posée en absolu, elle chevauchait le texte. -->
    <Input
      type="text"
      icon={Search}
      placeholder="Rechercher une écriture par libellé…"
      bind:value={search}
    />

    {#if searched.length > 0}
      <div class="max-h-60 overflow-y-auto border border-border rounded-lg text-xs">
        <Table.Root>
          <Table.Header>
            <Table.Row>
              <Table.Head>Date</Table.Head>
              <Table.Head>Description</Table.Head>
              <Table.Head>Type</Table.Head>
              <Table.Head>Montant</Table.Head>
              <Table.Head>Action</Table.Head>
            </Table.Row>
          </Table.Header>
          <Table.Body>{@render entryRows(searched)}</Table.Body>
        </Table.Root>
      </div>
    {:else if search.trim()}
      <p class="text-center py-4 text-xs text-muted-foreground italic">
        Aucune écriture ne correspond à « {search} ».
      </p>
    {/if}
  </div>

  <div class="border-t border-border pt-4">
    <FormField id="match-member" label="Lier à un adhérent (optionnel)">
      <SearchableCombobox
        id="match-member"
        items={memberOptions}
        bind:value={selectedMemberId}
        placeholder="Aucun lien adhérent"
        searchPlaceholder="Nom ou licence…"
        emptyText="Aucun adhérent trouvé."
      />
    </FormField>
  </div>
</div>
