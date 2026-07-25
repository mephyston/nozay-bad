<script lang="ts">
  import { Toaster as Sonner, type ToasterProps as SonnerProps } from "svelte-sonner";
  import { mode } from "mode-watcher";

  let { ...restProps }: SonnerProps = $props();
</script>

<Sonner
  theme={$mode}
  class="toaster group"
  toastOptions={{
    classes: {
      toast: "group toast group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lg font-sans",
      description: "group-[.toast]:text-muted-foreground",
      actionButton: "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground font-semibold",
      cancelButton: "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground font-medium",
      success: "group-[.toaster]:border-emerald-500/30 group-[.toaster]:bg-emerald-500/10 group-[.toaster]:text-emerald-600 dark:group-[.toaster]:text-emerald-400",
      error: "group-[.toaster]:border-destructive/30 group-[.toaster]:bg-destructive/10 group-[.toaster]:text-destructive"
    }
  }}
  {...restProps}
/>
