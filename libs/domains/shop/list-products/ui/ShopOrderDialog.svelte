<script lang="ts">
  import { ShoppingBag, Info, Package, Minus, Plus } from '@lucide/svelte';
  import { FormSheet, Button, SearchableCombobox, ChoiceField, FormField, Badge } from '@nba/ui';
  import type { Member, OrderConfirmation, PaymentMethodOption, Product } from './catalog-types';
  import { isOutOfStock, maxOrderableQuantity, productLabel } from './catalog-types';
  import type { ProductFamily } from './catalog-families';
  import { formatEuros } from './catalog-families';
  import { formatMemberName, transferReference } from './catalog-utils';
  import { submitOrder } from './catalog-order-action';

  /**
   * La commande d'une carte : déclinaison, quantité, mode de paiement, et c'est tout.
   *
   * La boîte s'ouvre sur une famille et se ferme sur une commande enregistrée — la
   * confirmation, elle, est une autre boîte, qui survit à celle-ci. Ce qui bloque le
   * bouton est dit sous lui, jamais deviné.
   */
  let {
    family = $bindable(null),
    member,
    members = [],
    memberId = $bindable(''),
    onClosed,
    activeSeasonId,
    paymentMethods = [],
    imageUrl,
    onOrdered
  }: {
    /** La famille à commander ; `null` ferme la boîte. */
    family: ProductFamily | null;
    member: Member | null;
    /** Le foyer de la session : c'est parmi eux, et eux seuls, qu'on peut commander. */
    members?: Member[];
    memberId: string;
    /** Appelé à la fermeture, pour rendre le choix au profil actif. */
    onClosed?: () => void;
    activeSeasonId: string;
    paymentMethods: PaymentMethodOption[];
    imageUrl: (key: string | null | undefined) => string | null;
    onOrdered: (confirmation: OrderConfirmation) => void;
  } = $props();

  let selectedId = $state<number | null>(null);
  let quantity = $state(1);
  let paymentMethod = $state('');
  let submitting = $state(false);
  let errorMessage = $state<string | null>(null);

  const open = $derived(family !== null);

  // À chaque ouverture : un seul choix se présélectionne, plusieurs laissent choisir.
  $effect(() => {
    if (!family) return;
    const available = family.choices.filter((c) => !isOutOfStock(c));
    selectedId = family.variants.length === 0 ? (available[0]?.id ?? null) : null;
    quantity = 1;
    errorMessage = null;
    if (!paymentMethods.some((pm) => pm.value === paymentMethod)) paymentMethod = paymentMethods[0]?.value ?? '';
  });

  const selected = $derived<Product | null>(family?.choices.find((c) => c.id === selectedId) ?? null);
  const maxQuantity = $derived(maxOrderableQuantity(selected));
  const totalCents = $derived(selected ? (selected.priceCents ?? (selected as any).price ?? 0) * quantity : 0);
  const method = $derived(paymentMethods.find((pm) => pm.value === paymentMethod) ?? null);

  $effect(() => {
    if (quantity > maxQuantity) quantity = Math.max(1, maxQuantity);
    if (quantity < 1) quantity = 1;
  });

  const blockingReason = $derived.by(() => {
    if (!memberId) return 'Aucun adhérent connecté.';
    if (!family) return null;
    if (!selected) return family.variants.length > 0 ? 'Choisissez une déclinaison.' : 'Article indisponible.';
    if (isOutOfStock(selected)) return `« ${productLabel(selected)} » est en rupture de stock.`;
    if (!paymentMethod) return 'Choisissez un mode de paiement.';
    return null;
  });

  function onOpenChange(next: boolean) {
    if (!next) {
      family = null;
      onClosed?.();
    }
  }

  async function order() {
    if (!family || !selected) return;
    errorMessage = null;
    submitting = true;
    // Le récapitulatif est figé avant l'appel : la boîte de confirmation le lira une
    // fois celle-ci fermée et remise à zéro.
    const confirmation: OrderConfirmation = {
      memberName: member ? formatMemberName(member) : '',
      productName: productLabel(selected),
      quantity,
      totalCents,
      paymentMethod,
      paymentMethodLabel: method?.label ?? paymentMethod,
      paymentMethodKind: method?.kind ?? null,
      transferReference: transferReference(productLabel(selected), member)
    };
    const res = await submitOrder({
      selectedMemberId: memberId,
      selectedProduct: selected,
      selectedQuantity: quantity,
      selectedPaymentMethod: paymentMethod,
      activeSeasonId
    });
    submitting = false;
    if (res.success) {
      family = null;
      onOrdered(confirmation);
    } else {
      errorMessage = res.error || null;
    }
  }
</script>

<!--
  La commande monte du bas, comme tous les formulaires de l'application.

  C'était une boîte ancrée au centre de l'écran, défilant sur 92 % de sa hauteur : sur
  un téléphone, le bouton « Valider » se trouvait sous le pli dès qu'une déclinaison
  ajoutait une ligne, et le clavier du champ de quantité le recouvrait.

  Les deux ronds en haut de la feuille : la croix à gauche, la validation à droite,
  comme partout ailleurs. Le pied nommé reste au-dessus de 768 px, où les ronds
  n'existent pas — c'est lui qui porte le bouton grisé tant qu'il manque quelque chose.

  Au doigt, le rond ne peut pas se griser : il ne dirait pas pourquoi. La soumission
  écrit donc ce qui bloque, à la place de ne rien faire.
-->
<FormSheet
  {open}
  {onOpenChange}
  title={family?.product.name ?? 'Commander'}
  description={family?.product.description || undefined}
  error={errorMessage}
  isSubmitting={submitting}
  submitLabel="Valider la commande"
  submittingLabel="Envoi de la commande…"
  onSubmit={(e) => {
    e.preventDefault();
    if (blockingReason) {
      errorMessage = blockingReason;
      return;
    }
    void order();
  }}
>
  {#if family}
    {@const src = imageUrl(family.product.imageKey)}
    <div data-testid="order-dialog" class="space-y-4">
      <div class="flex items-center gap-3">
        <div class="h-16 w-16 shrink-0 overflow-hidden rounded-lg border border-border bg-muted/40 flex items-center justify-center">
          {#if src}
            <img {src} alt="" class="h-full w-full object-contain p-1" />
          {:else}
            <Package class="h-6 w-6 text-muted-foreground/50" />
          {/if}
        </div>
        {#if member && members.length <= 1}
          <!-- Un seul adhérent au compte : il n'y a rien à choisir, on le rappelle. -->
          <div class="min-w-0 flex-1 rounded-xl border border-border bg-muted/30 px-3 py-2 text-xs">
            <span class="text-muted-foreground">Pour : </span>
            <span class="font-semibold text-foreground">{formatMemberName(member)}</span>
          </div>
        {/if}
      </div>

      {#if members.length > 1}
        <!--
          Le foyer en compte plusieurs : on choisit ici pour qui l'on commande.

          Il fallait auparavant basculer de profil depuis le menu du compte — donc
          quitter la boutique, y revenir et retrouver l'article. Le choix ne porte que
          sur le foyer de la session : le serveur refuse tout autre adhérent, et c'est
          lui qui fait autorité.
        -->
        <FormField id="order-member" label="Pour qui ?">
          <ChoiceField
            id="order-member"
            label="Pour qui ?"
            options={members.map((m) => ({ value: m.id.toString(), label: formatMemberName(m) }))}
            bind:value={memberId}
          />
        </FormField>
      {/if}

      {#if family.variants.length > 0}
        <fieldset>
          <!-- Même taille et même graisse que « Quantité » ou « Mode de paiement » :
               c'est un intitulé de champ comme les autres, et `FormField` les écrit ainsi. -->
          <legend class="mb-2 text-xs font-bold uppercase text-muted-foreground">Déclinaison</legend>
          <div class="flex flex-wrap gap-2" role="radiogroup">
            {#each family.variants as variant (variant.id)}
              {@const out = isOutOfStock(variant)}
              <button
                type="button"
                role="radio"
                aria-checked={selectedId === variant.id}
                disabled={out}
                onclick={() => (selectedId = variant.id)}
                data-testid="variant-choice"
                class="min-h-11 rounded-lg border px-3 py-1.5 text-sm font-medium transition
                  {selectedId === variant.id
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'border-border bg-background text-foreground hover:border-primary/50'}
                  disabled:cursor-not-allowed disabled:line-through disabled:opacity-50"
              >
                {variant.variantLabel}
                {#if family.priceMinCents !== family.priceMaxCents}
                  <span class="ml-1 text-xs opacity-80">{formatEuros(variant.priceCents ?? (variant as any).price ?? 0)}</span>
                {/if}
              </button>
            {/each}
          </div>
        </fieldset>
      {/if}

      {#if selected?.trackStock}
        <p class="text-xs text-muted-foreground">
          {#if selected.stock <= 0}
            <Badge variant="destructive" size="xs">Rupture de stock</Badge>
          {:else}
            Stock disponible : <strong class="text-foreground">{selected.stock}</strong>
          {/if}
        </p>
      {/if}

      <!--
        Quantité et paiement l'un sous l'autre : côte à côte, la liste des moyens de
        paiement se réduisait à une demi-largeur de téléphone et tronquait « Virement
        bancaire » au premier mot.
      -->
      <FormField id="order-quantity" label="Quantité">
        <div class="flex w-fit items-center overflow-hidden rounded-xl border border-border bg-background">
          <Button type="button" variant="ghost" onclick={() => (quantity -= 1)} disabled={!selected || quantity <= 1} class="h-11 rounded-none border-0 px-4" aria-label="Moins">
            <Minus class="h-4 w-4" />
          </Button>
          <input
            id="order-quantity"
            type="number"
            min="1"
            max={maxQuantity}
            bind:value={quantity}
            disabled={!selected}
            class="h-11 w-12 border-0 bg-transparent p-0 text-center text-sm font-semibold focus-visible:outline-none"
          />
          <Button type="button" variant="ghost" onclick={() => (quantity += 1)} disabled={!selected || quantity >= maxQuantity} class="h-11 rounded-none border-0 px-4" aria-label="Plus">
            <Plus class="h-4 w-4" />
          </Button>
        </div>
      </FormField>

      <FormField id="order-payment" label="Mode de paiement">
        <SearchableCombobox
          id="order-payment"
          items={paymentMethods.map((pm) => ({ label: pm.label, value: pm.value }))}
          placeholder="Sélectionner..."
          bind:value={paymentMethod}
        />
      </FormField>

      <div class="flex items-center justify-between rounded-xl border border-border bg-muted/30 px-4 py-3">
        <span class="text-sm text-muted-foreground">Total</span>
        <span class="font-outfit text-lg font-bold tabular-nums text-foreground" data-testid="order-total">{formatEuros(totalCents)}</span>
      </div>

      {#if blockingReason && !submitting}
        <!-- Ce qui bloque est dit sous le formulaire, jamais deviné. -->
        <p class="flex items-start gap-1.5 text-xs text-muted-foreground">
          <Info class="mt-px h-3.5 w-3.5 shrink-0" />
          <span>{blockingReason}</span>
        </p>
      {/if}
    </div>
  {/if}

  {#snippet footer(formId)}
    <Button
      type="submit"
      form={formId}
      disabled={blockingReason !== null || submitting}
      class="h-11 w-full gap-2 rounded-xl text-sm font-bold shadow-md"
      data-testid="order-submit"
    >
      {#if submitting}
        <span class="animate-pulse">Envoi de la commande...</span>
      {:else}
        <ShoppingBag class="h-4 w-4" />
        Valider la commande
      {/if}
    </Button>
  {/snippet}
</FormSheet>
