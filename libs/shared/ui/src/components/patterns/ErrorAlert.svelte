<script lang="ts">
  import type { Snippet } from "svelte";
  import { AlertCircle } from "@lucide/svelte";
  import * as Alert from "../ui/alert";

  let {
    message,
    title,
    children
  }: {
    message?: string | null;
    title?: string;
    children?: Snippet;
  } = $props();
</script>

<Alert.Root variant="destructive">
  <AlertCircle class="size-4" />
  {#if title}
    <Alert.Title>{title}</Alert.Title>
  {/if}
  <Alert.Description>
    {#if children}
      {@render children()}
    {:else}
      {message}
    {/if}
  </Alert.Description>
</Alert.Root>
