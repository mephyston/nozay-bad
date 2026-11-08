<script lang="ts">
  import { Button, FormField, FormSheet, Input, SearchableCombobox, Select, SwitchField, submitForm } from '@nba/ui';
  import ItemIcon from '../../shared/ItemIcon.svelte';
  import { guessItemIcon, ITEM_ICONS } from '../../shared/item-icons';
  import { parseEuros, saveItem, saveMaxBalance, validateItem, type CatalogItem, type CatalogItemValues } from './catalog-actions';

  /**
   * Ce que vend la buvette et le plafond des cartes. Un article se retire de la vente sans
   * se supprimer : les ventes passées y renvoient.
   */
  let {
    items = [],
    categories = [],
    settings = {},
    canWrite = false
  }: {
    items?: CatalogItem[];
    categories?: { id: number; adminLabel: string; active?: boolean }[];
    settings?: Record<string, any>;
    canWrite?: boolean;
  } = $props();

  const categoryItems = $derived(
    categories.filter((c) => c.active !== false).map((c) => ({ value: c.id, label: c.adminLabel }))
  );
  const euros = (cents: number) => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(cents / 100);

  let open = $state(false);
  let editingId = $state<number | null>(null);
  let sortOrder = $state(0);
  let submitting = $state(false);
  let error = $state<string | null>(null);
  let values = $state<CatalogItemValues>({ name: '', priceEuros: '', accountingCategoryId: 0, active: true, icon: '' });
  const guessed = $derived(ITEM_ICONS.find((i) => i.key === guessItemIcon(values.name))?.label ?? 'initiale du nom');

  // svelte-ignore state_referenced_locally
  let maxEuros = $state(String((settings.maxBalanceCents ?? 10000) / 100));
  let savingMax = $state(false);

  function edit(item: CatalogItem | null) {
    editingId = item?.id ?? null;
    sortOrder = item?.sortOrder ?? items.length;
    values = item
      ? { name: item.name, priceEuros: String(item.priceCents / 100).replace('.', ','), accountingCategoryId: item.accountingCategoryId, active: item.active, icon: item.icon ?? '' }
      : { name: '', priceEuros: '', accountingCategoryId: 0, active: true, icon: '' };
    error = null;
    open = true;
  }

  async function submit() {
    submitting = true;
    await submitForm({
      validate: () => validateItem(values),
      submit: () => saveItem(editingId, values, sortOrder),
      close: () => (open = false),
      onError: (message) => (error = message)
    });
    submitting = false;
  }

  async function submitMax() {
    savingMax = true;
    await submitForm({
      validate: () => (parseEuros(maxEuros) === null ? 'Saisissez un montant en euros.' : null),
      submit: () => saveMaxBalance(settings, parseEuros(maxEuros)!),
      success: 'Plafond enregistré.'
    });
    savingMax = false;
  }
</script>

<div class="space-y-6">
  {#if canWrite}
    <Button onclick={() => edit(null)}>Nouvel article</Button>
  {/if}

  <ul class="divide-y rounded-lg border">
    {#each items as item (item.id)}
      <li class="flex items-center justify-between gap-3 p-3">
        <span class="bg-primary/10 text-primary flex size-9 shrink-0 items-center justify-center rounded-lg"><ItemIcon name={item.name} icon={item.icon} class="size-5" /></span>
        <span class="grow">
          <span class="font-medium">{item.name}</span>
          {#if !item.active}<span class="text-muted-foreground text-sm"> · retiré de la vente</span>{/if}
        </span>
        <span>{euros(item.priceCents)}</span>
        {#if canWrite}
          <Button variant="outline" size="sm" onclick={() => edit(item)}>Modifier</Button>
        {/if}
      </li>
    {:else}
      <li class="text-muted-foreground p-3">Aucun article : la caisse n'a rien à vendre.</li>
    {/each}
  </ul>

  {#if canWrite}
    <section class="max-w-sm space-y-3">
      <FormField label="Plafond de solde d'une carte (€)" id="plafond" hint="Une recharge qui le dépasserait est refusée à la caisse.">
        <Input id="plafond" inputmode="decimal" bind:value={maxEuros} />
      </FormField>
      <Button variant="outline" disabled={savingMax} onclick={submitMax}>Enregistrer le plafond</Button>
    </section>
  {/if}
</div>

<FormSheet
  bind:open
  title={editingId === null ? 'Nouvel article' : "Modifier l'article"}
  {error}
  isSubmitting={submitting}
  onSubmit={submit}
>
  <FormField label="Nom" id="nom">
    <Input id="nom" bind:value={values.name} maxlength={60} />
  </FormField>
  <FormField label="Prix (€)" id="prix">
    <Input id="prix" inputmode="decimal" bind:value={values.priceEuros} placeholder="2,50" />
  </FormField>
  <FormField label="Catégorie comptable" id="categorie">
    <SearchableCombobox
      id="categorie"
      items={categoryItems}
      bind:value={values.accountingCategoryId}
      placeholder="Choisir une catégorie"
    />
  </FormField>
  <FormField label="Pictogramme" id="picto" hint="Affiché sur la tuile de la caisse et dans l'app buvette.">
    <div class="flex items-center gap-3">
      <span class="bg-primary/10 text-primary flex size-10 shrink-0 items-center justify-center rounded-lg"><ItemIcon name={values.name || '?'} icon={values.icon || null} class="size-5" /></span>
      <Select id="picto" bind:value={values.icon}>
        <option value="">Automatique ({guessed})</option>
        {#each ITEM_ICONS as icon (icon.key)}
          <option value={icon.key}>{icon.label}</option>
        {/each}
      </Select>
    </div>
  </FormField>
  <SwitchField id="actif" label="En vente" bind:checked={values.active} />
</FormSheet>
