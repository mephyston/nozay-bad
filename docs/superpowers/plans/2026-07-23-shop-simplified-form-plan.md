# Formulaire Simplifié de la Boutique Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refactor the shop component (`ShopCatalog.svelte`) to replace individual product cards with a single unified order form (Member selection -> Payment method -> Category filter -> Product dropdown -> Quantity -> Live total & Turnstile submission).

**Architecture:** A single-card form in Svelte 5 utilizing runes (`$state`, `$derived`, `$effect`) to dynamically filter products by category, update prices, compute totals, and submit orders via Astro endpoint `boutique.astro`.

**Tech Stack:** Svelte 5 (runes `$state`, `$derived`, `$effect`), Lucide icons, `@nba/ui` components (Button, Card, Input, Label, Badge), Turnstile anti-bot protection.

## Global Constraints

- Preserve all existing props: `products: Product[]`, `members: Member[]`, `activeSeasonId: string`.
- Preserve the exact API endpoint contract (`POST` request to `boutique.astro` with `seasonId`, `memberId`, `productId`, `quantity`, `paymentMethod`, `turnstileToken`).
- Category mapping: `all` ("Toutes les catégories"), `shuttlecock` ("Volants"), `string` ("Cordages"), `other` ("Autres").
- Form validation: `selectedMemberId !== '' && selectedProductId !== null && selectedProduct !== undefined && selectedProduct.stock >= selectedQuantity`.

---

### Task 1: Refactor `ShopCatalog.svelte` to single unified order form

**Files:**
- Modify: `libs/domains/shop/list-products/ui/ShopCatalog.svelte`

**Interfaces:**
- Consumes: `products`, `members`, `activeSeasonId` props.
- Produces: Unified Svelte 5 form component.

- [ ] **Step 1: Update component state & reactivity in `ShopCatalog.svelte`**

Replace multi-card states (`quantities`, `paymentMethods`, `submitting` records) with single form state runes:
```ts
let selectedCategory = $state<string>('all');
let selectedProductId = $state<number | null>(null);
let selectedQuantity = $state<number>(1);
let selectedPaymentMethod = $state<string>('virement');
let submitting = $state<boolean>(false);
let successMessage = $state<string | null>(null);
let errorMessage = $state<string | null>(null);

let filteredProducts = $derived(
  selectedCategory === 'all'
    ? productsList
    : productsList.filter(p => p.category === selectedCategory)
);

$effect(() => {
  if (filteredProducts.length > 0) {
    if (selectedProductId === null || !filteredProducts.some(p => p.id === selectedProductId)) {
      selectedProductId = filteredProducts[0].id;
    }
  } else {
    selectedProductId = null;
  }
});

let selectedProduct = $derived(
  selectedProductId !== null ? productsList.find(p => p.id === selectedProductId) || null : null
);

let totalPriceCents = $derived(
  selectedProduct ? selectedProduct.price * selectedQuantity : 0
);
```

- [ ] **Step 2: Update template in `ShopCatalog.svelte`**

Replace the product card loop with a single unified card containing:
1. Member selection combobox (preserved)
2. Payment method select dropdown (`virement`, `cheque`, `especes`, `labaz`, `ancv`, `pass_sport`, `ticket_loisir`, `up_loisir`)
3. Product category select dropdown (`all`, `shuttlecock`, `string`, `other`)
4. Product select dropdown (filtered by `filteredProducts`, displaying name, price, stock)
5. Quantity selector `[-] 1 [+]`
6. Order summary panel (Unit Price, Quantity, Calculated Total)
7. Turnstile widget and Submit Button ("Valider la commande")

- [ ] **Step 3: Update submit handler `handleOrder`**

```ts
async function handleOrder() {
  if (!selectedMemberId) {
    errorMessage = "Veuillez sélectionner un adhérent pour commander.";
    return;
  }
  if (!selectedProduct) {
    errorMessage = "Veuillez sélectionner un article.";
    return;
  }
  if (selectedProduct.stock < selectedQuantity) {
    errorMessage = "Stock insuffisant pour cette quantité.";
    return;
  }

  const isTest = typeof process !== 'undefined' && process.env?.NODE_ENV === 'test';
  const turnstileResponse = isTest
    ? 'mock-test-token'
    : (document.getElementsByName('cf-turnstile-response')[0] as HTMLInputElement)?.value;

  if (!turnstileResponse) {
    errorMessage = "Veuillez valider le test de sécurité anti-bot.";
    return;
  }

  errorMessage = null;
  successMessage = null;
  submitting = true;

  try {
    const res = await fetch('', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        seasonId: activeSeasonId,
        memberId: parseInt(selectedMemberId),
        productId: selectedProduct.id,
        quantity: selectedQuantity,
        paymentMethod: selectedPaymentMethod,
        turnstileToken: turnstileResponse
      })
    });

    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error || "Une erreur est survenue lors de l'enregistrement de la commande.");
    }

    successMessage = `Votre souhait d'achat de ${selectedQuantity} ${selectedProduct.name} a bien été enregistré. Il sera comptabilisé dès validation par le trésorier.`;
    selectedQuantity = 1;

    if (typeof window !== 'undefined' && (window as any).turnstile) {
      (window as any).turnstile.reset();
    }
  } catch (err: any) {
    errorMessage = err.message || "Une erreur est survenue.";
  } finally {
    submitting = false;
  }
}
```

- [ ] **Step 4: Verify component rendering**

Run: `npx vitest run libs/domains/shop/list-products/ui/ShopCatalog.test.ts`

- [ ] **Step 5: Commit**

```bash
git add libs/domains/shop/list-products/ui/ShopCatalog.svelte
git commit -m "feat(shop): simplify ShopCatalog UI into unified single order form"
```

---

### Task 2: Update ShopCatalog Component Unit Tests

**Files:**
- Modify: `libs/domains/shop/list-products/ui/ShopCatalog.test.ts`

- [ ] **Step 1: Update unit tests for unified form layout**

Update assertions in `ShopCatalog.test.ts` to test:
- Category select dropdown updates available products.
- Product select dropdown updates selected product & total price calculation.
- Form submission sends correct payload with selected member, product, payment method, and quantity.

- [ ] **Step 2: Run test suite**

Run: `npx vitest run libs/domains/shop/list-products/ui/ShopCatalog.test.ts`
Expected: All tests pass cleanly.

- [ ] **Step 3: Commit**

```bash
git add libs/domains/shop/list-products/ui/ShopCatalog.test.ts
git commit -m "test(shop): update ShopCatalog unit tests for simplified order form"
```
