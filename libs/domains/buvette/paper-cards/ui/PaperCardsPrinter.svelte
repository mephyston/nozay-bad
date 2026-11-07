<script lang="ts">
  import qrcode from 'qrcode-generator';
  import { Button, FormField, Input, Select, readApiError, uiAlert } from '@nba/ui';
  import PaperCard from './PaperCard.svelte';

  /**
   * Génère un lot et le met en page pour l'impression. Les codes n'existent qu'ici : le serveur
   * n'en garde que l'empreinte, et quitter la page les perd. Le lot perdu n'a rien coûté, puisqu'une
   * carte n'a aucune valeur avant sa vente.
   */
  let { buvetteUrl = '', logoUrl = '' }: { buvetteUrl?: string; logoUrl?: string } = $props();

  interface Card {
    id: number;
    code: string;
    faceValueCents: number;
    qr: string;
  }

  let faceValue = $state('500');
  let box = $state('50');
  const faceValueCents = $derived(Number(faceValue));
  const boxCents = $derived(Number(box));
  let quantity = $state('20');
  let busy = $state(false);
  let cards = $state<Card[]>([]);

  // 2 colonnes et 5 rangées tiennent sur une page A4.
  const CARDS_PER_PAGE = 10;
  const pages = $derived(Array.from({ length: Math.ceil(cards.length / CARDS_PER_PAGE) }, (_, i) => cards.slice(i * CARDS_PER_PAGE, (i + 1) * CARDS_PER_PAGE)));

  /** Hors de la coque de l'admin, pour que l'impression ne garde que les cartes. */
  function outsideShell(node: HTMLElement) {
    document.body.appendChild(node);
    return { destroy: () => node.remove() };
  }

  function qrOf(code: string): string {
    // Correction maximale : le logo posé au centre masque des modules que la lecture reconstitue.
    const qr = qrcode(0, 'H');
    qr.addData(`${buvetteUrl}/carte/${code}`);
    qr.make();
    return qr.createDataURL(4, 1);
  }

  // Sans `submitForm`, qui recharge la page : les codes, affichés une seule fois, seraient perdus.
  async function generate() {
    const count = Number(quantity);
    if (!/^\d+$/.test(quantity) || count < 1 || count > 100) {
      await uiAlert('Indiquez un nombre de cartes entre 1 et 100.');
      return;
    }
    busy = true;
    try {
      const res = await fetch('/admin/api/buvette/paper-cards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'generate', faceValueCents, quantity: count })
      });
      if (!res.ok) throw new Error(await readApiError(res, "Le lot n'a pas pu être généré."));
      const { data } = (await res.json()) as { data: Omit<Card, 'qr'>[] };
      cards = data.map((card) => ({ ...card, qr: qrOf(card.code) }));
    } catch (e) {
      await uiAlert(e instanceof Error ? e.message : "Le lot n'a pas pu être généré.");
    } finally {
      busy = false;
    }
  }
</script>

<svelte:head>
  {#if cards.length}
    <!-- Sans marge, le navigateur n'a plus où imprimer sa date, son titre et son adresse. -->
    <style>@page { size: A4; margin: 0; }</style>
  {/if}
</svelte:head>

<div class="max-w-sm space-y-4 print:hidden">
  <FormField label="Valeur d'une carte" id="valeur">
    <Select id="valeur" bind:value={faceValue}>
      <option value="500">5 €</option>
      <option value="1000">10 €</option>
    </Select>
  </FormField>
  <FormField label="Cases à barrer" id="cases">
    <Select id="cases" bind:value={box}>
      <option value="50">0,50 €</option>
      <option value="100">1 €</option>
    </Select>
  </FormField>
  <FormField label="Nombre de cartes" id="nombre" hint="100 au maximum par lot.">
    <Input id="nombre" inputmode="numeric" bind:value={quantity} />
  </FormField>
  <Button disabled={busy} onclick={generate}>Générer le lot</Button>
</div>

{#if cards.length}
  <div class="mt-6 space-y-3 print:hidden">
    <p role="alert" class="bg-destructive/10 text-destructive rounded-md p-3 text-sm">
      Imprimez maintenant : ces {cards.length} codes ne s'afficheront plus. Ils n'ont aucune valeur avant leur vente à la caisse.
    </p>
    <Button onclick={() => window.print()}>Imprimer le lot</Button>
  </div>

  <div class="paper-page mt-6 print:hidden">
    {#each cards as card (card.id)}
      <PaperCard code={card.code} qr={card.qr} faceValueCents={card.faceValueCents} {boxCents} {logoUrl} />
    {/each}
  </div>

  <div class="paper-print" use:outsideShell>
    {#each pages as page, i (i)}
      <div class="paper-page">
        {#each page as card (card.id)}
          <PaperCard code={card.code} qr={card.qr} faceValueCents={card.faceValueCents} {boxCents} {logoUrl} />
        {/each}
      </div>
    {/each}
  </div>
{/if}

<style>
  /* Un papier reste blanc, quel que soit le thème de l'écran. */
  .paper-page {
    display: grid;
    grid-template-columns: repeat(auto-fill, 85mm);
    gap: 2mm;
    color: #000;
  }
  @media screen {
    .paper-print {
      display: none;
    }
  }
  @media print {
    /* `:has` limite la règle au moment où un lot attend d'être imprimé. */
    :global(body:has(> .paper-print) > :not(.paper-print)) {
      display: none !important;
    }
    :global(body:has(> .paper-print)) {
      margin: 0;
      background: #fff;
    }
    .paper-print .paper-page {
      grid-template-columns: 85mm 85mm;
      justify-content: center;
      padding-top: 8mm;
      break-after: page;
    }
    .paper-print .paper-page:last-child {
      break-after: auto;
    }
  }
</style>
