<script lang="ts">
  import { onDestroy, onMount } from 'svelte';
  import { Button } from '@nba/ui';

  interface Props {
    title: string;
    onScan: (value: string) => void;
    onCancel: () => void;
  }

  let { title, onScan, onCancel }: Props = $props();

  let video = $state<HTMLVideoElement>();
  let error = $state('');
  let stream: MediaStream | null = null;
  let frame = 0;
  let stopped = false;

  function stop() {
    stopped = true;
    cancelAnimationFrame(frame);
    stream?.getTracks().forEach((track) => track.stop());
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
    } catch {
      error = "La caméra n'est pas accessible : autorisez-la dans les réglages du navigateur.";
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
  <Button variant="outline" class="w-full" onclick={onCancel}>Annuler</Button>
</div>
