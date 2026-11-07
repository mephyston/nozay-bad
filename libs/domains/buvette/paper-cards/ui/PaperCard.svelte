<script lang="ts">
  import { boxesFor } from './paper-layout';

  /** Le gabarit d'une carte, au format d'une carte de crédit : 85 × 54 mm. */
  let { code, qr, faceValueCents, boxCents, logoUrl = '' }: {
    code: string;
    qr: string;
    faceValueCents: number;
    boxCents: number;
    logoUrl?: string;
  } = $props();

  const euros = (cents: number) => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(cents / 100);
</script>

<article class="paper-card">
  <strong class="paper-title">Carte buvette {euros(faceValueCents)}</strong>
  <div class="paper-body">
    <div class="paper-qr">
      <img src={qr} alt="QR code de la carte" />
      {#if logoUrl}<img class="paper-logo" src={logoUrl} alt="" />{/if}
    </div>
    <div class="paper-boxes">
      {#each { length: boxesFor(faceValueCents, boxCents) } as _, i (i)}
        <span class="paper-box">{(boxCents / 100).toLocaleString('fr-FR')}</span>
      {/each}
    </div>
  </div>
  <p class="paper-code">{code}</p>
  <p class="paper-note">Vaut de l'argent liquide : perdue, elle est perdue. Scannez-la pour la rattacher à votre compte.</p>
</article>

<style>
  /* Un papier reste blanc, quel que soit le thème de l'écran. */
  .paper-card {
    width: 85mm;
    height: 54mm;
    padding: 3mm;
    overflow: hidden;
    border: 0.3mm dashed #000;
    background: #fff;
    break-inside: avoid;
    font-size: 8pt;
    box-sizing: border-box;
  }
  .paper-title {
    font-size: 10pt;
  }
  .paper-body {
    display: flex;
    gap: 3mm;
    margin-top: 1.5mm;
  }
  .paper-qr {
    position: relative;
    flex: none;
    width: 30mm;
    height: 30mm;
  }
  .paper-qr img {
    width: 100%;
    height: 100%;
    image-rendering: pixelated;
  }
  /* Moins d'un quart de la largeur : très en deçà de ce que la correction maximale reconstitue. */
  .paper-qr .paper-logo {
    position: absolute;
    top: 38%;
    left: 38%;
    width: 24%;
    height: 24%;
    padding: 0.4mm;
    border-radius: 1mm;
    background: #fff;
    object-fit: contain;
    image-rendering: auto;
    box-sizing: border-box;
  }
  .paper-boxes {
    display: flex;
    flex-wrap: wrap;
    align-content: flex-start;
    gap: 0.8mm;
  }
  .paper-box {
    display: flex;
    width: 6.5mm;
    height: 6.5mm;
    align-items: center;
    justify-content: center;
    border: 0.3mm solid #000;
    font-size: 7pt;
  }
  .paper-code {
    margin-top: 1mm;
    font-family: monospace;
    font-size: 9pt;
  }
  .paper-note {
    margin-top: 0.5mm;
    font-size: 6.5pt;
    line-height: 1.2;
  }
</style>
