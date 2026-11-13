<script lang="ts">
  import qrcode from 'qrcode-generator';

  /**
   * Un QR code en image, généré dans le navigateur. Correction d'erreur élevée (`H`) : il
   * se lit encore sur un écran rayé ou dans un gymnase mal éclairé.
   */
  let { value, label, class: className = '' }: { value: string; label: string; class?: string } = $props();

  const src = $derived.by(() => {
    const qr = qrcode(0, 'H');
    qr.addData(value);
    qr.make();
    return qr.createDataURL(10, 2);
  });
</script>

<img {src} alt={label} class="aspect-square w-full max-w-72 rounded-xl bg-white p-2 [image-rendering:pixelated] {className}" />
