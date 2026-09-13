<script lang="ts">
  import { Label } from "../ui/label";
  import type { Snippet } from "svelte";

  let {
    label,
    id,
    error,
    hint,
    children
  }: {
    label: string;
    id: string;
    error?: string | null;
    /** Une aide courte sous le champ, en retrait ; l'erreur passe devant. */
    hint?: string | null;
    children: Snippet;
  } = $props();
</script>

<div class="space-y-1.5 w-full">
  <Label for={id} class={error ? "text-destructive" : ""}>{label}</Label>
  {@render children()}
  {#if error}
    <p class="text-[0.8rem] font-medium text-destructive">{error}</p>
  {:else if hint}
    <p class="text-xs text-muted-foreground">{hint}</p>
  {/if}
</div>
