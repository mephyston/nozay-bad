<script lang="ts">
  import { onDestroy, onMount } from 'svelte';
  import { Button, Input } from '@nba/ui';

  interface Props {
    title: string;
    onScan: (value: string) => void;
    onCancel: () => void;
  }

  let { title, onScan, onCancel }: Props = $props();

  let video = $state<HTMLVideoElement>();
  let error = $state('');
  let typedCode = $state('');
  let stream: MediaStream | null = null;
  let frame = 0;
  let stopped = false;

  function stop() {
    stopped = true;
    cancelAnimationFrame(frame);
    stream?.getTracks().forEach((track) => track.stop());
  }

  // « Autorisez-la » n'aide personne si le navigateur la coupe de lui-même : hors HTTPS, il ne
  // propose même pas la caméra, quels que soient les réglages du téléphone.
  function cameraError(e: unknown): string {
    if (!window.isSecureContext) return 'La caméra exige une adresse en HTTPS : le scan ne marche pas sur cette adresse locale.';
    if (e instanceof DOMException && e.name === 'NotAllowedError') return "La caméra est refusée : autorisez-la dans les réglages du navigateur.";
    if (e instanceof DOMException && e.name === 'NotFoundError') return "Aucune caméra n'a été trouvée sur cet appareil.";
    return "La caméra n'a pas pu démarrer : fermez les autres applications qui l'utilisent, puis réessayez.";
  }

  onMount(async () => {
    try {
      // jsQR à la demande : Safari n'a pas de BarcodeDetector, et seuls les scans en ont besoin.
      const { default: jsQR } = await import('jsqr');
      stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      if (stopped || !video) return stop();
      video.srcObject = stream;
      await video.play();
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d', { willReadFrequently: true })!;
      const tick = () => {
        if (stopped || !video) return;
        if (video.readyState === video.HAVE_ENOUGH_DATA) {
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          context.drawImage(video, 0, 0);
          const code = jsQR(context.getImageData(0, 0, canvas.width, canvas.height).data, canvas.width, canvas.height);
          if (code?.data) {
            stop();
            onScan(code.data);
            return;
          }
        }
        frame = requestAnimationFrame(tick);
      };
      tick();
    } catch (e) {
      error = cameraError(e);
    }
  });

  onDestroy(stop);
</script>

<div class="space-y-3">
  <h2 class="text-lg font-semibold">{title}</h2>
  {#if error}
    <p class="text-destructive">{error}</p>
  {:else}
    <!-- svelte-ignore a11y_media_has_caption -->
    <video bind:this={video} class="bg-muted aspect-square w-full rounded-lg object-cover" playsinline muted></video>
    <p class="text-muted-foreground text-sm">Visez le QR code affiché sur le téléphone du client.</p>
  {/if}
  <form class="flex gap-2" onsubmit={(event) => { event.preventDefault(); if (typedCode.trim()) { stop(); onScan(typedCode.trim()); } }}>
    <Input bind:value={typedCode} placeholder="Ou le code de la carte" autocapitalize="characters" autocomplete="off" aria-label="Code affiché sous le QR code, ou imprimé sur la carte papier" />
    <Button type="submit" variant="outline" disabled={!typedCode.trim()}>Valider</Button>
  </form>
  <Button variant="outline" class="w-full" onclick={onCancel}>Annuler</Button>
</div>
