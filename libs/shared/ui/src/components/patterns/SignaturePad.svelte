<script lang="ts">
  import { Button } from '../ui/button';

  /**
   * Signature au doigt (ou à la souris), rendue en PNG base64.
   *
   * Le dernier recours d'un reçu signé des deux parties, quand le payeur n'a pas de
   * téléphone : il signe sur celui du receveur. Fond blanc et trait noir quel que soit le
   * thème, pour que l'image reste lisible une fois sortie de l'écran.
   */
  let {
    onSign,
    onCancel,
    disabled = false,
    label = 'Signez dans le cadre'
  }: {
    onSign: (pngDataUrl: string) => void;
    onCancel?: () => void;
    disabled?: boolean;
    label?: string;
  } = $props();

  let canvas = $state<HTMLCanvasElement>();
  let drawing = false;
  let empty = $state(true);

  function context() {
    const ctx = canvas!.getContext('2d')!;
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#111';
    return ctx;
  }

  function point(e: PointerEvent) {
    const r = canvas!.getBoundingClientRect();
    return { x: ((e.clientX - r.left) * canvas!.width) / r.width, y: ((e.clientY - r.top) * canvas!.height) / r.height };
  }

  function down(e: PointerEvent) {
    if (disabled) return;
    canvas!.setPointerCapture(e.pointerId);
    drawing = true;
    const p = point(e);
    const ctx = context();
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
  }

  function move(e: PointerEvent) {
    if (!drawing) return;
    const p = point(e);
    const ctx = context();
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
    empty = false;
  }

  function clear() {
    const ctx = canvas!.getContext('2d')!;
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, canvas!.width, canvas!.height);
    empty = true;
  }

  $effect(() => { if (canvas) clear(); });
</script>

<div class="space-y-2">
  <p class="text-sm text-muted-foreground">{label}</p>
  <canvas
    bind:this={canvas}
    width="600"
    height="240"
    class="w-full touch-none rounded-xl border border-border bg-white"
    onpointerdown={down}
    onpointermove={move}
    onpointerup={() => (drawing = false)}
    onpointercancel={() => (drawing = false)}
    aria-label={label}
  ></canvas>
  <div class="flex gap-2">
    <Button variant="outline" onclick={clear} disabled={disabled || empty}>Effacer</Button>
    {#if onCancel}<Button variant="ghost-muted" onclick={onCancel} {disabled}>Annuler</Button>{/if}
    <Button class="ml-auto" onclick={() => onSign(canvas!.toDataURL('image/png'))} disabled={disabled || empty}>Valider la signature</Button>
  </div>
</div>
