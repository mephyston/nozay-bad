<script lang="ts">
  import { Label } from "../ui/label";
  import type { Snippet } from "svelte";

  let {
    label,
    id,
    error,
    children
  }: {
    label: string;
    id: string;
    error?: string | null;
    children: Snippet;
  } = $props();
</script>

<div class="space-y-1.5 w-full">
  <Label for={id} class={error ? "text-destructive" : ""}>{label}</Label>
  {@render children()}
  {#if error}
    <p class="text-[0.8rem] font-medium text-destructive">{error}</p>
  {/if}
</div>
