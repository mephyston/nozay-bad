<script lang="ts">
  import { Button, FormField, Input, SearchableCombobox, submitForm } from '@nba/ui';
  import { parseEuros } from '../../shared/money';
  import { abandonSale, closeCaisse, openCaisse, setSessionCategory } from './session-actions';

  /**
   * L'ouverture et la clôture de la caisse, réservées au bureau : elles engagent le comptage
   * des espèces et les écritures comptables. Les bénévoles encaissent, ils n'y touchent pas.
   */
  let {
    current = null,
    categories = [],
    cardsDebtCents = 0,
    canOpen = false,
    canClose = false,
    canAbandon = false
  }: {
    current?: any;
    categories?: { id: number; adminLabel: string }[];
    cardsDebtCents?: number;
    canOpen?: boolean;
    canClose?: boolean;
    canAbandon?: boolean;
  } = $props();

  const euros = (cents: number) => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(cents / 100);

  let amount = $state('');
  let busy = $state(false);
  const categoryItems = $derived(categories.map((c) => ({ value: c.id, label: c.adminLabel })));
  const categoryName = (id: number) => categories.find((c) => c.id === id)?.adminLabel ?? `Catégorie n° ${id}`;
  // svelte-ignore state_referenced_locally
  let categoryId = $state<number>(current?.session.accountingCategoryId ?? 0);
  let editingCategory = $state(false);

  async function open() {
    busy = true;
    await submitForm({
      validate: () =>
        !categoryId ? 'Choisissez la catégorie comptable de cette buvette (tournoi, forum…).'
          : parseEuros(amount) === null ? 'Saisissez le montant compté, par exemple 50,00.' : null,
      submit: () => openCaisse(parseEuros(amount)!, categoryId)
    });
    busy = false;
  }

  async function saveCategory() {
    busy = true;
    await submitForm({
      validate: () => (!categoryId ? 'Choisissez une catégorie.' : null),
      submit: () => setSessionCategory(categoryId),
      success: 'Catégorie enregistrée.'
    });
    editingCategory = false;
    busy = false;
  }

  async function close() {
    busy = true;
    await submitForm({
      validate: () => (parseEuros(amount) === null ? 'Saisissez les espèces comptées.' : null),
      submit: () => closeCaisse(current.session.id, parseEuros(amount)!),
      success: (result) => `Caisse clôturée. Écart : ${euros(result.gapCents)}.`
    });
    busy = false;
  }

  async function abandon(saleId: number) {
    busy = true;
    await submitForm({ submit: () => abandonSale(saleId) });
    busy = false;
  }
</script>

<dl class="mb-6 flex max-w-lg justify-between gap-4 rounded-lg border p-4">
  <dt>
    <span class="block font-semibold">Dû aux clients sur leurs cartes</span>
    <span class="text-muted-foreground block text-sm">La somme des soldes : de l'argent encaissé, pas encore consommé.</span>
  </dt>
  <dd class="font-semibold tabular-nums">{euros(cardsDebtCents)}</dd>
</dl>

{#if !current}
  <div class="max-w-sm space-y-4">
    <p class="text-muted-foreground">La caisse est fermée : les bénévoles ne peuvent pas encaisser.</p>
    {#if canOpen}
      <FormField label="Catégorie comptable" id="categorie" hint="Tout ce que la session vendra y sera comptabilisé : buvette du tournoi d'hiver, du forum des associations…">
        <SearchableCombobox id="categorie" items={categoryItems} bind:value={categoryId} placeholder="Choisir une catégorie" />
      </FormField>
      <FormField label="Fond de caisse compté (€)" id="fond">
        <Input id="fond" inputmode="decimal" bind:value={amount} placeholder="50,00" />
      </FormField>
      <Button disabled={busy} onclick={open}>Ouvrir la caisse</Button>
    {/if}
  </div>
{:else}
  <div class="max-w-lg space-y-6">
    <dl class="space-y-2 rounded-lg border p-4">
      <div class="flex justify-between gap-4"><dt>Ouverte le</dt><dd>{current.session.businessDate}, par {current.session.openedByEmail}</dd></div>
      <div class="flex items-center justify-between gap-4">
        <dt>Catégorie comptable</dt>
        <dd class="flex items-center gap-2">
          {categoryName(current.session.accountingCategoryId)}
          {#if canOpen && !editingCategory}<Button variant="ghost" size="sm" onclick={() => (editingCategory = true)}>Changer</Button>{/if}
        </dd>
      </div>
      {#if editingCategory}
        <div class="flex items-end gap-2">
          <div class="grow"><SearchableCombobox id="categorie-session" items={categoryItems} bind:value={categoryId} placeholder="Choisir une catégorie" /></div>
          <Button size="sm" disabled={busy} onclick={saveCategory}>Enregistrer</Button>
        </div>
      {/if}
      <div class="flex justify-between gap-4"><dt>Fond de caisse</dt><dd class="tabular-nums">{euros(current.session.openingFloatCents)}</dd></div>
      <div class="flex justify-between gap-4 font-semibold"><dt>Espèces attendues</dt><dd class="tabular-nums">{euros(current.expectedCashCents)}</dd></div>
      <div class="flex justify-between gap-4"><dt>CB</dt><dd class="tabular-nums">{euros(current.cardCents)}</dd></div>
      <div class="flex justify-between gap-4"><dt>Payé par carte buvette</dt><dd class="tabular-nums">{euros(current.prepaidCents)}</dd></div>
      <div class="flex justify-between gap-4"><dt>Ventes</dt><dd class="tabular-nums">{current.salesCount}</dd></div>
    </dl>

    {#if current.toRefund.length}
      <p role="alert" class="bg-destructive/10 text-destructive rounded-md p-3 text-sm">
        À rembourser dans SumUp :
        {current.toRefund.map((r: any) => `${euros(r.amountCents)}${r.transactionCode ? ` (${r.transactionCode})` : ''}`).join(', ')}
      </p>
    {/if}

    {#if current.inProgress.length}
      <section class="space-y-2">
        <h2 class="font-semibold">Ventes qui attendent leur CB</h2>
        <p class="text-muted-foreground text-sm">La clôture est impossible tant qu'il en reste une.</p>
        <ul class="divide-y rounded-lg border">
          {#each current.inProgress as sale (sale.saleId)}
            <li class="flex items-center justify-between gap-3 p-3">
              <span class="tabular-nums">{euros(sale.cardCents)}</span>
              {#if canAbandon}
                <Button variant="outline" size="sm" disabled={busy} onclick={() => abandon(sale.saleId)}>Abandonner</Button>
              {/if}
            </li>
          {/each}
        </ul>
      </section>
    {/if}

    {#if canClose}
      <section class="max-w-sm space-y-3">
        <FormField label="Espèces comptées (€)" id="compte">
          <Input id="compte" inputmode="decimal" bind:value={amount} placeholder="0,00" />
        </FormField>
        <Button disabled={busy || current.inProgress.length > 0} onclick={close}>Clôturer et enregistrer en comptabilité</Button>
      </section>
    {/if}
  </div>
{/if}
