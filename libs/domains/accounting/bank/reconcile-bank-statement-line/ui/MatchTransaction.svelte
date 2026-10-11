<script lang="ts">
  import { Check, Search, Target } from '@lucide/svelte';
  import { Button, Input, Amount, Badge, FormField, SearchableCombobox, correspondA } from '@nba/ui';
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
    if (!search.trim()) return showAll ? others : [];
    return others.filter((gt) => correspondA(search, gt.description || ''));
  });

  /*
    L'adhérent se choisit par `SearchableCombobox` : au doigt, un écran dédié avec sa
    recherche. Le menu maison qui vivait ici se dépliait sous un bouton, avec un champ de
    recherche que le clavier recouvrait, et tronquait la liste à cinquante noms.
  */
  const TYPES: Record<GLTransaction['type'], string> = { recette: 'Recette', depense: 'Dépense', transfert: 'Virement' };
  const dateCourte = (iso: string) => (iso || '').split('-').reverse().join('/');

  const memberOptions = $derived([
    { value: '', label: 'Aucun lien adhérent' },
    ...sortedMembers.map((m) => ({ value: String(m.id), label: `${m.lastName} ${m.firstName}`, hint: m.licence || undefined }))
  ]);
</script>

<!--
  Des lignes, pas un tableau : les cellules du tableau du design system ne passent pas à la
  ligne, et un libellé d'achat boutique (« Achat boutique - NOM Prénom - Maillot homme — L x1 »)
  poussait la colonne « Action » hors du panneau. Le libellé passe désormais à la ligne ; le
  montant et le bouton gardent leur place à droite, quelle que soit sa longueur.
-->
{#snippet entryRows(entries: GLTransaction[])}
  <ul class="divide-y divide-border/60">
    {#each entries as gt (gt.id)}
      <li class="flex items-center gap-3 px-3 py-2">
        <div class="min-w-0 flex-1">
          <p class="font-medium break-words">{gt.description}</p>
          <p class="text-muted-foreground">{dateCourte(gt.date)} · {TYPES[gt.type] ?? gt.type}</p>
        </div>
        <Amount cents={Math.abs(gt.amount)} class="shrink-0 font-semibold" />
        <Button size="sm" class="shrink-0" onclick={() => onMatch(gt.id)} disabled={isClosed || isSubmitting}>
          <Check class="w-3 h-3 mr-1" /> Associer
        </Button>
      </li>
    {/each}
  </ul>
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
        {@render entryRows(suggestions)}
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
        {@render entryRows(searched)}
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
